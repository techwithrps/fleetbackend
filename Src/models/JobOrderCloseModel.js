const { pool, sql } = require("../config/dbconfig");

class JobOrderCloseModel {
  static async getAll() {
    try {
      const result = await pool.request().query(`
        SELECT *
        FROM JOB_ORDER_CLOSE
        ORDER BY CREATED_ON DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all job order close error:", error);
      throw error;
    }
  }

  static async getById(closeId) {
    try {
      const result = await pool
        .request()
        .input("jo_close_id", sql.Numeric(18, 0), closeId)
        .query(`
          SELECT *
          FROM JOB_ORDER_CLOSE
          WHERE JO_CLOSE_ID = @jo_close_id
        `);
      return result.recordset[0] || null;
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

  static async create(data) {
    const transaction = new sql.Transaction(pool);

    try {
      const nextId = await this.getNextId();
      await transaction.begin();

      const request = new sql.Request(transaction);

      await request
        .input("jo_close_id", sql.Numeric(18, 0), nextId)
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
        .input("status", sql.VarChar(20), data.status || "CLOSED")
        .input("created_by", sql.VarChar(30), data.created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .query(`
          INSERT INTO JOB_ORDER_CLOSE (
            JO_CLOSE_ID,
            JO_ID,
            JO_NO,
            TRIP_CLOSE_DATE,
            TOTAL_ADVANCE,
            BALANCE_ADVANCE,
            JO_CLOSE_AMOUNT,
            ADVANCE_REFUND,
            CLOSE_REMARKS,
            STATUS,
            CREATED_BY,
            CREATED_ON
          )
          VALUES (
            @jo_close_id,
            @jo_id,
            @jo_no,
            @trip_close_date,
            @total_advance,
            @balance_advance,
            @jo_close_amount,
            @advance_refund,
            @close_remarks,
            @status,
            @created_by,
            @created_on
          )
        `);

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
