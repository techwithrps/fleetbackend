const { pool, sql } = require("../config/dbconfig");
const { getLocationColumnForTable } = require("../utils/queryHelper");

class ItemMasterModel {
  static async getAll(terminalIds = null) {
    try {
      const locationColumn = await getLocationColumnForTable("ITEM_MASTER");
      const terminalIdsStr = terminalIds ? (Array.isArray(terminalIds) ? terminalIds.join(',') : String(terminalIds)) : null;
      const filterClause = locationColumn
        ? `(@terminal_ids IS NULL OR ${locationColumn} IN (SELECT CAST(value AS NUMERIC) FROM STRING_SPLIT(@terminal_ids, ',')))`
        : "1=1";
      const result = await pool.request()
        .input("terminal_ids", sql.VarChar, terminalIdsStr)
        .query(`
        SELECT * FROM ITEM_MASTER
        WHERE ${filterClause}
        ORDER BY ITEM_NAME
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all items error:", error);
      throw error;
    }
  }

  static async getById(itemId, terminalIds = null) {
    try {
      const locationColumn = await getLocationColumnForTable("ITEM_MASTER");
      const terminalIdsStr = terminalIds ? (Array.isArray(terminalIds) ? terminalIds.join(',') : String(terminalIds)) : null;
      const filterClause = locationColumn
        ? `(@terminal_ids IS NULL OR ${locationColumn} IN (SELECT CAST(value AS NUMERIC) FROM STRING_SPLIT(@terminal_ids, ',')))`
        : "1=1";
      const result = await pool.request()
        .input("item_id", sql.Numeric(18, 0), itemId)
        .input("terminal_ids", sql.VarChar, terminalIdsStr)
        .query(`
          SELECT * FROM ITEM_MASTER
          WHERE ITEM_ID = @item_id
          AND ${filterClause}
        `);
      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get item by ID error:", error);
      throw error;
    }
  }

  static async getNextId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(ITEM_ID), 0) + 1 AS next_id
        FROM ITEM_MASTER
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next item ID error:", error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const nextId = await this.getNextId();
      const {
        item_code,
        item_name,
        item_group,
        unit,
        unit_price,
        status,
        remarks,
        created_by,
        terminal_id
      } = data;

      await pool.request()
        .input("item_id", sql.Numeric(18, 0), nextId)
        .input("item_code", sql.VarChar(50), item_code)
        .input("item_name", sql.VarChar(100), item_name)
        .input("item_group", sql.VarChar(50), item_group || null)
        .input("unit", sql.VarChar(20), unit || null)
        .input("unit_price", sql.Numeric(18, 2), unit_price || 0)
        .input("status", sql.VarChar(20), status || 'ACTIVE')
        .input("remarks", sql.VarChar(500), remarks || null)
        .input("created_by", sql.VarChar(30), created_by || null)
        .input("terminal_id", sql.Numeric(18, 0), terminal_id || null)
        .query(`
          INSERT INTO ITEM_MASTER (
            ITEM_ID, ITEM_CODE, ITEM_NAME, ITEM_GROUP, UNIT, 
            UNIT_PRICE, STATUS, REMARKS, CREATED_BY, CREATED_ON, TERMINAL_ID
          ) 
          VALUES (
            @item_id, @item_code, @item_name, @item_group, @unit, 
            @unit_price, @status, @remarks, @created_by, GETDATE(), @terminal_id
          )
        `);

      return { success: true, item_id: nextId };
    } catch (error) {
      console.error("Create item error:", error);
      throw error;
    }
  }

  static async update(itemId, data) {
    try {
      const {
        item_code,
        item_name,
        item_group,
        unit,
        unit_price,
        status,
        remarks,
        updated_by,
        terminal_id
      } = data;

      await pool.request()
        .input("item_id", sql.Numeric(18, 0), itemId)
        .input("item_code", sql.VarChar(50), item_code)
        .input("item_name", sql.VarChar(100), item_name)
        .input("item_group", sql.VarChar(50), item_group || null)
        .input("unit", sql.VarChar(20), unit || null)
        .input("unit_price", sql.Numeric(18, 2), unit_price || 0)
        .input("status", sql.VarChar(20), status || 'ACTIVE')
        .input("remarks", sql.VarChar(500), remarks || null)
        .input("updated_by", sql.VarChar(30), updated_by || null)
        .input("terminal_id", sql.Numeric(18, 0), terminal_id || null)
        .query(`
          UPDATE ITEM_MASTER SET
            ITEM_CODE = @item_code,
            ITEM_NAME = @item_name,
            ITEM_GROUP = @item_group,
            UNIT = @unit,
            UNIT_PRICE = @unit_price,
            STATUS = @status,
            REMARKS = @remarks,
            UPDATED_BY = @updated_by,
            UPDATED_ON = GETDATE(),
            TERMINAL_ID = @terminal_id
          WHERE ITEM_ID = @item_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Update item error:", error);
      throw error;
    }
  }

  static async delete(itemId) {
    try {
      await pool.request()
        .input("item_id", sql.Numeric(18, 0), itemId)
        .query(`DELETE FROM ITEM_MASTER WHERE ITEM_ID = @item_id`);
      return { success: true };
    } catch (error) {
      console.error("Delete item error:", error);
      throw error;
    }
  }
}

module.exports = ItemMasterModel;
