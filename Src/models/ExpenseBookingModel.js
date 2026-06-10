const { pool, sql } = require("../config/dbconfig");

class ExpenseBookingModel {
  static async create(data, document = null) {
    let transaction;
    try {
      const dbPool = await pool;
      transaction = dbPool.transaction();
      await transaction.begin();

      // Get next EXPENSE_ID
      const maxIdResult = await transaction.request().query(`
        SELECT ISNULL(MAX(EXPENSE_ID), 0) + 1 AS next_id FROM EXPENSE_BOOKING
      `);
      const nextExpenseId = maxIdResult.recordset[0].next_id;

      const request = transaction.request()
        .input("expense_id", sql.Numeric(18, 0), nextExpenseId)
        .input("voucher_no", sql.VarChar(50), data.voucherNumber)
        .input("voucher_date", sql.Date, data.voucherDate || null)
        .input("equipment_no", sql.VarChar(50), data.vehicleNumber || null)
        .input("last_odometer", sql.Numeric(18, 2), data.lastOdometerReading || 0)
        .input("odometer", sql.Numeric(18, 2), data.odometerReading || 0)
        .input("vendor_type", sql.VarChar(20), data.vendorType || null)
        .input("vendor_id", sql.Numeric(18, 0), data.creditorVendor ? parseInt(data.creditorVendor) : null)
        .input("remarks", sql.VarChar(500), data.remarks || null)
        .input("bill_no", sql.VarChar(50), data.billNo || null)
        .input("bill_date", sql.Date, data.billDate || null)
        .input("created_by", sql.VarChar(30), data.createdBy || "SYSTEM")
        .input("document_data", sql.VarBinary(sql.MAX), document?.buffer || null)
        .input("document_name", sql.VarChar(255), document?.name || null)
        .input("document_type", sql.VarChar(100), document?.type || null);

      await request.query(`
        INSERT INTO EXPENSE_BOOKING (
          EXPENSE_ID, VOUCHER_NO, VOUCHER_DATE, EQUIPMENT_NO, LAST_ODOMETER, ODOMETER,
          VENDOR_TYPE, VENDOR_ID, REMARKS, BILL_NO, BILL_DATE, 
          DOCUMENT_DATA, DOCUMENT_NAME, DOCUMENT_TYPE, CREATED_BY, CREATED_ON
        ) VALUES (
          @expense_id, @voucher_no, @voucher_date, @equipment_no, @last_odometer, @odometer,
          @vendor_type, @vendor_id, @remarks, @bill_no, @bill_date,
          @document_data, @document_name, @document_type, @created_by, GETDATE()
        )
      `);

      // Insert details (rows)
      if (data.expenseRows && Array.isArray(data.expenseRows)) {
        for (const row of data.expenseRows) {
            // Get next DETAIL_ID
            const maxDetailResult = await transaction.request().query(`
                SELECT ISNULL(MAX(DETAIL_ID), 0) + 1 AS next_detail_id FROM EXPENSE_BOOKING_DETAILS
            `);
            const nextDetailId = maxDetailResult.recordset[0].next_detail_id;

            await transaction.request()
                .input("detail_id", sql.Numeric(18, 0), nextDetailId)
                .input("expense_id", sql.Numeric(18, 0), nextExpenseId)
                .input("expense_head", sql.VarChar(100), row.expenseHead || null)
                .input("expense_date", sql.Date, row.date || null)
                .input("uom", sql.VarChar(20), row.uom || null)
                .input("qnty", sql.Numeric(18, 2), row.qnty || 0)
                .input("base_amount", sql.Numeric(18, 2), row.baseAmount || 0)
                .input("gst_amount", sql.Numeric(18, 2), row.gstAmount || 0)
                .input("total_amount", sql.Numeric(18, 2), row.totalAmount || 0)
                .input("item_id", sql.Numeric(18, 0), row.expenseHead ? parseInt(row.expenseHead) : null)
                .query(`
                INSERT INTO EXPENSE_BOOKING_DETAILS (
                    DETAIL_ID, EXPENSE_ID, EXPENSE_HEAD, EXPENSE_DATE, UOM,
                    QNTY, BASE_AMOUNT, GST_AMOUNT, TOTAL_AMOUNT, ITEM_ID
                ) VALUES (
                    @detail_id, @expense_id, @expense_head, @expense_date, @uom,
                    @qnty, @base_amount, @gst_amount, @total_amount, @item_id
                )
            `);

            // If an item was selected, increment the inventory
            if (row.expenseHead && !isNaN(parseInt(row.expenseHead)) && (row.qnty || 0) > 0) {
                await transaction.request()
                    .input("item_id", sql.Numeric(18, 0), parseInt(row.expenseHead))
                    .input("qty", sql.Numeric(18, 2), row.qnty || 0)
                    .query(`
                        UPDATE ITEM_MASTER
                        SET QNTY = ISNULL(QNTY, 0) + @qty
                        WHERE ITEM_ID = @item_id
                    `);
            }
        }
      }

      await transaction.commit();
      return { success: true, expense_id: nextExpenseId };
    } catch (error) {
      if (transaction) {
          try {
              await transaction.rollback();
          } catch (rollbackErr) {
              console.error("Rollback error:", rollbackErr);
          }
      }
      console.error("Create expense booking error:", error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const result = await pool.request().query(`
        SELECT 
          EXPENSE_ID, VOUCHER_NO, VOUCHER_DATE, EQUIPMENT_NO, VENDOR_TYPE, VENDOR_ID, TOTAL_AMOUNT = (
            SELECT SUM(TOTAL_AMOUNT) FROM EXPENSE_BOOKING_DETAILS EBD WHERE EBD.EXPENSE_ID = EB.EXPENSE_ID
          )
        FROM EXPENSE_BOOKING EB
        ORDER BY CREATED_ON DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all expense bookings error:", error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const request = pool.request();
      request.input("id", sql.Numeric(18, 0), id);
      
      const masterResult = await request.query(`
        SELECT * FROM EXPENSE_BOOKING WHERE EXPENSE_ID = @id
      `);
      
      const detailsResult = await request.query(`
        SELECT EBD.*, IM.ITEM_CODE, IM.ITEM_NAME 
        FROM EXPENSE_BOOKING_DETAILS EBD
        LEFT JOIN ITEM_MASTER IM ON EBD.ITEM_ID = IM.ITEM_ID
        WHERE EBD.EXPENSE_ID = @id
      `);

      if (masterResult.recordset.length === 0) {
        return null;
      }

      return {
        ...masterResult.recordset[0],
        details: detailsResult.recordset
      };
    } catch (error) {
      console.error("Get expense booking by id error:", error);
      throw error;
    }
  }
}

module.exports = ExpenseBookingModel;
