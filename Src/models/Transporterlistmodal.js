const { pool, sql } = require("../config/dbconfig");

class TransporterlistModel {
  static async getAllTransporters() {
    try {
      const result = await pool.request().query(`
        SELECT * FROM Transporter_list_Master
        ORDER BY created_at DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all transporters error:", error);
      throw error;
    }
  }

  static async getTransporterById(transporter_id) {
    try {
      const result = await pool
        .request()
        .input("transporter_id", sql.Int, transporter_id)
        .query(`SELECT * FROM Transporter_list_Master WHERE transporter_id = @transporter_id`);
      return result.recordset[0];
    } catch (error) {
      console.error("Get transporter by ID error:", error);
      throw error;
    }
  }

  static async getTransporterByEmail(transporter_email) {
    try {
      const result = await pool
        .request()
        .input("transporter_email", sql.VarChar(100), transporter_email)
        .query(`SELECT * FROM Transporter_list_Master WHERE transporter_email = @transporter_email`);
      return result.recordset[0];
    } catch (error) {
      console.error("Get transporter by email error:", error);
      throw error;
    }
  }
}

module.exports = TransporterlistModel;
