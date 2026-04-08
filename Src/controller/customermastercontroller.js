const { pool, sql } = require("../config/dbconfig");

class CustomerMasterController {
  static async getAllCustomers(req, res) {
    try {
      const result = await pool
        .request()
        .query("SELECT * FROM Customer_Master");
      res.status(200).json(result.recordset);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res
        .status(500)
        .json({ message: "Error fetching customers", error: error.message });
    }
  }
}

module.exports = CustomerMasterController;
