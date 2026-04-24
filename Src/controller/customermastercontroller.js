const { pool, sql } = require("../config/dbconfig");
const { applyLocationFilter } = require("../utils/queryHelper");

class CustomerMasterController {
  static async getAllCustomers(req, res) {
    try {
      const request = pool.request();
      const filter = applyLocationFilter(request, req.user);
      
      const result = await request.query(`SELECT * FROM Customer_Master WHERE 1=1 ${filter}`);
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
