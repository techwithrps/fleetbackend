const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { pool, sql } = require("../config/dbconfig");
const { saveOtp, getOtp, deleteOtp } = require("../models/otpmodels");
const transporter = require("../config/Mailer");

// Step 1: Validate password → send OTP
exports.sendOtpAfterPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  // Lookup user
  const result = await pool
    .request()
    .input("email", sql.VarChar, email)
    .query("SELECT * FROM users WHERE email = @email");

  const user = result.recordset[0];
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  // Check password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  saveOtp(email, otp, expiresAt);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// Step 2: Verify OTP → generate JWT
exports.verifyOtpAndLogin = async (req, res) => {
  const { email, otp } = req.body;

  console.log("Received OTP verification request:", {
    email,
    otpLength: otp?.length,
  });

  // Validate input
  if (!email || !otp) {
    console.log("Missing email or OTP");
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const data = getOtp(email);
  console.log(
    "OTP data from store:",
    data ? { hasData: true, expiresAt: new Date(data.expiresAt) } : null
  );

  if (!data) {
    console.log("OTP not found for email:", email);
    return res
      .status(400)
      .json({ message: "OTP not found or expired. Please request a new OTP" });
  }

  if (Date.now() > data.expiresAt) {
    console.log("OTP expired for email:", email);
    deleteOtp(email);
    return res
      .status(400)
      .json({ message: "OTP expired. Please request a new OTP" });
  }

  // Ensure both OTPs are strings and trimmed for comparison
  const receivedOtp = String(otp).trim();
  const storedOtp = String(data.otp).trim();

  console.log("OTP comparison:", {
    receivedLength: receivedOtp.length,
    storedLength: storedOtp.length,
    match: receivedOtp === storedOtp,
  });

  if (receivedOtp !== storedOtp) {
    console.log("Invalid OTP provided");
    return res.status(400).json({ message: "Invalid OTP. Please try again" });
  }

  // OTP is valid → issue JWT
  console.log("OTP verified successfully, deleting from store");
  deleteOtp(email);

  try {
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query("SELECT id, name, email, role FROM users WHERE email = @email");

    if (result.recordset.length === 0) {
      console.log("User not found after OTP verification");
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.recordset[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    console.log("Login successful, sending response");
    res.json({
      message: "Login successful",
      token,
      user,
    });
  } catch (err) {
    console.error("Database error during OTP verification:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};
