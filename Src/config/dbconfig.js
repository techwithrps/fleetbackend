const sql = require("mssql");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.SERVER,

  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Create connection pool
const pool = new sql.ConnectionPool(config);

// Global error handler for database connection
pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

const connectDB = async () => {
  try {
    await pool.connect();
    console.log("✅ Connected to SQL Server -", process.env.DB_NAME);

    // Verify database connection with test query
    const result = await pool.request().query("SELECT 1");
    if (result) {
      console.log("Database query test successful");
    }
  } catch (err) {
    console.error("❌ Database connection error:", {
      message: err.message,
      code: err.code,
      state: err.state,
    });
    process.exit(1); // Exit if database connection fails
  }
};

module.exports = {
  pool,
  sql,
  connectDB,
};
