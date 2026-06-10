const { pool, sql } = require("../config/dbconfig");

class TransporterDetailsModal {
  // Create a new transporter
  static async create(data) {
    try {
      const {
        transporter_name,
        transporter_email,
        transporter_contact,
        company_name = null,
        gst_number = null,
        address_line1 = null,
        address_line2 = null,
        city = null,
        state = null,
        pincode = null,
        country = "India",
        status = "Active",
      } = data;

      const result = await pool
        .request()
        .input("transporter_name", sql.VarChar(100), transporter_name)
        .input("transporter_email", sql.VarChar(100), transporter_email)
        .input("transporter_contact", sql.VarChar(15), transporter_contact)
        .input("company_name", sql.VarChar(100), company_name)
        .input("gst_number", sql.VarChar(20), gst_number)
        .input("address_line1", sql.VarChar(150), address_line1)
        .input("address_line2", sql.VarChar(150), address_line2)
        .input("city", sql.VarChar(50), city)
        .input("state", sql.VarChar(50), state)
        .input("pincode", sql.VarChar(10), pincode)
        .input("country", sql.VarChar(50), country)
        .input("status", sql.VarChar(20), status)
        .query(`
          INSERT INTO Transporter_Details_Master (
            transporter_name,
            transporter_email,
            transporter_contact,
            company_name,
            gst_number,
            address_line1,
            address_line2,
            city,
            state,
            pincode,
            country,
            status,
            created_at,
            updated_at
          )
          VALUES (
            @transporter_name,
            @transporter_email,
            @transporter_contact,
            @company_name,
            @gst_number,
            @address_line1,
            @address_line2,
            @city,
            @state,
            @pincode,
            @country,
            @status,
            GETDATE(),
            GETDATE()
          )
        `);

      return { success: true };
    } catch (error) {
      console.error("Create transporter error:", error);
      throw error;
    }
  }

  // Get transporter by ID
  static async getById(transporterId) {
    try {
      const result = await pool
        .request()
        .input("transporter_id", sql.Int, transporterId)
        .query(`
          SELECT * FROM Transporter_Details_Master
          WHERE transporter_id = @transporter_id
        `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get transporter by ID error:", error);
      throw error;
    }
  }

  // Get all transporters
  static async getAll() {
    try {
      const result = await pool.request().query(`
        SELECT * FROM Transporter_Details_Master
        ORDER BY created_at DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all transporters error:", error);
      throw error;
    }
  }

  // Update transporter details by ID
  static async update(transporterId, data) {
    try {
      const {
        transporter_name,
        transporter_email,
        transporter_contact,
        company_name,
        gst_number,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        country,
        status,
      } = data;

      await pool
        .request()
        .input("transporter_id", sql.Int, transporterId)
        .input("transporter_name", sql.VarChar(100), transporter_name)
        .input("transporter_email", sql.VarChar(100), transporter_email)
        .input("transporter_contact", sql.VarChar(15), transporter_contact)
        .input("company_name", sql.VarChar(100), company_name)
        .input("gst_number", sql.VarChar(20), gst_number)
        .input("address_line1", sql.VarChar(150), address_line1)
        .input("address_line2", sql.VarChar(150), address_line2)
        .input("city", sql.VarChar(50), city)
        .input("state", sql.VarChar(50), state)
        .input("pincode", sql.VarChar(10), pincode)
        .input("country", sql.VarChar(50), country)
        .input("status", sql.VarChar(20), status)
        .query(`
          UPDATE Transporter_Details_Master
          SET
            transporter_name = @transporter_name,
            transporter_email = @transporter_email,
            transporter_contact = @transporter_contact,
            company_name = @company_name,
            gst_number = @gst_number,
            address_line1 = @address_line1,
            address_line2 = @address_line2,
            city = @city,
            state = @state,
            pincode = @pincode,
            country = @country,
            status = @status,
            updated_at = GETDATE()
          WHERE transporter_id = @transporter_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Update transporter error:", error);
      throw error;
    }
  }

  // Optional: Delete transporter by ID
  static async delete(transporterId) {
    try {
      await pool
        .request()
        .input("transporter_id", sql.Int, transporterId)
        .query(`
          DELETE FROM Transporter_Details_Master WHERE transporter_id = @transporter_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Delete transporter error:", error);
      throw error;
    }
  }
}

module.exports = TransporterDetailsModal;
