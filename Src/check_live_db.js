const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env"), override: true });

const { pool } = require("./config/dbconfig");

const SYSTEM_TABLES = new Set(["COLUMNS", "STRING_SPLIT"]);
const IGNORED_REFERENCES = new Set(["DUPLICATERECEIPTS", "IT"]);

const CRITICAL_TABLES = [
  "users",
  "roles",
  "LOCATION_MASTER",
  "PAGE_MASTER",
  "USER_PERMISSIONS",
  "permissions",
  "role_permissions",
];

const CRITICAL_COLUMNS = {
  users: ["id", "email", "password", "name", "role_id"],
  roles: ["id", "role_name"],
  LOCATION_MASTER: ["LOCATION_ID", "LOCATION_NAME"],
  PAGE_MASTER: ["PAGE_ID", "PAGE_NAME"],
  USER_PERMISSIONS: [
    "user_id",
    "page_id",
    "can_view",
    "can_create",
    "can_edit",
    "can_delete",
  ],
  permissions: ["id", "module", "action"],
  role_permissions: ["role_id", "permission_id"],
};

const collectReferencedTablesFromRepo = async () => {
  const { execSync } = require("child_process");

  const rg = (pattern) =>
    execSync(`rg -n "${pattern}" Src -S --no-heading`, {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });

  const output = execSync(
    `rg -n \"\\b(FROM|JOIN|INTO|UPDATE|DELETE\\s+FROM)\\b\" Src -S --no-heading --glob '!Src/check_live_db.js'`,
    {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }
  );
  const tableRx = /\b(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+([A-Za-z0-9_.\[\]]+)/gi;

  const tables = new Set();
  for (const line of output.split("\n")) {
    let m;
    while ((m = tableRx.exec(line))) {
      let raw = (m[1] || "").trim();
      raw = raw.split(/\s+/)[0].replaceAll("[", "").replaceAll("]", "");
      raw = raw.split("(")[0].replace(/[,;]$/, "");
      if (!raw || raw.startsWith("@")) continue;
      if (raw.includes(".")) raw = raw.split(".").at(-1);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(raw)) continue;
      if (SYSTEM_TABLES.has(raw.toUpperCase())) continue;
      if (IGNORED_REFERENCES.has(raw.toUpperCase())) continue;
      tables.add(raw);
    }
  }

  return [...tables].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
};

const fetchExistingTables = async () => {
  const result = await pool.request().query(`
    SELECT s.name AS schema_name, t.name AS table_name
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    ORDER BY s.name, t.name
  `);
  return result.recordset;
};

const fetchColumnsForTable = async (tableName) => {
  const result = await pool.request().input("tableName", tableName).query(`
    SELECT c.name AS column_name
    FROM sys.columns c
    JOIN sys.tables t ON t.object_id = c.object_id
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE t.name = @tableName
    ORDER BY c.column_id
  `);
  return result.recordset.map((r) => r.column_name);
};

const main = async () => {
  try {
    await pool.connect();
  } catch (err) {
    console.error("❌ DB connect failed:", err?.message || err);
    process.exit(2);
  }

  const existing = await fetchExistingTables();
  const existingNames = new Set(existing.map((r) => r.table_name.toLowerCase()));

  const referencedTables = await collectReferencedTablesFromRepo();
  const missingReferenced = referencedTables.filter((t) => !existingNames.has(t.toLowerCase()));

  const missingCritical = CRITICAL_TABLES.filter((t) => !existingNames.has(t.toLowerCase()));

  const missingColumns = [];
  for (const [tableName, cols] of Object.entries(CRITICAL_COLUMNS)) {
    if (!existingNames.has(tableName.toLowerCase())) continue;
    const existingCols = new Set((await fetchColumnsForTable(tableName)).map((c) => c.toLowerCase()));
    for (const col of cols) {
      if (!existingCols.has(col.toLowerCase())) {
        missingColumns.push({ table: tableName, column: col });
      }
    }
  }

  console.log("=== DB Schema Check ===");
  console.log(`Database: ${process.env.DB_NAME || "(unknown)"}`);
  console.log(`Server: ${process.env.SERVER || process.env.DB_HOST || process.env.SERVER1 || "(unknown)"}`);
  console.log("");

  if (missingCritical.length === 0) {
    console.log("✅ Critical tables: OK");
  } else {
    console.log("❌ Missing critical tables:");
    for (const t of missingCritical) console.log(`- ${t}`);
  }

  if (missingColumns.length === 0) {
    console.log("✅ Critical columns: OK");
  } else {
    console.log("❌ Missing critical columns:");
    for (const x of missingColumns) console.log(`- ${x.table}.${x.column}`);
  }

  if (missingReferenced.length === 0) {
    console.log("✅ Referenced tables in repo: OK");
  } else {
    console.log("⚠️ Missing tables referenced by code:");
    for (const t of missingReferenced) console.log(`- ${t}`);
  }

  const hasErrors = missingCritical.length > 0 || missingColumns.length > 0;
  await pool.close();
  process.exit(hasErrors ? 1 : 0);
};

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(3);
});
