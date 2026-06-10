const { pool, sql } = require("../config/dbconfig");

const hasUserSoftDelete = async () => {
  const result = await pool.request().query(`
    SELECT CASE
      WHEN COL_LENGTH('dbo.users', 'is_active') IS NULL THEN 0
      ELSE 1
    END AS has_soft_delete
  `);
  return !!result.recordset[0]?.has_soft_delete;
};

const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const useSoftDelete = await hasUserSoftDelete();
    const dbUser = await pool
      .request()
      .input("id", sql.Int, req.user.id)
      .query(useSoftDelete ? `
        SELECT r.role_name AS role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = @id AND u.is_active = 1
      ` : `
        SELECT r.role_name AS role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = @id
      `);

    const role = String(
      dbUser.recordset?.[0]?.role || req.user.role || ""
    ).toLowerCase();
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = adminAuth;
