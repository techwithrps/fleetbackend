const User = require("../models/UserModel");
const { pool } = require("../config/dbconfig");

const getAllUsers = async (req, res) => {
  try {
    await pool.connect();
    const result = await pool
      .request()
      .query("SELECT id, name, email, phone, role FROM users");

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
