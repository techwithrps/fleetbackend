const { pool, sql } = require("../config/dbconfig");

class DriverModel {
  // Get all drivers with vendor information
  static async getAll() {
    try {
      const result = await pool.request().query(`
        SELECT 
          d.*,
          v.VENDOR_NAME,
          v.VENDOR_CODE
        FROM DRIVER_MASTER d
        LEFT JOIN VENDOR_MASTER v ON d.VENDOR_ID = v.VENDOR_ID
        ORDER BY d.DRIVER_NAME
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all drivers error:", error);
      throw error;
    }
  }

  // Get driver by ID with vendor information
  static async getById(driverId) {
    try {
      const result = await pool
        .request()
        .input("driver_id", sql.Numeric(18, 0), driverId)
        .query(`
          SELECT 
            d.*,
            v.VENDOR_NAME,
            v.VENDOR_CODE
          FROM DRIVER_MASTER d
          LEFT JOIN VENDOR_MASTER v ON d.VENDOR_ID = v.VENDOR_ID
          WHERE d.DRIVER_ID = @driver_id
        `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get driver by ID error:", error);
      throw error;
    }
  }

  // Get next driver ID (since DRIVER_ID is not auto-increment)
  static async getNextDriverId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(DRIVER_ID), 0) + 1 AS next_id FROM DRIVER_MASTER
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next driver ID error:", error);
      throw error;
    }
  }

  // Create new driver
  static async create(data) {
    try {
      const {
        vendor_id, // Required field
        terminal_id,
        driver_name,
        address,
        vehicle_id,
        vehicle_no,
        contact_no,
        mobile_no,
        email_id,
        blood_group,
        joining_date,
        dl_no,
        dl_renewable_date,
        salary,
        active_flage,
        created_by,
        image,
        bal_amt,
        trip_bal,
        close_status,
        jo_close_status,
        gaurantor,
        driver_code,
        father_name,
        attach_status,
        dl_doc,
        address_doc,
        emerg_phone,
        phone_no
      } = data;

      // Validate required fields
      if (!vendor_id) {
        throw new Error("Vendor ID is required");
      }
      if (!driver_name) {
        throw new Error("Driver name is required");
      }

      // Get next driver ID
      const nextDriverId = await this.getNextDriverId();

      const result = await pool
        .request()
        .input("driver_id", sql.Numeric(18, 0), nextDriverId)
        .input("vendor_id", sql.Numeric(10, 0), vendor_id)
        .input("terminal_id", sql.Numeric(18, 0), terminal_id || null)
        .input("driver_name", sql.VarChar(100), driver_name)
        .input("address", sql.VarChar(300), address || null)
        .input("vehicle_id", sql.Numeric(18, 0), vehicle_id || null)
        .input("vehicle_no", sql.VarChar(20), vehicle_no || null)
        .input("contact_no", sql.VarChar(50), contact_no || null)
        .input("mobile_no", sql.VarChar(50), mobile_no || null)
        .input("email_id", sql.VarChar(300), email_id || null)
        .input("blood_group", sql.VarChar(300), blood_group || null)
        .input("joining_date", sql.Date, joining_date ? new Date(joining_date) : null)
        .input("dl_no", sql.VarChar(50), dl_no || null)
        .input("dl_renewable_date", sql.Date, dl_renewable_date ? new Date(dl_renewable_date) : null)
        .input("salary", sql.Numeric(18, 2), salary || null)
        .input("active_flage", sql.Char(1), active_flage || 'Y')
        .input("created_by", sql.VarChar(30), created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .input("image", sql.VarChar(200), image || null)
        .input("bal_amt", sql.VarChar(10), bal_amt || null)
        .input("trip_bal", sql.Numeric(18, 2), trip_bal || null)
        .input("close_status", sql.Int, close_status || null)
        .input("jo_close_status", sql.VarChar(10), jo_close_status || null)
        .input("gaurantor", sql.VarChar(100), gaurantor || null)
        .input("driver_code", sql.VarChar(10), driver_code || null)
        .input("father_name", sql.VarChar(100), father_name || null)
        .input("attach_status", sql.VarChar(10), attach_status || null)
        .input("dl_doc", sql.VarChar(300), dl_doc || null)
        .input("address_doc", sql.VarChar(300), address_doc || null)
        .input("emerg_phone", sql.VarChar(20), emerg_phone || null)
        .input("phone_no", sql.VarChar(20), phone_no || null)
        .query(`
          INSERT INTO DRIVER_MASTER (
            DRIVER_ID, VENDOR_ID, TERMINAL_ID, DRIVER_NAME, ADDRESS, VEHICLE_ID, VEHICLE_NO, 
            CONTACT_NO, MOBILE_NO, EMAIL_ID, BLOOD_GROUP, JOINING_DATE, 
            DL_NO, DL_RENEWABLE_DATE, SALARY, ACTIVE_FLAGE, CREATED_BY, 
            CREATED_ON, IMAGE, BAL_AMT, TRIP_BAL, CLOSE_STATUS, 
            JO_CLOSE_STATUS, GAURANTOR, DRIVER_CODE, FATHER_NAME, 
            ATTACH_STATUS, DL_DOC, ADDRESS_DOC, EMERG_PHONE, PHONE_NO
          ) 
          VALUES (
            @driver_id, @vendor_id, @terminal_id, @driver_name, @address, @vehicle_id, @vehicle_no, 
            @contact_no, @mobile_no, @email_id, @blood_group, @joining_date, 
            @dl_no, @dl_renewable_date, @salary, @active_flage, @created_by, 
            @created_on, @image, @bal_amt, @trip_bal, @close_status, 
            @jo_close_status, @gaurantor, @driver_code, @father_name, 
            @attach_status, @dl_doc, @address_doc, @emerg_phone, @phone_no
          )
        `);

      return { success: true, driver_id: nextDriverId };
    } catch (error) {
      console.error("Create driver error:", error);
      throw error;
    }
  }

  // Update driver
  static async update(driverId, data) {
    try {
      const {
        vendor_id,
        terminal_id,
        driver_name,
        address,
        vehicle_id,
        vehicle_no,
        contact_no,
        mobile_no,
        email_id,
        blood_group,
        joining_date,
        dl_no,
        dl_renewable_date,
        salary,
        active_flage,
        image,
        bal_amt,
        trip_bal,
        close_status,
        jo_close_status,
        gaurantor,
        driver_code,
        father_name,
        attach_status,
        dl_doc,
        address_doc,
        emerg_phone,
        phone_no
      } = data;

      // Validate required fields
      if (!driver_name) {
        throw new Error("Driver name is required");
      }

      await pool
        .request()
        .input("driver_id", sql.Numeric(18, 0), driverId)
        .input("vendor_id", sql.Numeric(10, 0), vendor_id)
        .input("terminal_id", sql.Numeric(18, 0), terminal_id || null)
        .input("driver_name", sql.VarChar(100), driver_name)
        .input("address", sql.VarChar(300), address || null)
        .input("vehicle_id", sql.Numeric(18, 0), vehicle_id || null)
        .input("vehicle_no", sql.VarChar(20), vehicle_no || null)
        .input("contact_no", sql.VarChar(50), contact_no || null)
        .input("mobile_no", sql.VarChar(50), mobile_no || null)
        .input("email_id", sql.VarChar(300), email_id || null)
        .input("blood_group", sql.VarChar(300), blood_group || null)
        .input("joining_date", sql.Date, joining_date ? new Date(joining_date) : null)
        .input("dl_no", sql.VarChar(50), dl_no || null)
        .input("dl_renewable_date", sql.Date, dl_renewable_date ? new Date(dl_renewable_date) : null)
        .input("salary", sql.Numeric(18, 2), salary || null)
        .input("active_flage", sql.Char(1), active_flage || 'Y')
        .input("image", sql.VarChar(200), image || null)
        .input("bal_amt", sql.VarChar(10), bal_amt || null)
        .input("trip_bal", sql.Numeric(18, 2), trip_bal || null)
        .input("close_status", sql.Int, close_status || null)
        .input("jo_close_status", sql.VarChar(10), jo_close_status || null)
        .input("gaurantor", sql.VarChar(100), gaurantor || null)
        .input("driver_code", sql.VarChar(10), driver_code || null)
        .input("father_name", sql.VarChar(100), father_name || null)
        .input("attach_status", sql.VarChar(10), attach_status || null)
        .input("dl_doc", sql.VarChar(300), dl_doc || null)
        .input("address_doc", sql.VarChar(300), address_doc || null)
        .input("emerg_phone", sql.VarChar(20), emerg_phone || null)
        .input("phone_no", sql.VarChar(20), phone_no || null)
        .query(`
          UPDATE DRIVER_MASTER SET
            VENDOR_ID = @vendor_id,
            TERMINAL_ID = @terminal_id,
            DRIVER_NAME = @driver_name,
            ADDRESS = @address,
            VEHICLE_ID = @vehicle_id,
            VEHICLE_NO = @vehicle_no,
            CONTACT_NO = @contact_no,
            MOBILE_NO = @mobile_no,
            EMAIL_ID = @email_id,
            BLOOD_GROUP = @blood_group,
            JOINING_DATE = @joining_date,
            DL_NO = @dl_no,
            DL_RENEWABLE_DATE = @dl_renewable_date,
            SALARY = @salary,
            ACTIVE_FLAGE = @active_flage,
            IMAGE = @image,
            BAL_AMT = @bal_amt,
            TRIP_BAL = @trip_bal,
            CLOSE_STATUS = @close_status,
            JO_CLOSE_STATUS = @jo_close_status,
            GAURANTOR = @gaurantor,
            DRIVER_CODE = @driver_code,
            FATHER_NAME = @father_name,
            ATTACH_STATUS = @attach_status,
            DL_DOC = @dl_doc,
            ADDRESS_DOC = @address_doc,
            EMERG_PHONE = @emerg_phone,
            PHONE_NO = @phone_no
          WHERE DRIVER_ID = @driver_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Update driver error:", error);
      throw error;
    }
  }

  // Delete driver
  static async delete(driverId) {
    try {
      await pool
        .request()
        .input("driver_id", sql.Numeric(18, 0), driverId)
        .query(`
          DELETE FROM DRIVER_MASTER WHERE DRIVER_ID = @driver_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Delete driver error:", error);
      throw error;
    }
  }

  // Get drivers by vendor ID
  static async getByVendorId(vendorId) {
    try {
      const result = await pool
        .request()
        .input("vendor_id", sql.Numeric(10, 0), vendorId)
        .query(`
          SELECT 
            d.*,
            v.VENDOR_NAME,
            v.VENDOR_CODE
          FROM DRIVER_MASTER d
          LEFT JOIN VENDOR_MASTER v ON d.VENDOR_ID = v.VENDOR_ID
          WHERE d.VENDOR_ID = @vendor_id
          ORDER BY d.DRIVER_NAME
        `);

      return result.recordset;
    } catch (error) {
      console.error("Get drivers by vendor ID error:", error);
      throw error;
    }
  }

  // Get available vendors for dropdown
  static async getVendors() {
    try {
      const result = await pool.request().query(`
        SELECT VENDOR_ID, VENDOR_NAME, VENDOR_CODE
        FROM VENDOR_MASTER
        WHERE ACTIVE_FLAG = 'Y' OR ACTIVE_FLAG IS NULL
        ORDER BY VENDOR_NAME
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get vendors error:", error);
      throw error;
    }
  }
}

module.exports = DriverModel;