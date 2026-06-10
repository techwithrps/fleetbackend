const { pool, sql } = require("../config/dbconfig");

class BedAttachmentModel {
  static async getHistory({ equipment_id, bed_id }, terminalIds = null) {
    try {
      const request = pool.request();
      if (equipment_id) {
        request.input("equipment_id", sql.Numeric(18, 0), equipment_id);
      }
      if (bed_id) {
        request.input("bed_id", sql.Numeric(18, 0), bed_id);
      }

      const whereArgs = [];
      if (equipment_id) whereArgs.push("EQUIPMENT_ID = @equipment_id");
      if (bed_id) whereArgs.push("BED_ID = @bed_id");

      if (terminalIds) {
        const terminalIdsStr = Array.isArray(terminalIds) ? terminalIds.join(',') : terminalIds;
        request.input("terminal_ids", sql.VarChar, terminalIdsStr);
        whereArgs.push("(@terminal_ids IS NULL OR TERMINAL_ID IN (SELECT CAST(value AS NUMERIC) FROM STRING_SPLIT(@terminal_ids, ',')))");
      }

      const where = whereArgs.join(" AND ");

      const result = await request.query(`
        SELECT *
        FROM BED_ATTACHMENT_HISTORY
        ${where ? `WHERE ${where}` : ""}
        ORDER BY ATTACH_DATE DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get bed attachment history error:", error);
      throw error;
    }
  }

  static async getNextId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(BED_ATTACH_ID), 0) + 1 AS next_id
        FROM BED_ATTACHMENT_HISTORY
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next bed attach ID error:", error);
      throw error;
    }
  }

  static async attach(data) {
    try {
      const equipmentCheck = await pool
        .request()
        .input("equipment_id", sql.Numeric(18, 0), data.equipment_id)
        .query(`
          SELECT TOP 1 BED_ATTACH_ID
          FROM BED_ATTACHMENT_HISTORY
          WHERE EQUIPMENT_ID = @equipment_id
            AND ISNULL(ATTACH_STATUS, 'ATTACHED') <> 'DETACHED'
        `);

      if (equipmentCheck.recordset.length > 0) {
        throw new Error(
          "This vehicle already has an attached bed. Detach it first."
        );
      }

      const activeCheck = await pool
        .request()
        .input("bed_id", sql.Numeric(18, 0), data.bed_id)
        .query(`
          SELECT TOP 1 BED_ATTACH_ID
          FROM BED_ATTACHMENT_HISTORY
          WHERE BED_ID = @bed_id
            AND ISNULL(ATTACH_STATUS, 'ATTACHED') <> 'DETACHED'
        `);

      if (activeCheck.recordset.length > 0) {
        throw new Error("This bed is already attached. Detach it first.");
      }

      const nextId = await this.getNextId();
      await pool
        .request()
        .input("bed_attach_id", sql.Numeric(18, 0), nextId)
        .input("terminal_id", sql.Numeric(18, 0), data.terminal_id || null)
        .input("equipment_id", sql.Numeric(18, 0), data.equipment_id)
        .input("bed_id", sql.Numeric(18, 0), data.bed_id)
        .input("attach_date", sql.DateTime, new Date())
        .input("attach_status", sql.VarChar(20), "ATTACHED")
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("created_by", sql.VarChar(30), data.created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .query(`
          INSERT INTO BED_ATTACHMENT_HISTORY (
            BED_ATTACH_ID,
            TERMINAL_ID,
            EQUIPMENT_ID,
            BED_ID,
            ATTACH_DATE,
            ATTACH_STATUS,
            REMARKS,
            CREATED_BY,
            CREATED_ON
          )
          VALUES (
            @bed_attach_id,
            @terminal_id,
            @equipment_id,
            @bed_id,
            @attach_date,
            @attach_status,
            @remarks,
            @created_by,
            @created_on
          )
        `);
      return { success: true, bed_attach_id: nextId };
    } catch (error) {
      console.error("Attach bed error:", error);
      throw error;
    }
  }

  static async detach(bedAttachId, data) {
    try {
      await pool
        .request()
        .input("bed_attach_id", sql.Numeric(18, 0), bedAttachId)
        .input("detach_date", sql.DateTime, new Date())
        .input("attach_status", sql.VarChar(20), "DETACHED")
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("updated_by", sql.VarChar(30), data.updated_by || null)
        .input("updated_on", sql.DateTime, new Date())
        .query(`
          UPDATE BED_ATTACHMENT_HISTORY
          SET
            DETACH_DATE = @detach_date,
            ATTACH_STATUS = @attach_status,
            REMARKS = COALESCE(@remarks, REMARKS),
            UPDATED_BY = @updated_by,
            UPDATED_ON = @updated_on
          WHERE BED_ATTACH_ID = @bed_attach_id
        `);
      return { success: true };
    } catch (error) {
      console.error("Detach bed error:", error);
      throw error;
    }
  }
}

module.exports = BedAttachmentModel;
