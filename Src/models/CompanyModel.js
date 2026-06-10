const { pool, sql } = require("../config/dbconfig");

class CompanyModel {
  static async getAllCompanies() {
    try {
      const result = await pool.request().query(
        "SELECT COMPANY_ID, COMPANY_NAME, CI_NO as CIN_NO, PAN_NO, GSTIN as GST_NO, CONTACT_PERSON, CONTACT_NO, EMAIL_ID, STATE, CITY, PIN as PINCODE, ADDRESS as REGISTRATION_ADDRESS, WEBSITE, LOGO_MIME_TYPE FROM COMPANY_MASTER ORDER BY COMPANY_ID DESC"
      );
      // We don't fetch LOGO_BLOB in getAll to save bandwidth. It can be fetched per company or through a specific route.
      return result.recordset;
    } catch (error) {
      throw error;
    }
  }

  static async getCompanyById(id) {
    try {
      const result = await pool.request()
        .input("companyId", sql.Numeric, id)
        .query("SELECT * FROM COMPANY_MASTER WHERE COMPANY_ID = @companyId");
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  static async createCompany(data, file) {
    try {
      const request = pool.request()
        .input("companyName", sql.VarChar, data.COMPANY_NAME)
        .input("cinNo", sql.VarChar, data.CIN_NO || null)
        .input("panNo", sql.VarChar, data.PAN_NO || null)
        .input("gstNo", sql.VarChar, data.GST_NO || null)
        .input("contactPerson", sql.VarChar, data.CONTACT_PERSON || null)
        .input("contactNo", sql.VarChar, data.CONTACT_NO || null)
        .input("emailId", sql.VarChar, data.EMAIL_ID || null)
        .input("state", sql.VarChar, data.STATE || null)
        .input("city", sql.VarChar, data.CITY || null)
        .input("pincode", sql.VarChar, data.PINCODE || null)
        .input("registrationAddress", sql.VarChar, data.REGISTRATION_ADDRESS || null)
        .input("website", sql.VarChar, data.WEBSITE || null)
        .input("createdBy", sql.VarChar, data.CREATED_BY || "System");

      if (file) {
        request.input("logoBlob", sql.VarBinary, file.buffer);
        request.input("logoMimeType", sql.VarChar, file.mimetype);
      } else {
        request.input("logoBlob", sql.VarBinary, null);
        request.input("logoMimeType", sql.VarChar, null);
      }

      const result = await request.query(`
        INSERT INTO COMPANY_MASTER (
          COMPANY_NAME, CI_NO, PAN_NO, GSTIN, CONTACT_PERSON, CONTACT_NO, 
          EMAIL_ID, STATE, CITY, PIN, ADDRESS, WEBSITE, 
          LOGO_BLOB, LOGO_MIME_TYPE
        )
        OUTPUT inserted.COMPANY_ID
        VALUES (
          @companyName, @cinNo, @panNo, @gstNo, @contactPerson, @contactNo,
          @emailId, @state, @city, @pincode, @registrationAddress, @website,
          @logoBlob, @logoMimeType
        );
      `);

      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  static async updateCompany(id, data, file) {
    try {
      let query = `
        UPDATE COMPANY_MASTER SET 
          COMPANY_NAME = @companyName,
          CI_NO = @cinNo,
          PAN_NO = @panNo,
          GSTIN = @gstNo,
          CONTACT_PERSON = @contactPerson,
          CONTACT_NO = @contactNo,
          EMAIL_ID = @emailId,
          STATE = @state,
          CITY = @city,
          PIN = @pincode,
          ADDRESS = @registrationAddress,
          WEBSITE = @website
      `;

      const request = pool.request()
        .input("companyId", sql.Numeric, id)
        .input("companyName", sql.VarChar, data.COMPANY_NAME)
        .input("cinNo", sql.VarChar, data.CIN_NO || null)
        .input("panNo", sql.VarChar, data.PAN_NO || null)
        .input("gstNo", sql.VarChar, data.GST_NO || null)
        .input("contactPerson", sql.VarChar, data.CONTACT_PERSON || null)
        .input("contactNo", sql.VarChar, data.CONTACT_NO || null)
        .input("emailId", sql.VarChar, data.EMAIL_ID || null)
        .input("state", sql.VarChar, data.STATE || null)
        .input("city", sql.VarChar, data.CITY || null)
        .input("pincode", sql.VarChar, data.PINCODE || null)
        .input("registrationAddress", sql.VarChar, data.REGISTRATION_ADDRESS || null)
        .input("website", sql.VarChar, data.WEBSITE || null)
        .input("updatedBy", sql.VarChar, data.UPDATED_BY || "System");

      if (file) {
        query += `, LOGO_BLOB = @logoBlob, LOGO_MIME_TYPE = @logoMimeType`;
        request.input("logoBlob", sql.VarBinary, file.buffer);
        request.input("logoMimeType", sql.VarChar, file.mimetype);
      }

      query += ` WHERE COMPANY_ID = @companyId`;

      await request.query(query);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  static async deleteCompany(id) {
    try {
      await pool.request()
        .input("companyId", sql.Numeric, id)
        .query("DELETE FROM COMPANY_MASTER WHERE COMPANY_ID = @companyId");
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CompanyModel;
