const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool, sql } = require("../config/dbconfig");

const getUserAccessContext = async (userId) => {
  try {
    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          CAST(u.LOCATION_ID AS NUMERIC(18,0)) as location_id, 
          u.PAGE_ID, 
          p.PAGE_NAME,
          ISNULL(u.CAN_VIEW, 0) as can_view,
          ISNULL(u.CAN_CREATE, 0) as can_create,
          ISNULL(u.CAN_EDIT, 0) as can_edit
        FROM dbo.USER_PAGE_ACCESS_MAPPING u
        JOIN dbo.PAGE_MASTER p ON u.PAGE_ID = p.PAGE_ID
        WHERE u.USER_ID = @user_id
      `);
    
    // Extract unique terminal/location IDs
    const terminalIds = [...new Set(result.recordset.map(r => Number(r.location_id)))];
    
    // Only include pages in pageNames/pageIds if CAN_VIEW is 1 at least in one location
    const viewedPages = result.recordset.filter(r => r.can_view);
    const pageIds = [...new Set(viewedPages.map(r => Number(r.PAGE_ID)))];
    const pageNames = [...new Set(viewedPages.map(r => r.PAGE_NAME))];
    
    // Create a permissions map: { "Page Name": { can_view: 1, can_create: 1, can_edit: 1 } }
    // Note: If a page is assigned to multiple locations, we union the permissions (OR logic)
    const permissions = {};
    result.recordset.forEach(r => {
      const name = r.PAGE_NAME;
      if (!permissions[name]) {
        permissions[name] = { can_view: 0, can_create: 0, can_edit: 0 };
      }
      permissions[name].can_view = permissions[name].can_view || r.can_view;
      permissions[name].can_create = permissions[name].can_create || r.can_create;
      permissions[name].can_edit = permissions[name].can_edit || r.can_edit;
    });
    
    return { terminalIds, pageIds, pageNames, permissions };
  } catch (error) {
    console.error("Error fetching user access context:", error);
    return { terminalIds: [], pageIds: [] };
  }
};
const hasUserSoftDelete = async () => {
  const result = await pool.request().query(`
    SELECT CASE
      WHEN COL_LENGTH('dbo.users', 'is_active') IS NULL THEN 0
      ELSE 1
    END AS has_soft_delete
  `);
  return !!result.recordset[0]?.has_soft_delete;
};

exports.signup = async (req, res) => {
  return res.status(403).json({
    message: "Public signup is disabled. Please contact your administrator.",
  });
};

exports.validate = async (req, res) => {
  try {
    const useSoftDelete = await hasUserSoftDelete();
    const result = await pool
      .request()
      .input("id", sql.Int, req.user.id)
      .query(useSoftDelete ? `
        SELECT id, name, email, role
        FROM users
        WHERE id = @id AND is_active = 1
      ` : `
        SELECT id, name, email, role
        FROM users
        WHERE id = @id
      `);

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account is inactive or not found",
      });
    }

    const accessContext = await getUserAccessContext(user.id);

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        terminalIds: accessContext.terminalIds || [],
        pageIds: accessContext.pageIds || [],
        pageNames: accessContext.pageNames || [],
        permissions: accessContext.permissions || {},
      },
    });
  } catch (error) {
    console.error("Validate session error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during validation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    const useSoftDelete = await hasUserSoftDelete();

    // Find user
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query(
        useSoftDelete
          ? "SELECT * FROM users WHERE email = @email AND is_active = 1"
          : "SELECT * FROM users WHERE email = @email"
      );

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const accessContext = await getUserAccessContext(user.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        terminalId: req.body.location || null, // The specific location selected at login
        terminalIds: accessContext.terminalIds || [],
        pageIds: accessContext.pageIds || [],
        permissions: accessContext.permissions || {},
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        terminalIds: accessContext.terminalIds || [],
        pageIds: accessContext.pageIds || [],
        pageNames: accessContext.pageNames || [],
        permissions: accessContext.permissions || {},
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getUserLocations = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const useSoftDelete = await hasUserSoftDelete();
    const result = await pool.request()
      .input("email", sql.VarChar, email)
      .query(useSoftDelete 
        ? "SELECT id, password, role FROM users WHERE email = @email AND is_active = 1" 
        : "SELECT id, password, role FROM users WHERE email = @email"
      );

    const user = result.recordset[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.role?.toLowerCase() === 'admin') {
      // For Admin, fetch all locations
      const locResult = await pool.request().query("SELECT CAST(LOCATION_ID AS NUMERIC(18,0)) as id, LOCATION_NAME as name FROM dbo.LOCATION_MASTER WHERE LOCATION_ID IS NOT NULL");
      return res.json({ success: true, isAdmin: true, locations: [{ id: 'ALL', name: 'ALL LOCATIONS' }, ...locResult.recordset] });
    }

    // For others, fetch mapped locations
    const locResult = await pool.request()
      .input("user_id", sql.Int, user.id)
      .query(`
        SELECT DISTINCT CAST(lm.LOCATION_ID AS NUMERIC(18,0)) as id, lm.LOCATION_NAME as name
        FROM dbo.USER_PAGE_ACCESS_MAPPING upam
        JOIN dbo.LOCATION_MASTER lm ON upam.LOCATION_ID = lm.LOCATION_ID
        WHERE upam.USER_ID = @user_id
      `);

    return res.json({ success: true, isAdmin: false, locations: locResult.recordset });
  } catch (error) {
    console.error("Get user locations error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
