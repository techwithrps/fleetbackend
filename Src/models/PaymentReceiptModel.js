const { pool, sql } = require("../config/dbconfig");

class PaymentReceiptModel {
  // Create a new payment receipt record
  static async createPaymentReceipt(paymentData) {
    try {
      const {
        request_id,
        invoice_no,
        invoice_date,
        invoice_amount,
        received_amount,
        balance,
        payment_status,
        voucher_no,
        voucher_date,
        payment_mode,
        payment_date,
        customer_id,
        remarks,
      } = paymentData;

      const result = await pool
        .request()
        .input("request_id", sql.Int, request_id)
        .input("invoice_no", sql.NVarChar(100), invoice_no)
        .input("invoice_date", sql.DateTime, new Date(invoice_date))
        .input("invoice_amount", sql.Decimal(12, 2), invoice_amount)
        .input("received_amount", sql.Decimal(12, 2), received_amount || 0)
        .input("balance", sql.Decimal(12, 2), balance)
        .input("payment_status", sql.VarChar(20), payment_status)
        .input("voucher_no", sql.NVarChar(100), voucher_no || null)
        .input(
          "voucher_date",
          sql.DateTime,
          voucher_date ? new Date(voucher_date) : null
        )
        .input("payment_mode", sql.VarChar(50), payment_mode || null)
        .input(
          "payment_date",
          sql.DateTime,
          payment_date ? new Date(payment_date) : null
        )
        .input("customer_id", sql.Int, customer_id)
        .input("remarks", sql.NVarChar(500), remarks || null).query(`
          INSERT INTO payment_receipts (
            request_id, invoice_no, invoice_date, invoice_amount,
            received_amount, balance, payment_status, voucher_no,
            voucher_date, payment_mode, payment_date, customer_id, remarks
          )
          OUTPUT INSERTED.*
          VALUES (
            @request_id, @invoice_no, @invoice_date, @invoice_amount,
            @received_amount, @balance, @payment_status, @voucher_no,
            @voucher_date, @payment_mode, @payment_date, @customer_id, @remarks
          )
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Create payment receipt error:", error);
      throw error;
    }
  }

  // Get all payment receipts with optional filters
  static async getAllPaymentReceipts(filters = {}) {
    try {
      let query = `
        SELECT pr.*, tr.consigner, tr.consignee, u.name as customer_name,
               pr.invoice_date, pr.voucher_date, pr.payment_date
        FROM payment_receipts pr
        INNER JOIN transport_requests tr ON pr.request_id = tr.id
        INNER JOIN users u ON pr.customer_id = u.id
        WHERE 1=1
      `;

      const request = pool.request();

      // Apply filters
      if (filters.invoice_no) {
        query += " AND pr.invoice_no LIKE @invoice_no";
        request.input(
          "invoice_no",
          sql.NVarChar(100),
          `%${filters.invoice_no}%`
        );
      }

      if (filters.payment_status) {
        query += " AND pr.payment_status = @payment_status";
        request.input(
          "payment_status",
          sql.VarChar(20),
          filters.payment_status
        );
      }

      if (filters.from_date) {
        query += " AND pr.invoice_date >= @from_date";
        request.input("from_date", sql.DateTime, new Date(filters.from_date));
      }

      if (filters.to_date) {
        query += " AND pr.invoice_date <= @to_date";
        request.input("to_date", sql.DateTime, new Date(filters.to_date));
      }

      if (filters.customer_id) {
        query += " AND pr.customer_id = @customer_id";
        request.input("customer_id", sql.Int, filters.customer_id);
      }

      // New filters
      if (filters.consigner) {
        query += " AND tr.consigner LIKE @consigner";
        request.input("consigner", sql.NVarChar(255), `%${filters.consigner}%`);
      }

      if (filters.request_id) {
        query += " AND pr.request_id = @request_id";
        request.input("request_id", sql.Int, parseInt(filters.request_id));
      }

      if (filters.created_from_date) {
        query += " AND pr.created_at >= @created_from_date";
        request.input(
          "created_from_date",
          sql.DateTime,
          new Date(filters.created_from_date)
        );
      }

      if (filters.created_to_date) {
        query += " AND pr.created_at <= @created_to_date";
        request.input(
          "created_to_date",
          sql.DateTime,
          new Date(filters.created_to_date)
        );
      }

      query += " ORDER BY pr.invoice_date DESC, pr.created_at DESC";

      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      console.error("Get all payment receipts error:", error);
      throw error;
    }
  }

  // Get payment receipt by ID
  static async getPaymentReceiptById(id) {
    try {
      const result = await pool.request().input("id", sql.Int, id).query(`
          SELECT pr.*, tr.consigner, tr.consignee, u.name as customer_name
          FROM payment_receipts pr
          INNER JOIN transport_requests tr ON pr.request_id = tr.id
          INNER JOIN users u ON pr.customer_id = u.id
          WHERE pr.id = @id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Get payment receipt by ID error:", error);
      throw error;
    }
  }

  // Get payment receipts by invoice number
  static async getPaymentReceiptsByInvoice(invoice_no) {
    try {
      const result = await pool
        .request()
        .input("invoice_no", sql.NVarChar(100), invoice_no).query(`
          SELECT pr.*, tr.consigner, tr.consignee, u.name as customer_name
          FROM payment_receipts pr
          INNER JOIN transport_requests tr ON pr.request_id = tr.id
          INNER JOIN users u ON pr.customer_id = u.id
          WHERE pr.invoice_no = @invoice_no
          ORDER BY pr.created_at DESC
        `);

      return result.recordset;
    } catch (error) {
      console.error("Get payment receipts by invoice error:", error);
      throw error;
    }
  }

  // Update payment receipt (add payment)
  static async updatePayment(id, paymentData) {
    try {
      const {
        received_amount,
        voucher_no,
        voucher_date,
        payment_mode,
        payment_date,
        remarks,
      } = paymentData;

      // Get current receipt
      const currentReceipt = await this.getPaymentReceiptById(id);
      if (!currentReceipt) {
        throw new Error("Payment receipt not found");
      }

      const newReceivedAmount =
        parseFloat(currentReceipt.received_amount) +
        parseFloat(received_amount);
      const newBalance =
        parseFloat(currentReceipt.invoice_amount) - newReceivedAmount;

      // Determine new payment status
      let newPaymentStatus = "Pending";
      if (newBalance === 0) {
        newPaymentStatus = "Paid";
      } else if (
        newBalance < parseFloat(currentReceipt.invoice_amount) &&
        newBalance > 0
      ) {
        newPaymentStatus = "Partial";
      }

      // Create payment transaction record (if table exists)
      try {
        await pool
          .request()
          .input("receipt_id", sql.Int, id)
          .input("payment_amount", sql.Decimal(12, 2), received_amount)
          .input("voucher_no", sql.NVarChar(100), voucher_no || null)
          .input(
            "voucher_date",
            sql.DateTime,
            voucher_date ? new Date(voucher_date) : new Date()
          )
          .input("payment_mode", sql.VarChar(50), payment_mode || null)
          .input(
            "payment_date",
            sql.DateTime,
            payment_date ? new Date(payment_date) : new Date()
          )
          .input("remarks", sql.NVarChar(500), remarks || null).query(`
            INSERT INTO payment_transactions (
              receipt_id, payment_amount, voucher_no, voucher_date,
              payment_mode, payment_date, remarks
            )
            VALUES (
              @receipt_id, @payment_amount, @voucher_no, @voucher_date,
              @payment_mode, @payment_date, @remarks
            )
          `);
      } catch (transactionError) {
        console.log(
          "Payment transaction table not ready, continuing without transaction log..."
        );
      }

      // Update the receipt
      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("received_amount", sql.Decimal(12, 2), newReceivedAmount)
        .input("balance", sql.Decimal(12, 2), newBalance)
        .input("payment_status", sql.VarChar(20), newPaymentStatus)
        .input("voucher_no", sql.NVarChar(100), voucher_no)
        .input(
          "voucher_date",
          sql.DateTime,
          voucher_date ? new Date(voucher_date) : new Date()
        )
        .input("payment_mode", sql.VarChar(50), payment_mode)
        .input(
          "payment_date",
          sql.DateTime,
          payment_date ? new Date(payment_date) : new Date()
        )
        .input("remarks", sql.NVarChar(500), remarks).query(`
          UPDATE payment_receipts
          SET
            received_amount = @received_amount,
            balance = @balance,
            payment_status = @payment_status,
            voucher_no = @voucher_no,
            voucher_date = @voucher_date,
            payment_mode = @payment_mode,
            payment_date = @payment_date,
            remarks = @remarks,
            updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Update payment error:", error);
      throw error;
    }
  }

  // Get payment history for a receipt
  static async getPaymentHistory(receiptId) {
    try {
      // Check if payment_transactions table exists
      const tableCheck = await pool.request().query(`
        SELECT OBJECT_ID('dbo.payment_transactions', 'U') as tableId
      `);

      if (!tableCheck.recordset[0].tableId) {
        // Table doesn't exist, return empty array
        console.log(
          "Payment transactions table not found, returning empty history"
        );
        return [];
      }

      const result = await pool
        .request()
        .input("receipt_id", sql.Int, receiptId).query(`
        SELECT pt.*
        FROM payment_transactions pt
        WHERE pt.receipt_id = @receipt_id
        ORDER BY pt.payment_date DESC, pt.created_at DESC
      `);

      return result.recordset;
    } catch (error) {
      console.error("Get payment history error:", error);
      // Return empty array on any error to avoid breaking the UI
      return [];
    }
  }

  // Delete payment receipt
  static async deletePaymentReceipt(id) {
    try {
      const result = await pool.request().input("id", sql.Int, id).query(`
          DELETE FROM payment_receipts
          OUTPUT DELETED.*
          WHERE id = @id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Delete payment receipt error:", error);
      throw error;
    }
  }

  // Create payment receipts table if it doesn't exist
  static async createTableIfNotExists() {
    try {
      // Check if table exists
      const tableCheckResult = await pool.request().query(`
        SELECT OBJECT_ID('dbo.payment_receipts', 'U') as tableId
      `);

      if (tableCheckResult.recordset[0].tableId === null) {
        console.log("Creating payment_receipts table...");

        // Create the receipts table
        await pool.request().query(`
          CREATE TABLE [dbo].[payment_receipts] (
            [id] INT IDENTITY(1,1) PRIMARY KEY,
            [request_id] INT NOT NULL,
            [invoice_no] NVARCHAR(100) NOT NULL,
            [invoice_date] DATETIME NOT NULL,
            [invoice_amount] DECIMAL(12, 2) NOT NULL,
            [received_amount] DECIMAL(12, 2) DEFAULT 0.00,
            [balance] DECIMAL(12, 2),
            [payment_status] NVARCHAR(20) DEFAULT 'Pending',
            [voucher_no] NVARCHAR(100),
            [voucher_date] DATETIME,
            [payment_mode] NVARCHAR(50),
            [payment_date] DATETIME,
            [customer_id] INT NOT NULL,
            [remarks] NVARCHAR(500),
            [created_at] DATETIME DEFAULT GETDATE(),
            [updated_at] DATETIME DEFAULT GETDATE(),
            FOREIGN KEY ([request_id]) REFERENCES [transport_requests]([id]),
            FOREIGN KEY ([customer_id]) REFERENCES [users]([id])
          );
        `);

        // Create payment_transactions table for individual payment history
        await pool.request().query(`
          CREATE TABLE [dbo].[payment_transactions] (
            [id] INT IDENTITY(1,1) PRIMARY KEY,
            [receipt_id] INT NOT NULL,
            [payment_amount] DECIMAL(12, 2) NOT NULL,
            [voucher_no] NVARCHAR(100),
            [voucher_date] DATETIME,
            [payment_mode] NVARCHAR(50),
            [payment_date] DATETIME DEFAULT GETDATE(),
            [remarks] NVARCHAR(500),
            [created_at] DATETIME DEFAULT GETDATE(),
            FOREIGN KEY ([receipt_id]) REFERENCES [payment_receipts]([id])
          );
        `);

        console.log("Payment tables created successfully!");

        console.log("payment_receipts table created successfully!");
      } else {
        console.log("payment_receipts table already exists!");
      }
    } catch (error) {
      console.error("Error creating table:", error);
      // Don't throw error as the app should continue to work
    }
  }

  // Clean duplicate receipts, keep only one per request_id
  static async cleanupDuplicateReceipts() {
    try {
      console.log("Cleaning up duplicate payment receipts...");

      // First delete payment_transactions for duplicates
      await pool.request().query(`
        DELETE pt FROM payment_transactions pt
        INNER JOIN (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY request_id ORDER BY created_at ASC) AS RowNum
          FROM payment_receipts
        ) dr ON pt.receipt_id = dr.id
        WHERE dr.RowNum > 1;
      `);

      // Then delete duplicate receipts, keeping only the oldest one (by created_at) for each request_id
      await pool.request().query(`
        WITH DuplicateReceipts AS (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY request_id ORDER BY created_at ASC) AS RowNum
          FROM payment_receipts
        )
        DELETE FROM DuplicateReceipts WHERE RowNum > 1;
      `);

      console.log("Duplicate receipts cleaned up successfully!");
      return true;
    } catch (error) {
      console.error("Cleanup duplicate receipts error:", error);
      throw error;
    }
  }

  // Initialize payment receipts for existing transport requests (one-time migration)
  static async initializePaymentReceipts() {
    try {
      // Create table first if it doesn't exist
      await this.createTableIfNotExists();

      // First cleanup any existing duplicates
      await this.cleanupDuplicateReceipts();

      // Get all transport requests that have been billed (have consigner and requested_price > 0)
      // This includes all statuses: pending, approved, in progress, completed
      const result = await pool.request().query(`
        SELECT tr.id, tr.customer_id, tr.created_at, tr.requested_price,
               u.name as customer_name, tr.consigner, tr.consignee
        FROM transport_requests tr
        INNER JOIN users u ON tr.customer_id = u.id
        WHERE tr.consigner IS NOT NULL
        AND tr.consigner != ''
        AND tr.requested_price > 0
        AND NOT EXISTS (
          SELECT 1 FROM payment_receipts pr WHERE pr.request_id = tr.id
        )
        ORDER BY tr.created_at DESC
      `);

      const receipts = [];
      for (const request of result.recordset) {
        const invoiceNo = `INV-${new Date(
          request.created_at
        ).getFullYear()}-${String(request.id).padStart(4, "0")}`;
        const invoiceAmount = parseFloat(request.requested_price || 0);

        const receiptData = {
          request_id: request.id,
          invoice_no: invoiceNo,
          invoice_date: request.created_at,
          invoice_amount: invoiceAmount,
          received_amount: 0,
          balance: invoiceAmount,
          payment_status: "Pending",
          customer_id: request.customer_id,
          remarks: `Auto-generated receipt for completed request`,
        };

        try {
          const receipt = await this.createPaymentReceipt(receiptData);
          receipts.push(receipt);
        } catch (error) {
          console.error(
            `Error creating receipt for request ${request.id}:`,
            error
          );
          // Continue with other receipts
        }
      }

      console.log(
        `Created ${receipts.length} new payment receipts after cleanup`
      );
      return receipts;
    } catch (error) {
      console.error("Initialize payment receipts error:", error);
      throw error;
    }
  }
}

module.exports = PaymentReceiptModel;
