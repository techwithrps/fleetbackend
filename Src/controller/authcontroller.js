const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool, sql } = require("../config/dbconfig");

const fetchLocationsForUser = async ({ userId, defaultTerminalId, customerId }) => {
  const result = await pool
    .request()
    .input("user_id", sql.Int, userId)
    .input("default_terminal_id", sql.Numeric(18, 0), defaultTerminalId ?? null)
    .input("customer_id", sql.Int, customerId ?? null)
    .query(`
      SELECT DISTINCT id, name
      FROM (
        SELECT
          CAST(lm.LOCATION_ID AS NUMERIC(18,0)) AS id,
          lm.LOCATION_NAME AS name
        FROM dbo.user_locations ul
        JOIN dbo.LOCATION_MASTER lm ON ul.terminal_id = lm.LOCATION_ID
        WHERE ul.user_id = @user_id

        UNION

        SELECT
          CAST(LOCATION_ID AS NUMERIC(18,0)) AS id,
          LOCATION_NAME AS name
        FROM dbo.LOCATION_MASTER
        WHERE LOCATION_ID IS NOT NULL
          AND @default_terminal_id IS NOT NULL
          AND (TERMINAL_ID = @default_terminal_id OR LOCATION_ID = @default_terminal_id)

        UNION

        SELECT
          CAST(LOCATION_ID AS NUMERIC(18,0)) AS id,
          LOCATION_NAME AS name
        FROM dbo.LOCATION_MASTER
        WHERE LOCATION_ID IS NOT NULL
          AND @default_terminal_id IS NULL
          AND @customer_id IS NOT NULL
          AND CUSTOMER_ID = @customer_id
      ) src
      ORDER BY name
    `);

  return result.recordset;
};

const getUserAccessContext = async (userId, role) => {
  try {
    if (role && role.toLowerCase() === 'admin') {
      const locResult = await pool.request().query("SELECT CAST(LOCATION_ID AS NUMERIC(18,0)) as id FROM dbo.LOCATION_MASTER WHERE LOCATION_ID IS NOT NULL");
      const pageResult = await pool.request().query("SELECT PAGE_ID, PAGE_NAME FROM dbo.PAGE_MASTER");
      
      const terminalIds = locResult.recordset.map(r => Number(r.id));
      const pageIds = pageResult.recordset.map(r => Number(r.PAGE_ID));
      const pageNames = pageResult.recordset.map(r => r.PAGE_NAME);
      const permissions = {};
      
      pageResult.recordset.forEach(r => {
        permissions[r.PAGE_NAME] = { can_view: 1, can_create: 1, can_edit: 1, can_delete: 1 };
      });
      
      return { terminalIds, pageIds, pageNames, permissions };
    }

    const userMeta = await pool
      .request()
      .input("user_id", sql.Int, userId)
      .query(`SELECT default_terminal_id, customer_id FROM dbo.users WHERE id = @user_id`);

    const defaultTerminalId = userMeta.recordset[0]?.default_terminal_id ?? null;
    const customerId = userMeta.recordset[0]?.customer_id ?? null;

    const accessibleLocations = await fetchLocationsForUser({
      userId,
      defaultTerminalId,
      customerId,
    });

    const terminalIds = accessibleLocations
      .map((r) => Number(r.id))
      .filter((x) => Number.isFinite(x));

    const result = await pool
      .request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT
          up.page_id AS PAGE_ID,
          p.PAGE_NAME,
          ISNULL(up.can_view, 0) AS can_view,
          ISNULL(up.can_create, 0) AS can_create,
          ISNULL(up.can_edit, 0) AS can_edit,
          ISNULL(up.can_delete, 0) AS can_delete
        FROM dbo.USER_PERMISSIONS up
        JOIN dbo.PAGE_MASTER p ON up.page_id = p.PAGE_ID
        WHERE up.user_id = @user_id
      `);

    const viewedPages = result.recordset.filter((r) => r.can_view);
    const pageIds = [...new Set(viewedPages.map((r) => Number(r.PAGE_ID)))];
    const pageNames = [...new Set(viewedPages.map((r) => r.PAGE_NAME))];

    const permissions = {};
    result.recordset.forEach((r) => {
      const name = r.PAGE_NAME;
      if (!permissions[name]) {
        permissions[name] = { can_view: 0, can_create: 0, can_edit: 0, can_delete: 0 };
      }
      permissions[name].can_view = permissions[name].can_view || r.can_view;
      permissions[name].can_create = permissions[name].can_create || r.can_create;
      permissions[name].can_edit = permissions[name].can_edit || r.can_edit;
      permissions[name].can_delete = permissions[name].can_delete || r.can_delete;
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
    const query = useSoftDelete ? `
        SELECT u.id, u.name, u.email, r.role_name as role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = @id AND u.is_active = 1
      ` : `
        SELECT u.id, u.name, u.email, r.role_name as role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = @id
      `;
    const result = await pool
      .request()
      .input("id", sql.Int, req.user.id)
      .query(query);

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account is inactive or not found",
      });
    }

    const accessContext = await getUserAccessContext(user.id, user.role);

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        terminalId: req.user.terminalId || null,
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
    const loginQuery = useSoftDelete
      ? "SELECT u.*, r.role_name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = @email AND u.is_active = 1"
      : "SELECT u.*, r.role_name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = @email";

    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query(loginQuery);

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

    const accessContext = await getUserAccessContext(user.id, user.role);

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
        terminalId: req.body.location || null,
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
    const locQuery = useSoftDelete 
      ? "SELECT u.id, u.password, u.default_terminal_id, u.customer_id, r.role_name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = @email AND u.is_active = 1" 
      : "SELECT u.id, u.password, u.default_terminal_id, u.customer_id, r.role_name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = @email";

    const result = await pool.request()
      .input("email", sql.VarChar, email)
      .query(locQuery);

    const user = result.recordset[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.role?.toLowerCase() === 'admin') {
      // For Admin, fetch all locations
      const locResult = await pool.request().query("SELECT CAST(LOCATION_ID AS NUMERIC(18,0)) as id, LOCATION_NAME as name FROM dbo.LOCATION_MASTER WHERE LOCATION_ID IS NOT NULL");
      return res.json({ success: true, isAdmin: true, locations: [{ id: 'ALL', name: 'ALL LOCATIONS' }, ...locResult.recordset] });
    }

    const locResult = await fetchLocationsForUser({
      userId: user.id,
      defaultTerminalId: user.default_terminal_id,
      customerId: user.customer_id,
    });

    return res.json({ success: true, isAdmin: false, locations: locResult });
  } catch (error) {
    console.error("Get user locations error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.switchLocation = async (req, res) => {
  const { locationId } = req.body;
  const user = req.user;

  try {
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate access: Admin can pick any, others only assigned
    let hasAccess = false;
    if (user.role?.toLowerCase() === 'admin') {
      hasAccess = true;
    } else {
      const allowed = Array.isArray(user.terminalIds) ? user.terminalIds : [];
      hasAccess = allowed.map(Number).includes(Number(locationId));
    }

    if (!hasAccess && locationId !== null) {
      return res.status(403).json({ message: "Access denied to this location" });
    }

    // Generate NEW token with updated terminalId
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        terminalId: locationId || null,
        terminalIds: user.terminalIds || [],
        pageIds: user.pageIds || [],
        permissions: user.permissions || {},
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.json({
      success: true,
      token: newToken,
      terminalId: locationId || null
    });
  } catch (error) {
    console.error("Switch location error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
