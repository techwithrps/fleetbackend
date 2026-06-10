const sql = require("mssql");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env"), override: true });

const clean = (value) => (typeof value === "string" ? value.trim() : value);

// Prefer SERVER1 (Azure SQL) if SERVER is not set or looks like a local IP
const serverEnv  = clean(process.env.SERVER)  || "";
const server1Env = clean(process.env.SERVER1) || "";
const dbHostEnv  = clean(process.env.DB_HOST)  || "";

// In production prefer Azure SQL (SERVER1); locally prefer SERVER
const server =
  (process.env.NODE_ENV === "production" && server1Env) ||
  serverEnv ||
  dbHostEnv ||
  server1Env;

const port = Number(clean(process.env.DB_PORT)) || 1433;

// Azure SQL requires encryption; local SQL Server usually doesn't
const isAzure = server.includes(".database.windows.net");

const config = {
  user: clean(process.env.DB_USER),
  password: clean(process.env.DB_PASSWORD),
  server,
  port,
  database: clean(process.env.DB_NAME),
  options: {
    encrypt: isAzure ? true : false,
    trustServerCertificate: !isAzure,
    enableArithAbort: true,
  },
  pool: {
    max: 20,        // More concurrent connections
    min: 2,         // Keep 2 warm connections always alive
    idleTimeoutMillis: 60000,
    acquireTimeoutMillis: 15000,
  },
  connectionTimeout: 20000,
  requestTimeout: 30000,
};

// Create connection pool
const pool = new sql.ConnectionPool(config);

// Global error handler for database connection
pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

const connectDB = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
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
      return; // success — stop retrying
    } catch (err) {
      console.error(`❌ DB connection attempt ${attempt}/${retries} failed:`, {
        message: err.message,
        code: err.code,
        server,
        port,
        database: clean(process.env.DB_NAME),
      });
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error("💀 All DB connection attempts failed. Exiting.");
        process.exit(1); // Exit if database connection fails
      }
    }
  }
};

module.exports = {
  pool,
  sql,
  connectDB,
};
