const { sql, poolConnect, pool } = require("../config/dbconfig");

// Fetch all locations
const getAllLocations = async () => {
  await poolConnect;
  try {
    const result = await pool.request().query("SELECT * FROM LOCATION_MASTER");
    return result.recordset;
  } catch (error) {
    throw new Error("Error fetching locations: " + error.message);
  }
};

module.exports = {
  getAllLocations,
};
