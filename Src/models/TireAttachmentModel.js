const { pool, sql } = require("../config/dbconfig");

class TireAttachmentModel {
  static async getHistory({ equipment_id, bed_id }) {
    try {
      const request = pool.request();
      if (equipment_id) {
        request.input("equipment_id", sql.Numeric(18, 0), equipment_id);
      }
      if (bed_id) {
        request.input("bed_id", sql.Numeric(18, 0), bed_id);
      }

      const where = [
        equipment_id ? "EQUIPMENT_ID = @equipment_id" : null,
        bed_id ? "BED_ID = @bed_id" : null,
      ]
        .filter(Boolean)
        .join(" AND ");

      const result = await request.query(`
        SELECT *
        FROM TIRE_ATTACHMENT_HISTORY
        ${where ? `WHERE ${where}` : ""}
        ORDER BY ATTACH_DATE DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get tire attachment history error:", error);
      throw error;
    }
  }

  static async getNextId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(TIRE_ATTACH_ID), 0) + 1 AS next_id
        FROM TIRE_ATTACHMENT_HISTORY
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next tire attach ID error:", error);
      throw error;
    }
  }

  static async attach(data) {
    try {
      const activeCheck = await pool
        .request()
        .input("tire_id", sql.Numeric(18, 0), data.tire_id)
        .query(`
          SELECT TOP 1 TIRE_ATTACH_ID
          FROM TIRE_ATTACHMENT_HISTORY
          WHERE TIRE_ID = @tire_id
            AND ISNULL(ATTACH_STATUS, 'ATTACHED') <> 'DETACHED'
        `);

      if (activeCheck.recordset.length > 0) {
        throw new Error("This tire is already attached. Detach it first.");
      }

      const nextId = await this.getNextId();
      await pool
        .request()
        .input("tire_attach_id", sql.Numeric(18, 0), nextId)
        .input("attach_for", sql.VarChar(20), data.attach_for)
        .input("equipment_id", sql.Numeric(18, 0), data.equipment_id || null)
        .input("bed_id", sql.Numeric(18, 0), data.bed_id || null)
        .input("tire_id", sql.Numeric(18, 0), data.tire_id)
        .input("position_id", sql.Numeric(18, 0), data.position_id)
        .input("attach_date", sql.DateTime, new Date())
        .input("km_run", sql.Numeric(18, 2), data.km_run || null)
        .input("attach_status", sql.VarChar(20), "ATTACHED")
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("created_by", sql.VarChar(30), data.created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .query(`
          INSERT INTO TIRE_ATTACHMENT_HISTORY (
            TIRE_ATTACH_ID,
            ATTACH_FOR,
            EQUIPMENT_ID,
            BED_ID,
            TIRE_ID,
            POSITION_ID,
            ATTACH_DATE,
            KM_RUN,
            ATTACH_STATUS,
            REMARKS,
            CREATED_BY,
            CREATED_ON
          )
          VALUES (
            @tire_attach_id,
            @attach_for,
            @equipment_id,
            @bed_id,
            @tire_id,
            @position_id,
            @attach_date,
            @km_run,
            @attach_status,
            @remarks,
            @created_by,
            @created_on
          )
        `);
      return { success: true, tire_attach_id: nextId };
    } catch (error) {
      console.error("Attach tire error:", error);
      throw error;
    }
  }

  static async detach(tireAttachId, data) {
    try {
      await pool
        .request()
        .input("tire_attach_id", sql.Numeric(18, 0), tireAttachId)
        .input("detach_date", sql.DateTime, new Date())
        .input("attach_status", sql.VarChar(20), "DETACHED")
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("updated_by", sql.VarChar(30), data.updated_by || null)
        .input("updated_on", sql.DateTime, new Date())
        .query(`
          UPDATE TIRE_ATTACHMENT_HISTORY
          SET
            DETACH_DATE = @detach_date,
            ATTACH_STATUS = @attach_status,
            REMARKS = COALESCE(@remarks, REMARKS),
            UPDATED_BY = @updated_by,
            UPDATED_ON = @updated_on
          WHERE TIRE_ATTACH_ID = @tire_attach_id
        `);
      return { success: true };
    } catch (error) {
      console.error("Detach tire error:", error);
      throw error;
    }
  }
}

module.exports = TireAttachmentModel;
