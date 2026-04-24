const { sql } = require("../config/dbconfig");

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
  const selectedTerminalId = user.terminalId;

  // If user is Admin and has selected 'ALL' (represented as null or 'ALL'), no filter is applied
  if (user.role?.toLowerCase() === "admin" && (!selectedTerminalId || selectedTerminalId === "ALL")) {
    return "";
  }

  // Otherwise, filter by the selected terminal
  if (selectedTerminalId) {
    request.input("selected_terminal_id", sql.Numeric(18, 0), selectedTerminalId);
    return ` AND ${prefix}TERMINAL_ID = @selected_terminal_id`;
  }

  // Fallback: If no terminal is selected but user has specific assigned terminals, 
  // we could filter by the list of their terminals. 
  // But usually, terminalId is mandatory in the session after login.
  return "";
};

module.exports = {
  applyLocationFilter,
};
