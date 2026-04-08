const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool, sql } = require("../config/dbconfig");

exports.signup = async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  try {
    // Input validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    // Check if user exists
    const userCheck = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query("SELECT email FROM users WHERE email = @email");

    if (userCheck.recordset.length > 0) {
      return res.status(409).json({
        message: "User already exists with this email",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const result = await pool
      .request()
      .input("name", sql.VarChar, name)
      .input("email", sql.VarChar, email)
      .input("phone", sql.VarChar, phone || null)
      .input("password", sql.VarChar, hashedPassword)
      .input("role", sql.VarChar, role).query(`
        INSERT INTO users (name, email, phone, password, role)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role
        VALUES (@name, @email, @phone, @password, @role)
      `);

    const user = result.recordset[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Server error during registration",
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

    // Find user
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query("SELECT * FROM users WHERE email = @email");

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

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
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
