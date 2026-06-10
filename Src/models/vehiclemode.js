const { pool, sql } = require("../config/dbconfig");

const getAllVehicles = async () => {
  try {
    const request = pool.request(); // use the shared connection pool
    const result = await request.query("SELECT * FROM VEHICLE_MASTER");

    return result.recordset;
  } catch (err) {
    console.error("Error in getAllVehicles model:", err);
    throw err;
  }
};

module.exports = {
  getAllVehicles,
};
