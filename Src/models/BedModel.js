const { pool, sql } = require("../config/dbconfig");

class BedModel {
  static async getAll(terminalIds = null) {
    try {
      const terminalIdsStr = terminalIds ? (Array.isArray(terminalIds) ? terminalIds.join(',') : String(terminalIds)) : null;
      const result = await pool.request()
        .input("terminal_ids", sql.VarChar, terminalIdsStr)
        .query(`
        SELECT *
        FROM BED_MASTER
        WHERE (@terminal_ids IS NULL OR TERMINAL_ID IN (SELECT CAST(value AS NUMERIC) FROM STRING_SPLIT(@terminal_ids, ',')))
        ORDER BY BED_NO
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all beds error:", error);
      throw error;
    }
  }

  static async getById(bedId, terminalIds = null) {
    try {
      const terminalIdsStr = terminalIds ? (Array.isArray(terminalIds) ? terminalIds.join(',') : String(terminalIds)) : null;
      const result = await pool
        .request()
        .input("bed_id", sql.Numeric(18, 0), bedId)
        .input("terminal_ids", sql.VarChar, terminalIdsStr)
        .query(`
          SELECT *
          FROM BED_MASTER
          WHERE BED_ID = @bed_id
          AND (@terminal_ids IS NULL OR TERMINAL_ID IN (SELECT CAST(value AS NUMERIC) FROM STRING_SPLIT(@terminal_ids, ',')))
        `);
      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get bed by ID error:", error);
      throw error;
    }
  }

  static async getNextBedId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(BED_ID), 0) + 1 AS next_id
        FROM BED_MASTER
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next bed ID error:", error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const nextId = await this.getNextBedId();
      await pool
        .request()
        .input("bed_id", sql.Numeric(18, 0), nextId)
        .input("terminal_id", sql.Numeric(18, 0), data.terminal_id || null)
        .input("location_id", sql.Numeric(18, 0), data.terminal_id || null)
        .input("bed_no", sql.VarChar(50), data.bed_no)
        .input("bed_type", sql.VarChar(20), data.bed_type || null)
        .input("bed_size", sql.VarChar(20), data.bed_size || null)
        .input(
          "purchase_date",
          sql.Date,
          data.purchase_date ? new Date(data.purchase_date) : null
        )
        .input("company_name", sql.VarChar(100), data.company_name || null)
        .input("status", sql.VarChar(20), data.status || "ACTIVE")
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("created_by", sql.VarChar(30), data.created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .query(`
          INSERT INTO BED_MASTER (
            BED_ID,
            TERMINAL_ID,
            location_id,
            BED_NO,
            BED_TYPE,
            BED_SIZE,
            PURCHASE_DATE,
            COMPANY_NAME,
            STATUS,
            REMARKS,
            CREATED_BY,
            CREATED_ON
          )
          VALUES (
            @bed_id,
            @terminal_id,
            @location_id,
            @bed_no,
            @bed_type,
            @bed_size,
            @purchase_date,
            @company_name,
            @status,
            @remarks,
            @created_by,
            @created_on
          )
        `);
      return { success: true, bed_id: nextId };
    } catch (error) {
      console.error("Create bed error:", error);
      throw error;
    }
  }

  static async update(bedId, data) {
    try {
      await pool
        .request()
        .input("bed_id", sql.Numeric(18, 0), bedId)
        .input("terminal_id", sql.Numeric(18, 0), data.terminal_id || null)
        .input("bed_no", sql.VarChar(50), data.bed_no)
        .input("bed_type", sql.VarChar(20), data.bed_type || null)
        .input("bed_size", sql.VarChar(20), data.bed_size || null)
        .input(
          "purchase_date",
          sql.Date,
          data.purchase_date ? new Date(data.purchase_date) : null
        )
        .input("company_name", sql.VarChar(100), data.company_name || null)
        .input("status", sql.VarChar(20), data.status || "ACTIVE")
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("updated_by", sql.VarChar(30), data.updated_by || null)
        .input("updated_on", sql.DateTime, new Date())
        .query(`
          UPDATE BED_MASTER
          SET
            TERMINAL_ID = @terminal_id,
            BED_NO = @bed_no,
            BED_TYPE = @bed_type,
            BED_SIZE = @bed_size,
            PURCHASE_DATE = @purchase_date,
            COMPANY_NAME = @company_name,
            STATUS = @status,
            REMARKS = @remarks,
            UPDATED_BY = @updated_by,
            UPDATED_ON = @updated_on
          WHERE BED_ID = @bed_id
        `);
      return { success: true };
    } catch (error) {
      console.error("Update bed error:", error);
      throw error;
    }
  }

  static async delete(bedId) {
    try {
      await pool
        .request()
        .input("bed_id", sql.Numeric(18, 0), bedId)
        .query(`
          DELETE FROM BED_MASTER
          WHERE BED_ID = @bed_id
        `);
      return { success: true };
    } catch (error) {
      console.error("Delete bed error:", error);
      throw error;
    }
  }
}

module.exports = BedModel;
