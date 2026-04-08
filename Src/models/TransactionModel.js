const { pool, sql } = require("../config/dbconfig");

class TransactionModel {
  // Create a new transaction
  static async createTransaction(transactionData) {
    try {
      const {
        request_id,
        transporter_id,
        gr_no,
        transporter_name,
        vehicle_number,
        driver_name,
        pickup_location,
        delivery_location,
        consigner,
        consignee,
        service_type,
        requested_price,
        transporter_charge,
        gst_percentage,
        total_paid,
        last_payment_amount,
        last_payment_date,
        last_payment_mode,
        remarks
      } = transactionData;

      const result = await pool
        .request()
        .input("request_id", sql.Int, request_id)
        .input("transporter_id", sql.Int, transporter_id)
        .input("gr_no", sql.NVarChar(100), gr_no)
        .input("transporter_name", sql.VarChar(255), transporter_name)
        .input("vehicle_number", sql.VarChar(50), vehicle_number)
        .input("driver_name", sql.VarChar(255), driver_name)
        .input("pickup_location", sql.NVarChar(500), pickup_location)
        .input("delivery_location", sql.NVarChar(500), delivery_location)
        .input("consigner", sql.VarChar(100), consigner)
        .input("consignee", sql.VarChar(100), consignee)
        .input("service_type", sql.NVarChar(sql.MAX), service_type)
        .input("requested_price", sql.Decimal(10, 2), requested_price)
        .input("transporter_charge", sql.Decimal(10, 2), transporter_charge)
        .input("gst_percentage", sql.Decimal(5, 2), gst_percentage || 18.00)
        .input("total_paid", sql.Decimal(10, 2), total_paid || 0.00)
        .input("last_payment_amount", sql.Decimal(10, 2), last_payment_amount || null)
        .input("last_payment_date", sql.DateTime, last_payment_date ? new Date(last_payment_date) : null)
        .input("last_payment_mode", sql.VarChar(50), last_payment_mode || null)
        .input("remarks", sql.NVarChar(500), remarks || null)
        .query(`
          INSERT INTO transport_transaction_master (
            request_id, transporter_id, gr_no, transporter_name, vehicle_number,
            driver_name, pickup_location, delivery_location, consigner, consignee,
            service_type, requested_price, transporter_charge, gst_percentage,
            total_paid, last_payment_amount, last_payment_date, last_payment_mode, remarks
          )
          OUTPUT INSERTED.*
          VALUES (
            @request_id, @transporter_id, @gr_no, @transporter_name, @vehicle_number,
            @driver_name, @pickup_location, @delivery_location, @consigner, @consignee,
            @service_type, @requested_price, @transporter_charge, @gst_percentage,
            @total_paid, @last_payment_amount, @last_payment_date, @last_payment_mode, @remarks
          )
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Create transaction error:", error);
      throw error;
    }
  }

  // Get all transactions
  static async getAllTransactions() {
    try {
      const result = await pool.request().query(`
        SELECT ttm.*, tr.status as request_status, u.name as customer_name
        FROM transport_transaction_master ttm
        INNER JOIN transport_requests tr ON ttm.request_id = tr.id
        INNER JOIN users u ON tr.customer_id = u.id
        ORDER BY ttm.created_at DESC
      `);

      return result.recordset;
    } catch (error) {
      console.error("Get all transactions error:", error);
      throw error;
    }
  }

  // Get transaction by ID
  static async getTransactionById(id) {
    try {
      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
          SELECT ttm.*, tr.status as request_status, u.name as customer_name
          FROM transport_transaction_master ttm
          INNER JOIN transport_requests tr ON ttm.request_id = tr.id
          INNER JOIN users u ON tr.customer_id = u.id
          WHERE ttm.id = @id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Get transaction by ID error:", error);
      throw error;
    }
  }

  // Get transactions by request ID
  static async getTransactionsByRequestId(requestId) {
    try {
      const result = await pool
        .request()
        .input("requestId", sql.Int, requestId)
        .query(`
          SELECT * FROM transport_transaction_master
          WHERE request_id = @requestId
          ORDER BY created_at DESC
        `);

      return result.recordset;
    } catch (error) {
      console.error("Get transactions by request ID error:", error);
      throw error;
    }
  }

  // Update transaction payment
  // Update transaction payment
  static async updatePayment(id, paymentData) {
    try {
      const {
        payment_amount,
        payment_mode,
        payment_date,
        remarks
      } = paymentData;
  
      // First get the current transaction to calculate new total_paid
      const currentTransaction = await pool
        .request()
        .input("id", sql.Int, id)
        .query("SELECT total_paid FROM transport_transaction_master WHERE id = @id");
  
      if (currentTransaction.recordset.length === 0) {
        throw new Error("Transaction not found");
      }
  
      const currentTotalPaid = parseFloat(currentTransaction.recordset[0].total_paid);
      const newTotalPaid = currentTotalPaid + parseFloat(payment_amount);
  
      // Update the transaction with new payment info
      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("total_paid", sql.Decimal(10, 2), newTotalPaid)
        .input("last_payment_amount", sql.Decimal(10, 2), payment_amount)
        .input("last_payment_date", sql.DateTime, new Date(payment_date || Date.now()))
        .input("last_payment_mode", sql.VarChar(50), payment_mode)
        .input("remarks", sql.NVarChar(500), remarks || null)
        .query(`
          UPDATE transport_transaction_master
          SET 
            total_paid = @total_paid,
            last_payment_amount = @last_payment_amount,
            last_payment_date = @last_payment_date,
            last_payment_mode = @last_payment_mode,
            remarks = @remarks,
            updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);
  
      return result.recordset[0];
    } catch (error) {
      console.error("Update transaction payment error:", error);
      throw error;
    }
  }

  // Delete transaction
  static async deleteTransaction(id) {
    try {
      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
          DELETE FROM transport_transaction_master
          OUTPUT DELETED.*
          WHERE id = @id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Delete transaction error:", error);
      throw error;
    }
  }
}

module.exports = TransactionModel;