const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool, sql } = require("../config/dbconfig");
const { getUserIamContext } = require("../services/iamService");

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

    const iamContext = await getUserIamContext(user.id);

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        tenantId: iamContext?.tenantId || null,
        terminalIds: iamContext?.terminalIds || [],
        permissions: iamContext?.permissions || [],
        iamRoles: iamContext?.roles || [],
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

    const iamContext = await getUserIamContext(user.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: iamContext?.tenantId || user.tenant_id || null,
        terminalIds: iamContext?.terminalIds || [],
        permissions: iamContext?.permissions || [],
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
        tenantId: iamContext?.tenantId || user.tenant_id || null,
        terminalIds: iamContext?.terminalIds || [],
        permissions: iamContext?.permissions || [],
        iamRoles: iamContext?.roles || [],
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
