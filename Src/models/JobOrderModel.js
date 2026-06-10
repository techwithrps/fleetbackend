const { pool, sql } = require("../config/dbconfig");
const { applyLocationFilterByTable } = require("../utils/queryHelper");

class JobOrderModel {
  static async getAll(status, user = null) {
    try {
      const request = pool.request();
      if (status) {
        request.input("status", sql.VarChar(20), status);
      }
      
      const filter = await applyLocationFilterByTable(request, user, {
        tableName: "JOB_ORDER",
      });
      
      const whereConditions = [];
      if (status) whereConditions.push("STATUS = @status");
      
      let whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "WHERE 1=1";
      whereClause += filter;

      const result = await request.query(`
        SELECT *
        FROM JOB_ORDER
        ${whereClause}
        ORDER BY JO_DATE DESC, JO_ID DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all job orders error:", error);
      throw error;
    }
  }

  static async getById(jobId, user = null) {
    try {
      const request = pool.request();
      const filter = await applyLocationFilterByTable(request, user, {
        tableName: "JOB_ORDER",
      });
      
      const result = await request
        .input("jo_id", sql.Numeric(18, 0), jobId)
        .query(`
          SELECT *
          FROM JOB_ORDER
          WHERE JO_ID = @jo_id ${filter}
        `);
      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get job order by ID error:", error);
      throw error;
    }
  }

  static async getNextId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(JO_ID), 0) + 1 AS next_id
        FROM JOB_ORDER
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next job order ID error:", error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const nextId = await this.getNextId();
      const joNo = data.jo_no || `JO-${nextId}`;
      await pool
        .request()
        .input("jo_id", sql.Numeric(18, 0), nextId)
        .input("jo_no", sql.VarChar(50), joNo)
        .input("jo_date", sql.Date, data.jo_date ? new Date(data.jo_date) : new Date())
        .input("terminal_id", sql.Numeric(18, 0), data.terminal_id || null)
        .input("jo_type", sql.VarChar(50), data.jo_type || null)
        .input("jo_for", sql.VarChar(20), data.jo_for || null)
        .input(
          "jo_validity",
          sql.Date,
          data.jo_validity ? new Date(data.jo_validity) : null
        )
        .input("equipment_id", sql.Numeric(18, 0), data.equipment_id || null)
        .input("bed_id", sql.Numeric(18, 0), data.bed_id || null)
        .input("vehicle_no", sql.VarChar(50), data.vehicle_no || null)
        .input("driver_id", sql.Numeric(18, 0), data.driver_id || null)
        .input("driver_name", sql.VarChar(100), data.driver_name || null)
        .input("driver_contact_no", sql.VarChar(50), data.driver_contact_no || null)
        .input("workshop_location", sql.VarChar(100), data.workshop_location || null)
        .input("survey_by", sql.VarChar(100), data.survey_by || null)
        .input(
          "license_validity",
          sql.Date,
          data.license_validity ? new Date(data.license_validity) : null
        )
        .input("vehicle_type", sql.VarChar(50), data.vehicle_type || null)
        .input(
          "previous_balance",
          sql.Numeric(18, 2),
          data.previous_balance || 0
        )
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("advance_cash", sql.Numeric(18, 2), data.advance_cash || 0)
        .input("advance_oil", sql.Numeric(18, 2), data.advance_oil || 0)
        .input("status", sql.VarChar(20), data.status || "OPEN")
        .input("created_by", sql.VarChar(30), data.created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .query(`
          INSERT INTO JOB_ORDER (
            JO_ID,
            TERMINAL_ID,
            JO_NO,
            JO_DATE,
            JO_TYPE,
            JO_FOR,
            JO_VALIDITY,
            EQUIPMENT_ID,
            BED_ID,
            VEHICLE_NO,
            DRIVER_ID,
            DRIVER_NAME,
            DRIVER_CONTACT_NO,
            WORKSHOP_LOCATION,
            SURVEY_BY,
            LICENSE_VALIDITY,
            VEHICLE_TYPE,
            PREVIOUS_BALANCE,
            REMARKS,
            ADVANCE_CASH,
            ADVANCE_OIL,
            STATUS,
            CREATED_BY,
            CREATED_ON
          )
          VALUES (
            @jo_id,
            @terminal_id,
            @jo_no,
            @jo_date,
            @jo_type,
            @jo_for,
            @jo_validity,
            @equipment_id,
            @bed_id,
            @vehicle_no,
            @driver_id,
            @driver_name,
            @driver_contact_no,
            @workshop_location,
            @survey_by,
            @license_validity,
            @vehicle_type,
            @previous_balance,
            @remarks,
            @advance_cash,
            @advance_oil,
            @status,
            @created_by,
            @created_on
          )
        `);
      return { success: true, jo_id: nextId, jo_no: joNo };
    } catch (error) {
      console.error("Create job order error:", error);
      throw error;
    }
  }

  static async update(jobId, data) {
    try {
      await pool
        .request()
        .input("jo_id", sql.Numeric(18, 0), jobId)
        .input("jo_no", sql.VarChar(50), data.jo_no || null)
        .input("jo_date", sql.Date, data.jo_date ? new Date(data.jo_date) : null)
        .input("terminal_id", sql.Numeric(18, 0), data.terminal_id || null)
        .input("jo_type", sql.VarChar(50), data.jo_type || null)
        .input("jo_for", sql.VarChar(20), data.jo_for || null)
        .input(
          "jo_validity",
          sql.Date,
          data.jo_validity ? new Date(data.jo_validity) : null
        )
        .input("equipment_id", sql.Numeric(18, 0), data.equipment_id || null)
        .input("bed_id", sql.Numeric(18, 0), data.bed_id || null)
        .input("vehicle_no", sql.VarChar(50), data.vehicle_no || null)
        .input("driver_id", sql.Numeric(18, 0), data.driver_id || null)
        .input("driver_name", sql.VarChar(100), data.driver_name || null)
        .input("driver_contact_no", sql.VarChar(50), data.driver_contact_no || null)
        .input("workshop_location", sql.VarChar(100), data.workshop_location || null)
        .input("survey_by", sql.VarChar(100), data.survey_by || null)
        .input(
          "license_validity",
          sql.Date,
          data.license_validity ? new Date(data.license_validity) : null
        )
        .input("vehicle_type", sql.VarChar(50), data.vehicle_type || null)
        .input(
          "previous_balance",
          sql.Numeric(18, 2),
          data.previous_balance || 0
        )
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("advance_cash", sql.Numeric(18, 2), data.advance_cash || 0)
        .input("advance_oil", sql.Numeric(18, 2), data.advance_oil || 0)
        .input("status", sql.VarChar(20), data.status || null)
        .input("updated_by", sql.VarChar(30), data.updated_by || null)
        .input("updated_on", sql.DateTime, new Date())
        .query(`
          UPDATE JOB_ORDER
          SET
            TERMINAL_ID = @terminal_id,
            JO_NO = COALESCE(@jo_no, JO_NO),
            JO_DATE = COALESCE(@jo_date, JO_DATE),
            JO_TYPE = @jo_type,
            JO_FOR = @jo_for,
            JO_VALIDITY = @jo_validity,
            EQUIPMENT_ID = @equipment_id,
            BED_ID = @bed_id,
            VEHICLE_NO = @vehicle_no,
            DRIVER_ID = @driver_id,
            DRIVER_NAME = @driver_name,
            DRIVER_CONTACT_NO = @driver_contact_no,
            WORKSHOP_LOCATION = @workshop_location,
            SURVEY_BY = @survey_by,
            LICENSE_VALIDITY = @license_validity,
            VEHICLE_TYPE = @vehicle_type,
            PREVIOUS_BALANCE = @previous_balance,
            REMARKS = @remarks,
            ADVANCE_CASH = @advance_cash,
            ADVANCE_OIL = @advance_oil,
            STATUS = COALESCE(@status, STATUS),
            UPDATED_BY = @updated_by,
            UPDATED_ON = @updated_on
          WHERE JO_ID = @jo_id
        `);
      return { success: true };
    } catch (error) {
      console.error("Update job order error:", error);
      throw error;
    }
  }
}

module.exports = JobOrderModel;
