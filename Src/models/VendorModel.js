const { pool, sql } = require("../config/dbconfig");

class VendorModel {
  // Helper function to transform frontend field names to database column names
  static transformFieldsToDb(data) {
    return {
      TERMINAL_ID: data.terminal_id,
      VENDOR_CODE: data.vendor_code,
      VENDOR_NAME: data.vendor_name,
      ADDRESS: data.address,
      CITY: data.city,
      PIN_CODE: data.pin_code,
      STATE_CODE: data.state_code,
      COUNTRY: data.country,
      EMAIL_ID1: data.email_id1,
      EMAIL_ID2: data.email_id2,
      CONTACT_NO: data.contact_no,
      MOBILE_NO: data.mobile_no,
      FAX: data.fax,
      PAYMENT_TERMS: data.payment_terms,
      PAN: data.pan,
      TAN: data.tan,
      SERVICE_TAX_REG: data.service_tax_reg,
      BANK_NAME: data.bank_name,
      AC_MAP_CODE: data.ac_map_code,
      ACCOUNT_NO: data.account_no,
      IFSC: data.ifsc,
      BANK_BRANCH: data.bank_branch,
      GSTIN: data.gstin,
      STATUS: data.status,
    };
  }

  // Get all vendors with consistent document field mapping
  static async getAll() {
    try {
      const result = await pool.request().query(`
        SELECT 
          VENDOR_ID, TERMINAL_ID, VENDOR_CODE, VENDOR_NAME, ADDRESS, CITY, PIN_CODE, STATE_CODE, COUNTRY,
          EMAIL_ID1, EMAIL_ID2, CONTACT_NO, MOBILE_NO, FAX, PAYMENT_TERMS, PAN, TAN,
          SERVICE_TAX_REG, BANK_NAME, AC_MAP_CODE, CREATED_BY, CREATED_ON, UPDATED_BY, UPDATED_ON,
          ACCOUNT_NO, IFSC, BANK_BRANCH, GSTIN, STATUS,
          -- Document 1 (using IMAGE columns for compatibility)
          IMAGE_NAME AS DOCUMENT1_NAME, 
          IMAGE_TYPE AS DOCUMENT1_TYPE,
          CASE WHEN IMAGE_DATA IS NOT NULL THEN 'true' ELSE 'false' END AS HAS_DOCUMENT1,
          -- Document 2
          DOCUMENT2_NAME, 
          DOCUMENT2_TYPE,
          CASE WHEN DOCUMENT2_DATA IS NOT NULL THEN 'true' ELSE 'false' END AS HAS_DOCUMENT2,
          -- Document 3
          DOCUMENT3_NAME, 
          DOCUMENT3_TYPE,
          CASE WHEN DOCUMENT3_DATA IS NOT NULL THEN 'true' ELSE 'false' END AS HAS_DOCUMENT3
        FROM VENDOR_MASTER
        ORDER BY VENDOR_NAME
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all vendors error:", error);
      throw error;
    }
  }

  // Get vendor by ID
  static async getById(vendorId) {
    try {
      const result = await pool
        .request()
        .input("vendor_id", sql.Numeric(10, 0), vendorId).query(`
          SELECT 
            VENDOR_ID, TERMINAL_ID, VENDOR_CODE, VENDOR_NAME, ADDRESS, CITY, PIN_CODE, STATE_CODE, COUNTRY,
            EMAIL_ID1, EMAIL_ID2, CONTACT_NO, MOBILE_NO, FAX, PAYMENT_TERMS, PAN, TAN,
            SERVICE_TAX_REG, BANK_NAME, AC_MAP_CODE, CREATED_BY, CREATED_ON, UPDATED_BY, UPDATED_ON,
            ACCOUNT_NO, IFSC, BANK_BRANCH, GSTIN, STATUS,
            -- Document 1 (using IMAGE columns for compatibility)
            IMAGE_NAME AS DOCUMENT1_NAME, 
            IMAGE_TYPE AS DOCUMENT1_TYPE,
            CASE WHEN IMAGE_DATA IS NOT NULL THEN 'true' ELSE 'false' END AS HAS_DOCUMENT1,
            -- Document 2
            DOCUMENT2_NAME, 
            DOCUMENT2_TYPE,
            CASE WHEN DOCUMENT2_DATA IS NOT NULL THEN 'true' ELSE 'false' END AS HAS_DOCUMENT2,
            -- Document 3
            DOCUMENT3_NAME, 
            DOCUMENT3_TYPE,
            CASE WHEN DOCUMENT3_DATA IS NOT NULL THEN 'true' ELSE 'false' END AS HAS_DOCUMENT3
          FROM VENDOR_MASTER
          WHERE VENDOR_ID = @vendor_id
        `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get vendor by ID error:", error);
      throw error;
    }
  }

  // Get vendor document with proper column mapping
  static async getVendorDocument(vendorId, documentNumber) {
    try {
      let docColumn, nameColumn, typeColumn;

      // Map document numbers to actual column names (handling the IMAGE vs DOCUMENT inconsistency)
      switch (documentNumber) {
        case "1":
          docColumn = "IMAGE_DATA";
          nameColumn = "IMAGE_NAME";
          typeColumn = "IMAGE_TYPE";
          break;
        case "2":
          docColumn = "DOCUMENT2_DATA";
          nameColumn = "DOCUMENT2_NAME";
          typeColumn = "DOCUMENT2_TYPE";
          break;
        case "3":
          docColumn = "DOCUMENT3_DATA";
          nameColumn = "DOCUMENT3_NAME";
          typeColumn = "DOCUMENT3_TYPE";
          break;
        default:
          throw new Error("Invalid document number. Must be 1, 2, or 3.");
      }

      const result = await pool
        .request()
        .input("vendor_id", sql.Numeric(10, 0), vendorId).query(`
          SELECT ${docColumn} as DOCUMENT_DATA, ${nameColumn} as DOCUMENT_NAME, ${typeColumn} as DOCUMENT_TYPE
          FROM VENDOR_MASTER
          WHERE VENDOR_ID = @vendor_id AND ${docColumn} IS NOT NULL
        `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get vendor document error:", error);
      throw error;
    }
  }

  // Create a new vendor with exactly 3 document slots
  static async create(data, documents = []) {
    try {
      // Transform frontend fields to database columns
      const dbData = this.transformFieldsToDb(data);

      // Get the next available VENDOR_ID
      const maxIdResult = await pool.request().query(`
        SELECT ISNULL(MAX(VENDOR_ID), 0) + 1 AS next_id FROM VENDOR_MASTER
      `);
      const nextVendorId = maxIdResult.recordset[0].next_id;

      // Prepare documents (max 3)
      const doc1 = documents.find((d) => d.index === 1) || null;
      const doc2 = documents.find((d) => d.index === 2) || null;
      const doc3 = documents.find((d) => d.index === 3) || null;

      const request = pool
        .request()
        .input("vendor_id", sql.Numeric(10, 0), nextVendorId)
        .input("terminal_id", sql.Numeric(10, 0), dbData.TERMINAL_ID || null)
        .input("vendor_code", sql.NVarChar(50), dbData.VENDOR_CODE || null)
        .input("vendor_name", sql.NVarChar(100), dbData.VENDOR_NAME)
        .input("address", sql.NVarChar(200), dbData.ADDRESS || null)
        .input("city", sql.NVarChar(50), dbData.CITY || null)
        .input("pin_code", sql.NVarChar(10), dbData.PIN_CODE || null)
        .input("state_code", sql.NVarChar(50), dbData.STATE_CODE || null)
        .input("country", sql.NVarChar(50), dbData.COUNTRY || "India")
        .input("email_id1", sql.NVarChar(100), dbData.EMAIL_ID1 || null)
        .input("email_id2", sql.NVarChar(100), dbData.EMAIL_ID2 || null)
        .input("contact_no", sql.NVarChar(50), dbData.CONTACT_NO || null)
        .input("mobile_no", sql.NVarChar(50), dbData.MOBILE_NO || null)
        .input("fax", sql.NVarChar(50), dbData.FAX || null)
        .input("payment_terms", sql.NVarChar(1), dbData.PAYMENT_TERMS || null)
        .input("pan", sql.NVarChar(50), dbData.PAN || null)
        .input("tan", sql.NVarChar(50), dbData.TAN || null)
        .input(
          "service_tax_reg",
          sql.NVarChar(50),
          dbData.SERVICE_TAX_REG || null
        )
        .input("bank_name", sql.NVarChar(50), dbData.BANK_NAME || null)
        .input("ac_map_code", sql.NVarChar(20), dbData.AC_MAP_CODE || null)
        .input("account_no", sql.NVarChar(30), dbData.ACCOUNT_NO || null)
        .input("ifsc", sql.NVarChar(20), dbData.IFSC || null)
        .input("bank_branch", sql.NVarChar(30), dbData.BANK_BRANCH || null)
        .input("gstin", sql.NVarChar(30), dbData.GSTIN || null)
        .input("status", sql.NVarChar(20), dbData.STATUS || "Active")
        .input("created_by", sql.NVarChar(30), "SYSTEM")
        // Document parameters
        .input("image_data", sql.VarBinary(sql.MAX), doc1?.buffer || null)
        .input("image_name", sql.NVarChar(255), doc1?.name || null)
        .input("image_type", sql.NVarChar(100), doc1?.type || null)
        .input("document2_data", sql.VarBinary(sql.MAX), doc2?.buffer || null)
        .input("document2_name", sql.NVarChar(255), doc2?.name || null)
        .input("document2_type", sql.NVarChar(100), doc2?.type || null)
        .input("document3_data", sql.VarBinary(sql.MAX), doc3?.buffer || null)
        .input("document3_name", sql.NVarChar(255), doc3?.name || null)
        .input("document3_type", sql.NVarChar(100), doc3?.type || null);

      await request.query(`
        INSERT INTO VENDOR_MASTER (
          VENDOR_ID, TERMINAL_ID, VENDOR_CODE, VENDOR_NAME, ADDRESS, CITY, PIN_CODE, STATE_CODE, COUNTRY,
          EMAIL_ID1, EMAIL_ID2, CONTACT_NO, MOBILE_NO, FAX, PAYMENT_TERMS, PAN, TAN,
          SERVICE_TAX_REG, BANK_NAME, AC_MAP_CODE, CREATED_BY, CREATED_ON, ACCOUNT_NO,
          IFSC, BANK_BRANCH, GSTIN, STATUS,
          IMAGE_DATA, IMAGE_NAME, IMAGE_TYPE,
          DOCUMENT2_DATA, DOCUMENT2_NAME, DOCUMENT2_TYPE,
          DOCUMENT3_DATA, DOCUMENT3_NAME, DOCUMENT3_TYPE
        )
        VALUES (
          @vendor_id, @terminal_id, @vendor_code, @vendor_name, @address, @city, @pin_code, @state_code, @country,
          @email_id1, @email_id2, @contact_no, @mobile_no, @fax, @payment_terms, @pan, @tan,
          @service_tax_reg, @bank_name, @ac_map_code, @created_by, GETDATE(), @account_no,
          @ifsc, @bank_branch, @gstin, @status,
          @image_data, @image_name, @image_type,
          @document2_data, @document2_name, @document2_type,
          @document3_data, @document3_name, @document3_type
        )
      `);

      return { success: true, vendor_id: nextVendorId };
    } catch (error) {
      console.error("Create vendor error:", error);
      throw error;
    }
  }

  // Update vendor
  static async update(vendorId, data, documents = []) {
    try {
      // Transform frontend fields to database columns
      const dbData = this.transformFieldsToDb(data);

      const request = pool
        .request()
        .input("vendor_id", sql.Numeric(10, 0), vendorId)
        .input("terminal_id", sql.Numeric(10, 0), dbData.TERMINAL_ID || null)
        .input("vendor_code", sql.NVarChar(50), dbData.VENDOR_CODE || null)
        .input("vendor_name", sql.NVarChar(100), dbData.VENDOR_NAME)
        .input("address", sql.NVarChar(200), dbData.ADDRESS || null)
        .input("city", sql.NVarChar(50), dbData.CITY || null)
        .input("pin_code", sql.NVarChar(10), dbData.PIN_CODE || null)
        .input("state_code", sql.NVarChar(50), dbData.STATE_CODE || null)
        .input("country", sql.NVarChar(50), dbData.COUNTRY || "India")
        .input("email_id1", sql.NVarChar(100), dbData.EMAIL_ID1 || null)
        .input("email_id2", sql.NVarChar(100), dbData.EMAIL_ID2 || null)
        .input("contact_no", sql.NVarChar(50), dbData.CONTACT_NO || null)
        .input("mobile_no", sql.NVarChar(50), dbData.MOBILE_NO || null)
        .input("fax", sql.NVarChar(50), dbData.FAX || null)
        .input("payment_terms", sql.NVarChar(1), dbData.PAYMENT_TERMS || null)
        .input("pan", sql.NVarChar(50), dbData.PAN || null)
        .input("tan", sql.NVarChar(50), dbData.TAN || null)
        .input(
          "service_tax_reg",
          sql.NVarChar(50),
          dbData.SERVICE_TAX_REG || null
        )
        .input("bank_name", sql.NVarChar(50), dbData.BANK_NAME || null)
        .input("ac_map_code", sql.NVarChar(20), dbData.AC_MAP_CODE || null)
        .input("account_no", sql.NVarChar(30), dbData.ACCOUNT_NO || null)
        .input("ifsc", sql.NVarChar(20), dbData.IFSC || null)
        .input("bank_branch", sql.NVarChar(30), dbData.BANK_BRANCH || null)
        .input("gstin", sql.NVarChar(30), dbData.GSTIN || null)
        .input("status", sql.NVarChar(20), dbData.STATUS || "Active")
        .input("updated_by", sql.NVarChar(30), "SYSTEM");

      let query = `
        UPDATE VENDOR_MASTER
        SET 
          TERMINAL_ID = @terminal_id, VENDOR_CODE = @vendor_code, VENDOR_NAME = @vendor_name,
          ADDRESS = @address, CITY = @city, PIN_CODE = @pin_code, STATE_CODE = @state_code, COUNTRY = @country,
          EMAIL_ID1 = @email_id1, EMAIL_ID2 = @email_id2, CONTACT_NO = @contact_no, MOBILE_NO = @mobile_no,
          FAX = @fax, PAYMENT_TERMS = @payment_terms, PAN = @pan, TAN = @tan,
          SERVICE_TAX_REG = @service_tax_reg, BANK_NAME = @bank_name, AC_MAP_CODE = @ac_map_code,
          UPDATED_BY = @updated_by, UPDATED_ON = GETDATE(), ACCOUNT_NO = @account_no,
          IFSC = @ifsc, BANK_BRANCH = @bank_branch, GSTIN = @gstin, STATUS = @status`;

      // Add document updates if provided
      documents.forEach((doc) => {
        switch (doc.index) {
          case 1:
            request
              .input(`image_data`, sql.VarBinary(sql.MAX), doc.buffer)
              .input(`image_name`, sql.NVarChar(255), doc.name)
              .input(`image_type`, sql.NVarChar(100), doc.type);
            query += `, IMAGE_DATA = @image_data, IMAGE_NAME = @image_name, IMAGE_TYPE = @image_type`;
            break;
          case 2:
            request
              .input(`document2_data`, sql.VarBinary(sql.MAX), doc.buffer)
              .input(`document2_name`, sql.NVarChar(255), doc.name)
              .input(`document2_type`, sql.NVarChar(100), doc.type);
            query += `, DOCUMENT2_DATA = @document2_data, DOCUMENT2_NAME = @document2_name, DOCUMENT2_TYPE = @document2_type`;
            break;
          case 3:
            request
              .input(`document3_data`, sql.VarBinary(sql.MAX), doc.buffer)
              .input(`document3_name`, sql.NVarChar(255), doc.name)
              .input(`document3_type`, sql.NVarChar(100), doc.type);
            query += `, DOCUMENT3_DATA = @document3_data, DOCUMENT3_NAME = @document3_name, DOCUMENT3_TYPE = @document3_type`;
            break;
        }
      });

      query += ` WHERE VENDOR_ID = @vendor_id`;
      await request.query(query);

      return { success: true };
    } catch (error) {
      console.error("Update vendor error:", error);
      throw error;
    }
  }

  // Delete vendor
  static async delete(vendorId) {
    try {
      await pool
        .request()
        .input("vendor_id", sql.Numeric(10, 0), vendorId)
        .query(`DELETE FROM VENDOR_MASTER WHERE VENDOR_ID = @vendor_id`);
      return { success: true };
    } catch (error) {
      console.error("Delete vendor error:", error);
      throw error;
    }
  }
}

module.exports = VendorModel;
