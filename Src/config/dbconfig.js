const sql = require("mssql");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env"), override: true });

const clean = (value) => (typeof value === "string" ? value.trim() : value);
const server =
  clean(process.env.SERVER) ||
  clean(process.env.DB_HOST) ||
  clean(process.env.SERVER1);
const port = Number(clean(process.env.DB_PORT)) || 1433;

const config = {
  user: clean(process.env.DB_USER),
  password: clean(process.env.DB_PASSWORD),
  server,
  port,
  database: clean(process.env.DB_NAME),
  options: {
    encrypt: false,
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
    console.log(
      "✅ Connected to SQL Server -",
      clean(process.env.DB_NAME),
      `(${server}:${port})`
    );

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
      server,
      port,
      database: clean(process.env.DB_NAME),
    });
    process.exit(1); // Exit if database connection fails
  }
};

module.exports = {
  pool,
  sql,
  connectDB,
};
