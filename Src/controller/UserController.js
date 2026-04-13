const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool, sql } = require("../config/dbconfig");

const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();
  const map = {
    admin: "Admin",
    customer: "Customer",
    accounts: "Accounts",
    "reports & mis": "Reports & MIS",
    driver: "Driver",
  };
  return map[value] || role;
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

const hasUserUpdatedAt = async () => {
  try {
    const result = await pool.request().query(`
      SELECT CASE
        WHEN COL_LENGTH('dbo.users', 'updated_at') IS NULL THEN 0
        ELSE 1
      END AS has_updated_at
    `);
    return !!result.recordset[0]?.has_updated_at;
  } catch {
    // If schema introspection fails, avoid referencing updated_at.
    return false;
  }
};

exports.getAllusers = async (req, res) => {
  try {
    const useSoftDelete = await hasUserSoftDelete();
    const result = await pool.request().query(useSoftDelete ? `
      SELECT id, name, email, phone, role, created_at 
      FROM users
      WHERE is_active = 1
    ` : `
      SELECT id, name, email, phone, role, created_at 
      FROM users
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: result.recordset,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const useSoftDelete = await hasUserSoftDelete();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(useSoftDelete ? `
        SELECT id, name, email, phone, role, created_at
        FROM users
        WHERE id = @id AND is_active = 1
      ` : `
        SELECT id, name, email, phone, role, created_at
        FROM users
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const useSoftDelete = await hasUserSoftDelete();

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    const existing = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query(
        useSoftDelete
          ? "SELECT id FROM users WHERE email = @email AND is_active = 1"
          : "SELECT id FROM users WHERE email = @email"
      );

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const normalizedRole = normalizeRole(role);
    const passwordHash = await bcrypt.hash(password, 10);

    const created = await pool
      .request()
      .input("name", sql.VarChar, name)
      .input("email", sql.VarChar, email)
      .input("phone", sql.VarChar, phone || null)
      .input("password", sql.VarChar, passwordHash)
      .input("role", sql.VarChar, normalizedRole)
      .query(`
        INSERT INTO users (name, email, phone, password, role)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.phone, INSERTED.role, INSERTED.created_at
        VALUES (@name, @email, @phone, @password, @role)
      `);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: created.recordset[0],
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, password } = req.body;
    const useSoftDelete = await hasUserSoftDelete();
    const hasUpdatedAt = await hasUserUpdatedAt();

    // First check if user exists and get current values
    const checkResult = await pool.request()
      .input("id", sql.Int, id)
      .query(
        useSoftDelete
          ? "SELECT * FROM users WHERE id = @id AND is_active = 1"
          : "SELECT * FROM users WHERE id = @id"
      );

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUser = checkResult.recordset[0];
    
    // Hash new password if provided
    let passwordHash = currentUser.password;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const nextRole = role ? normalizeRole(role) : currentUser.role;

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("name", sql.VarChar, name || currentUser.name)
      .input("phone", sql.VarChar, phone || currentUser.phone)
      .input("role", sql.VarChar, nextRole)
      .input("password", sql.VarChar, passwordHash)
      .query(useSoftDelete ? `
        UPDATE users 
        SET name = @name, phone = @phone, role = @role, password = @password${hasUpdatedAt ? ", updated_at = GETDATE()" : ""}
        WHERE id = @id AND is_active = 1
      ` : `
        UPDATE users 
        SET name = @name, phone = @phone, role = @role, password = @password${hasUpdatedAt ? ", updated_at = GETDATE()" : ""}
        WHERE id = @id
      `);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const useSoftDelete = await hasUserSoftDelete();
    const hasUpdatedAt = await hasUserUpdatedAt();

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const normalizedRole = normalizeRole(role);
    const result = await pool.request()
      .input("role", sql.VarChar, normalizedRole)
      .input("id", sql.Int, id)
      .query(useSoftDelete ? `
        UPDATE users 
        SET role = @role${hasUpdatedAt ? ", updated_at = GETDATE()" : ""}
        WHERE id = @id AND is_active = 1
      ` : `
        UPDATE users 
        SET role = @role${hasUpdatedAt ? ", updated_at = GETDATE()" : ""}
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const useSoftDelete = await hasUserSoftDelete();
    const hasUpdatedAt = await hasUserUpdatedAt();

    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(useSoftDelete ? `
        UPDATE users
        SET is_active = 0, deleted_at = GETDATE()${hasUpdatedAt ? ", updated_at = GETDATE()" : ""}
        WHERE id = @id AND is_active = 1
      ` : `
        DELETE FROM users WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: useSoftDelete ? "User deactivated successfully" : "User deleted successfully",
    });
  } catch (error) {
    console.error("Database error:", error);
    if (error?.number === 547) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete user: linked records exist. Run the soft-delete migration or reassign related data first.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
