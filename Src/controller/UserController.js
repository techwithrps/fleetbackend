const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool, sql } = require("../config/dbconfig");

exports.getAllusers = async (req, res) => {
  try {
    const result = await pool.request().query(`
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
