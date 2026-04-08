const { pool, sql } = require("../config/dbconfig");

class TirePositionModel {
  static async getAll() {
    try {
      const result = await pool.request().query(`
        SELECT *
        FROM TIRE_POSITION_MASTER
        ORDER BY POSITION_CODE
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all tire positions error:", error);
      throw error;
    }
  }

  static async getById(positionId) {
    try {
      const result = await pool
        .request()
        .input("position_id", sql.Numeric(18, 0), positionId)
        .query(`
          SELECT *
          FROM TIRE_POSITION_MASTER
          WHERE POSITION_ID = @position_id
        `);
      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get tire position by ID error:", error);
      throw error;
    }
  }

  static async getNextId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(POSITION_ID), 0) + 1 AS next_id
        FROM TIRE_POSITION_MASTER
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next tire position ID error:", error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const nextId = await this.getNextId();
      await pool
        .request()
        .input("position_id", sql.Numeric(18, 0), nextId)
        .input("position_code", sql.VarChar(20), data.position_code)
        .input("position_name", sql.VarChar(100), data.position_name)
        .input("position_group", sql.VarChar(20), data.position_group || null)
        .input("status", sql.VarChar(20), data.status || "ACTIVE")
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("created_by", sql.VarChar(30), data.created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .query(`
          INSERT INTO TIRE_POSITION_MASTER (
            POSITION_ID,
            POSITION_CODE,
            POSITION_NAME,
            POSITION_GROUP,
            STATUS,
            REMARKS,
            CREATED_BY,
            CREATED_ON
          )
          VALUES (
            @position_id,
            @position_code,
            @position_name,
            @position_group,
            @status,
            @remarks,
            @created_by,
            @created_on
          )
        `);
      return { success: true, position_id: nextId };
    } catch (error) {
      console.error("Create tire position error:", error);
      throw error;
    }
  }

  static async update(positionId, data) {
    try {
      await pool
        .request()
        .input("position_id", sql.Numeric(18, 0), positionId)
        .input("position_code", sql.VarChar(20), data.position_code)
        .input("position_name", sql.VarChar(100), data.position_name)
        .input("position_group", sql.VarChar(20), data.position_group || null)
        .input("status", sql.VarChar(20), data.status || "ACTIVE")
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("updated_by", sql.VarChar(30), data.updated_by || null)
        .input("updated_on", sql.DateTime, new Date())
        .query(`
          UPDATE TIRE_POSITION_MASTER
          SET
            POSITION_CODE = @position_code,
            POSITION_NAME = @position_name,
            POSITION_GROUP = @position_group,
            STATUS = @status,
            REMARKS = @remarks,
            UPDATED_BY = @updated_by,
            UPDATED_ON = @updated_on
          WHERE POSITION_ID = @position_id
        `);
      return { success: true };
    } catch (error) {
      console.error("Update tire position error:", error);
      throw error;
    }
  }

  static async delete(positionId) {
    try {
      await pool
        .request()
        .input("position_id", sql.Numeric(18, 0), positionId)
        .query(`
          DELETE FROM TIRE_POSITION_MASTER
          WHERE POSITION_ID = @position_id
        `);
      return { success: true };
    } catch (error) {
      console.error("Delete tire position error:", error);
      throw error;
    }
  }
}

module.exports = TirePositionModel;
