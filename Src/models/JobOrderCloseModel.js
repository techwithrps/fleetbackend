const { pool, sql } = require("../config/dbconfig");

class JobOrderCloseModel {
  static async getColumns(tableName) {
    const result = await pool
      .request()
      .input("table_name", sql.VarChar, tableName)
      .query(`
        SELECT UPPER(COLUMN_NAME) AS COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @table_name
      `);
    return new Set((result.recordset || []).map((row) => row.COLUMN_NAME));
  }

  static async getAll(terminalIds = null) {
    try {
      const jobOrderColumns = await this.getColumns("JOB_ORDER");
      const hasTripStartDate = jobOrderColumns.has("TRIP_START_DATE");
      const hasExpectedReturnDate = jobOrderColumns.has("EXPECTED_RETURN_DATE");

      const terminalIdsStr = terminalIds ? (Array.isArray(terminalIds) ? terminalIds.join(',') : String(terminalIds)) : null;
      const result = await pool.request()
        .input("terminal_ids", sql.VarChar, terminalIdsStr)
        .query(`
        SELECT 
          joc.*,
          jo.VEHICLE_NO,
          jo.DRIVER_NAME,
          ${hasTripStartDate ? "jo.TRIP_START_DATE" : "CAST(NULL AS DATETIME) AS TRIP_START_DATE"},
          ${hasExpectedReturnDate ? "jo.EXPECTED_RETURN_DATE" : "CAST(NULL AS DATETIME) AS EXPECTED_RETURN_DATE"},
          jo.ADVANCE_CASH,
          jo.ADVANCE_OIL,
          vm.VENDOR_NAME,
          (SELECT 
            joci.ITEM_NAME + ' (' + CAST(CAST(joci.QUANTITY AS INT) AS VARCHAR) + ')'
           FROM JOB_ORDER_CLOSE_ITEMS joci 
           WHERE joci.JO_CLOSE_ID = joc.JO_CLOSE_ID 
           FOR XML PATH('')) AS ITEMS_SUMMARY
        FROM JOB_ORDER_CLOSE joc
        LEFT JOIN JOB_ORDER jo ON joc.JO_ID = jo.JO_ID
        LEFT JOIN VENDOR_MASTER vm ON joc.VENDOR_ID = vm.VENDOR_ID
        WHERE (@terminal_ids IS NULL OR joc.TERMINAL_ID IN (SELECT CAST(value AS NUMERIC) FROM STRING_SPLIT(@terminal_ids, ',')))
        ORDER BY joc.CREATED_ON DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all job order close error:", error);
      throw error;
    }
  }

  static async getById(closeId, terminalIds = null) {
    try {
      const terminalIdsStr = terminalIds ? (Array.isArray(terminalIds) ? terminalIds.join(',') : String(terminalIds)) : null;
      const result = await pool
        .request()
        .input("jo_close_id", sql.Numeric(18, 0), closeId)
        .input("terminal_ids", sql.VarChar, terminalIdsStr)
        .query(`
          SELECT 
            joc.*,
            jo.VEHICLE_NO,
            jo.DRIVER_NAME,
            vm.VENDOR_NAME
          FROM JOB_ORDER_CLOSE joc
          LEFT JOIN JOB_ORDER jo ON joc.JO_ID = jo.JO_ID
          LEFT JOIN VENDOR_MASTER vm ON joc.VENDOR_ID = vm.VENDOR_ID
          WHERE joc.JO_CLOSE_ID = @jo_close_id
          AND (@terminal_ids IS NULL OR joc.TERMINAL_ID IN (SELECT CAST(value AS NUMERIC) FROM STRING_SPLIT(@terminal_ids, ',')))
        `);
      
      const closure = result.recordset[0];
      if (closure) {
        const items = await pool.request()
          .input("jo_close_id", sql.Numeric(18, 0), closeId)
          .query(`SELECT * FROM JOB_ORDER_CLOSE_ITEMS WHERE JO_CLOSE_ID = @jo_close_id`);
        closure.items = items.recordset;
      }
      
      return closure || null;
    } catch (error) {
      console.error("Get job order close by ID error:", error);
      throw error;
    }
  }

  static async getNextId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(JO_CLOSE_ID), 0) + 1 AS next_id
        FROM JOB_ORDER_CLOSE
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next job order close ID error:", error);
      throw error;
    }
  }

  static async getNextItemId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(JO_CLOSE_ITEM_ID), 0) + 1 AS next_id
        FROM JOB_ORDER_CLOSE_ITEMS
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next job order close item ID error:", error);
      throw error;
    }
  }

  static async create(data) {
    const transaction = new sql.Transaction(pool);

    try {
      const nextId = await this.getNextId();
      await transaction.begin();

      const request = new sql.Request(transaction);

      await request
        .input("jo_close_id", sql.Numeric(18, 0), nextId)
        .input("terminal_id", sql.Numeric(18, 0), data.terminal_id || null)
        .input("jo_id", sql.Numeric(18, 0), data.jo_id)
        .input("jo_no", sql.VarChar(50), data.jo_no || null)
        .input(
          "trip_close_date",
          sql.Date,
          data.trip_close_date ? new Date(data.trip_close_date) : null
        )
        .input("total_advance", sql.Numeric(18, 2), data.total_advance || 0)
        .input("balance_advance", sql.Numeric(18, 2), data.balance_advance || 0)
        .input("jo_close_amount", sql.Numeric(18, 2), data.jo_close_amount || 0)
        .input("advance_refund", sql.VarChar(10), data.advance_refund || null)
        .input("close_remarks", sql.VarChar(500), data.close_remarks || null)
        .input("vendor_id", sql.Numeric(18, 0), data.vendor_id || null)
        .input("status", sql.VarChar(20), data.status || "CLOSED")
        .input("created_by", sql.VarChar(30), data.created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .query(`
          INSERT INTO JOB_ORDER_CLOSE (
            JO_CLOSE_ID,
            TERMINAL_ID,
            JO_ID,
            JO_NO,
            TRIP_CLOSE_DATE,
            TOTAL_ADVANCE,
            BALANCE_ADVANCE,
            JO_CLOSE_AMOUNT,
            ADVANCE_REFUND,
            CLOSE_REMARKS,
            VENDOR_ID,
            STATUS,
            CREATED_BY,
            CREATED_ON
          )
          VALUES (
            @jo_close_id,
            @terminal_id,
            @jo_id,
            @jo_no,
            @trip_close_date,
            @total_advance,
            @balance_advance,
            @jo_close_amount,
            @advance_refund,
            @close_remarks,
            @vendor_id,
            @status,
            @created_by,
            @created_on
          )
        `);

      // Insert Items
      if (data.items && Array.isArray(data.items)) {
        let currentItemId = await this.getNextItemId();
        for (const item of data.items) {
          const itemRequest = new sql.Request(transaction);
          await itemRequest
            .input("jo_close_item_id", sql.Numeric(18, 0), currentItemId++)
            .input("jo_close_id", sql.Numeric(18, 0), nextId)
            .input("item_id", sql.Numeric(18, 0), item.item_id)
            .input("item_name", sql.VarChar(100), item.item_name)
            .input("quantity", sql.Numeric(18, 2), item.quantity || 1)
            .input("unit_price", sql.Numeric(18, 2), item.unit_price || 0)
            .input("total_price", sql.Numeric(18, 2), (item.quantity || 1) * (item.unit_price || 0))
            .query(`
              INSERT INTO JOB_ORDER_CLOSE_ITEMS (
                JO_CLOSE_ITEM_ID, JO_CLOSE_ID, ITEM_ID, ITEM_NAME, 
                QUANTITY, UNIT_PRICE, TOTAL_PRICE
              )
              VALUES (
                @jo_close_item_id, @jo_close_id, @item_id, @item_name, 
                @quantity, @unit_price, @total_price
              )
            `);

          // Update inventory by subtracting used quantity
          const updateStockReq = new sql.Request(transaction);
          await updateStockReq
            .input("item_id", sql.Numeric(18, 0), item.item_id)
            .input("used_qty", sql.Numeric(18, 2), item.quantity || 1)
            .query(`
              UPDATE ITEM_MASTER 
              SET QNTY = ISNULL(QNTY, 0) - @used_qty
              WHERE ITEM_ID = @item_id;
            `);
        }
      }

      await request.query(`
        UPDATE JOB_ORDER
        SET STATUS = 'CLOSED', UPDATED_ON = GETDATE()
        WHERE JO_ID = @jo_id
      `);

      await transaction.commit();

      return { success: true, jo_close_id: nextId };
    } catch (error) {
      await transaction.rollback();
      console.error("Create job order close error:", error);
      throw error;
    }
  }
}

module.exports = JobOrderCloseModel;
