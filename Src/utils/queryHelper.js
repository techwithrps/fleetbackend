const { sql } = require("../config/dbconfig");
const { pool } = require("../config/dbconfig");

/**
 * Applies a location (terminal) filter to a SQL query based on the user's session context.
 * 
 * @param {Object} request - The mssql Request object
 * @param {Object} user - The user object from req.user (JWT payload)
 * @param {string} alias - Optional table alias (e.g., 't')
 * @returns {string} - The SQL WHERE clause fragment
 */
const applyLocationFilter = (request, user, alias = "") => {
  if (!user) return "";

  const prefix = alias ? `${alias}.` : "";
  const selectedTerminalIdRaw = user.terminalId;
  const selectedTerminalId =
    selectedTerminalIdRaw === undefined ||
    selectedTerminalIdRaw === null ||
    String(selectedTerminalIdRaw).toUpperCase() === "ALL"
      ? null
      : Number(selectedTerminalIdRaw);

  // If user is Admin and has selected 'ALL' (represented as null or 'ALL'), no filter is applied
  if (user.role?.toLowerCase() === "admin" && !selectedTerminalId) {
    return "";
  }

  // Otherwise, filter by the selected terminal
  if (Number.isFinite(selectedTerminalId)) {
    request.input("selected_terminal_id", sql.Numeric(18, 0), selectedTerminalId);
    return ` AND ${prefix}TERMINAL_ID = @selected_terminal_id`;
  }

  // Fallback: If no terminal is selected but user has specific assigned terminals, 
  // we could filter by the list of their terminals. 
  // But usually, terminalId is mandatory in the session after login.
  return "";
};

const locationColumnCache = new Map();

const getLocationColumnForTable = async (tableName, preferredColumns = ["TERMINAL_ID", "LOCATION_ID"]) => {
  const cacheKey = `${tableName}|${preferredColumns.join(",")}`;
  if (locationColumnCache.has(cacheKey)) {
    return locationColumnCache.get(cacheKey);
  }

  const result = await pool
    .request()
    .input("table_name", sql.VarChar, tableName)
    .query(`
      SELECT UPPER(COLUMN_NAME) AS COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @table_name
    `);

  const existing = new Set((result.recordset || []).map((row) => row.COLUMN_NAME));
  const resolved = preferredColumns.find((column) => existing.has(String(column).toUpperCase())) || null;
  locationColumnCache.set(cacheKey, resolved);
  return resolved;
};

const applyLocationFilterByTable = async (
  request,
  user,
  { tableName, alias = "", preferredColumns = ["TERMINAL_ID", "LOCATION_ID"] }
) => {
  if (!user) return "";

  const selectedRaw = user.terminalId;
  const selectedTerminalId =
    selectedRaw === undefined ||
    selectedRaw === null ||
    String(selectedRaw).toUpperCase() === "ALL"
      ? null
      : Number(selectedRaw);

  if (!Number.isFinite(selectedTerminalId)) {
    return "";
  }

  const locationColumn = await getLocationColumnForTable(tableName, preferredColumns);
  if (!locationColumn) {
    return "";
  }

  request.input("selected_terminal_id", sql.Numeric(18, 0), selectedTerminalId);
  const prefix = alias ? `${alias}.` : "";
  return ` AND ${prefix}${locationColumn} = @selected_terminal_id`;
};

module.exports = {
  applyLocationFilter,
  applyLocationFilterByTable,
  getLocationColumnForTable,
};
