const User = require("../models/UserModel");
const { pool } = require("../config/dbconfig");

const getAllUsers = async (req, res) => {
  try {
    await pool.connect();
    const result = await pool
      .request()
      .query(`
        SELECT u.id, u.name, u.email, u.phone, r.role_name as role 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id
      `);

    const users = result.recordset;
    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
};

module.exports = { getAllUsers };
