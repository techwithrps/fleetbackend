const { pool, sql } = require("../config/dbconfig");
const TransactionModel = require("../models/TransactionModel");
const PaymentDetailsModel = require("../models/PaymentDetailsModel");
const { applyLocationFilter } = require("../utils/queryHelper");

class TransactionController {
  // Create a new transaction
  static async createTransaction(req, res) {
    try {
      const {
        request_id,
        transporter_id,
        gr_no,
        payment_amount,
        payment_mode,
        remarks,
      } = req.body;

      // Validate required fields
      if (!request_id || !transporter_id || !gr_no) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: request_id, transporter_id, and gr_no are required",
        });
      }

      // Get transport request details
      const poolRequest = pool.request()
        .input("requestId", sql.Int, request_id);
      
      const filter = applyLocationFilter(poolRequest, req.user);

      const requestDetails = await poolRequest.query(`
          SELECT 
            tr.*, 
            u.name as customer_name
          FROM transport_requests tr
          INNER JOIN users u ON tr.customer_id = u.id
          WHERE tr.id = @requestId ${filter}
        `);

      if (requestDetails.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Transport request not found",
        });
      }

      // Get transporter details
      const transporterDetails = await pool
        .request()
        .input("transporterId", sql.Int, transporter_id).query(`
          SELECT * FROM transporter_details
          WHERE id = @transporterId
        `);

      if (transporterDetails.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Transporter details not found",
        });
      }

      const request = requestDetails.recordset[0];
      const transporter = transporterDetails.recordset[0];

      // Parse service_type if it's a string
      let parsedServiceType = request.service_type;
      try {
        if (typeof request.service_type === "string") {
          parsedServiceType = JSON.parse(request.service_type);
        }
      } catch (error) {
        console.error("Error parsing service_type:", error);
        parsedServiceType = ["Transport"];
      }

      // Create transaction data object
      const transactionData = {
        request_id,
        transporter_id,
        gr_no,
        transporter_name: transporter.transporter_name,
        vehicle_number: transporter.vehicle_number,
        driver_name: transporter.driver_name,
        pickup_location: request.pickup_location,
        delivery_location: request.delivery_location,
        consigner: request.consigner,
        consignee: request.consignee,
        service_type:
          typeof parsedServiceType === "object"
            ? JSON.stringify(parsedServiceType)
            : parsedServiceType,
        requested_price: request.requested_price,
        transporter_charge: transporter.total_charge,
        gst_percentage: 18.0, // Default GST percentage
        total_paid: payment_amount || 0,
        last_payment_amount: payment_amount || null,
        last_payment_date: payment_amount ? new Date() : null,
        last_payment_mode: payment_mode || null,
        remarks,
      };

      // Create the transaction
      const transaction = await TransactionModel.createTransaction(
        transactionData
      );

      return res.status(201).json({
        success: true,
        message: "Transaction created successfully",
        data: transaction,
      });
    } catch (error) {
      console.error("Create transaction error:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating transaction",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get all transactions
  static async getAllTransactions(req, res) {
    try {
      const transactions = await TransactionModel.getAllTransactions(req.user);

      return res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error("Get all transactions error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get transactions by transporter ID
  static async getTransactionsByTransporterId(req, res) {
    try {
      const { transporterId } = req.params;
      const transporterIdInt = parseInt(transporterId, 10);

      if (isNaN(transporterIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transporter ID",
        });
      }

      // Query to get transactions by transporter_id
      const request = pool.request()
        .input("transporterId", sql.Int, transporterIdInt);
      
      const filter = applyLocationFilter(request, req.user, "tr");

      const result = await request.query(`
          SELECT ttm.* 
          FROM transport_transaction_master ttm
          INNER JOIN transport_requests tr ON ttm.request_id = tr.id
          WHERE ttm.transporter_id = @transporterId ${filter}
          ORDER BY ttm.created_at DESC
        `);

      return res.status(200).json({
        success: true,
        data: result.recordset,
      });
    } catch (error) {
      console.error("Get transactions by transporter ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get transaction by ID
  static async getTransactionById(req, res) {
    try {
      const { id } = req.params;
      const transactionId = parseInt(id, 10);

      if (isNaN(transactionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID",
        });
      }

      const transaction = await TransactionModel.getTransactionById(
        transactionId,
        req.user
      );

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error("Get transaction by ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transaction",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get transactions by request ID
  static async getTransactionsByRequestId(req, res) {
    try {
      const { requestId } = req.params;
      const requestIdInt = parseInt(requestId, 10);

      if (isNaN(requestIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid request ID",
        });
      }

      const transactions = await TransactionModel.getTransactionsByRequestId(
        requestId,
        req.user
      );

      return res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error("Get transactions by request ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update transaction payment
  static async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const transactionIdInt = parseInt(id, 10);

      if (isNaN(transactionIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID",
        });
      }

      const { payment_amount, payment_mode, payment_date, remarks } = req.body;

      if (!payment_amount || !payment_mode) {
        return res.status(400).json({
          success: false,
          message: "Payment amount and mode are required",
        });
      }

      // Generate a unique invoice ID
      const invoiceId = `INV-${id}-${Date.now().toString().slice(-6)}`;

      // Update the transaction with new payment total
      const updatedTransaction = await TransactionModel.updatePayment(id, {
        payment_amount,
        payment_mode,
        payment_date: payment_date || new Date(),
        remarks,
      });

      if (!updatedTransaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      // Create a payment detail record
      await PaymentDetailsModel.createPayment({
        transaction_id: id,
        invoice_id: invoiceId,
        amount: payment_amount,
        payment_mode,
        payment_date: payment_date || new Date(),
        remarks,
      });

      return res.status(200).json({
        success: true,
        message: "Payment updated successfully",
        data: updatedTransaction,
      });
    } catch (error) {
      console.error("Update payment error:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating payment",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async getPaymentDetails(req, res) {
    try {
      const { id } = req.params;
      const transactionIdInt = parseInt(id, 10);

      if (isNaN(transactionIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID",
        });
      }

      const payments = await PaymentDetailsModel.getPaymentsByTransactionId(id);

      return res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Get payment details error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment details",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update individual payment record
  static async updateIndividualPayment(req, res) {
    try {
      const { id } = req.params;
      const paymentIdInt = parseInt(id, 10);

      if (isNaN(paymentIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment ID",
        });
      }

      const { payment_amount, payment_mode, payment_date, remarks } = req.body;

      if (!payment_amount || !payment_mode) {
        return res.status(400).json({
          success: false,
          message: "Amount and payment mode are required",
        });
      }

      // Update the individual payment record
      const updatedPayment = await PaymentDetailsModel.updatePayment(id, {
        amount: payment_amount,
        payment_mode,
        payment_date: payment_date || new Date(),
        remarks,
      });

      if (!updatedPayment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      // Update the transaction's total_paid amount
      // First get all payments for this transaction
      const transactionId = updatedPayment.transaction_id;
      const allPayments = await PaymentDetailsModel.getPaymentsByTransactionId(
        transactionId
      );
      const totalPaid = allPayments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount),
        0
      );

      // Update the transaction master record
      await pool
        .request()
        .input("transactionId", sql.Int, transactionId)
        .input("totalPaid", sql.Decimal(12, 2), totalPaid).query(`
          UPDATE transport_transaction_master
          SET total_paid = @totalPaid,
              last_payment_amount = @totalPaid,
              last_payment_date = GETDATE(),
              last_payment_mode = '${payment_mode}',
              updated_at = GETDATE()
          WHERE id = @transactionId
        `);

      return res.status(200).json({
        success: true,
        message: "Payment updated successfully",
        data: updatedPayment,
      });
    } catch (error) {
      console.error("Update individual payment error:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating payment",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete transaction
  static async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      const transactionIdInt = parseInt(id, 10);

      if (isNaN(transactionIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID",
        });
      }

      const deletedTransaction = await TransactionModel.deleteTransaction(id);

      if (!deletedTransaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error("Delete transaction error:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting transaction",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get transactions by vehicle number
  static async getTransactionsByVehicleNumber(req, res) {
    try {
      const { vehicleNumber } = req.params;

      // Query to get transactions by vehicle_number
      const request = pool.request()
        .input("vehicleNumber", sql.VarChar(50), vehicleNumber);
      
      const filter = applyLocationFilter(request, req.user, "tr");

      const result = await request.query(`
          SELECT ttm.* 
          FROM transport_transaction_master ttm
          INNER JOIN transport_requests tr ON ttm.request_id = tr.id
          WHERE ttm.vehicle_number = @vehicleNumber ${filter}
          ORDER BY ttm.created_at DESC
        `);

      return res.status(200).json({
        success: true,
        data: result.recordset,
      });
    } catch (error) {
      console.error("Get transactions by vehicle number error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async getTransactionsByCustomerId(req, res) {
    try {
      const { customerId } = req.params;
      const customerIdInt = parseInt(customerId, 10);

      if (isNaN(customerIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      // Query to get transactions by customer_id from transport_requests
      const request = pool.request()
        .input("customerId", sql.Int, customerIdInt);
      
      const filter = applyLocationFilter(request, req.user, "tr");

      const result = await request.query(`
          SELECT ttm.*, tr.status as request_status, u.name as customer_name
          FROM transport_transaction_master ttm
          INNER JOIN transport_requests tr ON ttm.request_id = tr.id
          INNER JOIN users u ON tr.customer_id = u.id
          WHERE tr.customer_id = @customerId ${filter}
          ORDER BY ttm.created_at DESC
        `);

      return res.status(200).json({
        success: true,
        data: result.recordset,
      });
    } catch (error) {
      console.error("Get transactions by customer ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get daily advance payments with date filters
  static async getDailyAdvancePayments(req, res) {
    try {
      const { date, from_date, to_date } = req.query;

      // If no date parameters provided, return empty result
      if (!date && !from_date && !to_date) {
        return res.status(200).json({
          success: true,
          data: {},
        });
      }

      let whereClause = "";
      let request = pool.request();

      if (date) {
        // Single date filter - use date range for the entire day
        const selectedDate = new Date(date);
        const nextDay = new Date(selectedDate);
        nextDay.setDate(selectedDate.getDate() + 1);

        whereClause +=
          " AND ttm.created_at >= @startDate AND ttm.created_at < @endDate";
        request = request.input("startDate", sql.DateTime, selectedDate);
        request = request.input("endDate", sql.DateTime, nextDay);
      } else if (from_date) {
        // Date range filter - use date range for entire days
        const fromDateObj = new Date(from_date);
        const toDateObj = to_date ? new Date(to_date) : new Date(fromDateObj);
        if (to_date) {
          toDateObj.setDate(toDateObj.getDate() + 1); // Include to_date
        } else {
          toDateObj.setDate(fromDateObj.getDate() + 1); // Include from_date day
        }

        whereClause +=
          " AND ttm.created_at >= @startDateRange AND ttm.created_at < @endDateRange";
        request = request.input("startDateRange", sql.DateTime, fromDateObj);
        request = request.input("endDateRange", sql.DateTime, toDateObj);
      }

      // First get transactions
      const filter = applyLocationFilter(request, req.user, "tr");

      const transactionResult = await request.query(`
        SELECT
          ttm.id,
          CONVERT(DATE, ttm.created_at) as transaction_date,
          ttm.vehicle_number,
          ttm.transporter_name,
          ttm.driver_name,
          ttm.total_paid as advance_amount,
          ttm.last_payment_mode as payment_mode,
          ttm.last_payment_date,
          ttm.gr_no,
          ttm.request_id,
          ttm.transporter_id,
          tr.status as request_status,
          u.name as customer_name,
          tr.pickup_location,
          tr.delivery_location,
          ttm.created_at,
          ttm.vehicle_payment_status,
          ttm.remarks
        FROM transport_transaction_master ttm
        INNER JOIN transport_requests tr ON ttm.request_id = tr.id
        INNER JOIN users u ON tr.customer_id = u.id
        WHERE ttm.total_paid > 0 ${whereClause} ${filter}
        ORDER BY ttm.created_at DESC
      `);

      // Get container details for each transaction - use same approach as Admindashboard
      const enhancedResults = [];

      for (const transaction of transactionResult.recordset) {
        try {
          // Use the same transporter API approach as Admindashboard.jsx
          const transporterDetails = await pool
            .request()
            .input("requestId", sql.Int, transaction.request_id || 0).query(`
              SELECT * FROM transporter_details
              WHERE request_id = @requestId
            `);

          const containers = transporterDetails.recordset.map((c) => ({
            number: c.container_no,
            type: c.container_type,
            size: c.container_size,
          }));

          const vehicle_charges = transporterDetails.recordset.map((c) => ({
            vehicle_number: c.vehicle_number,
            container_no: c.container_no,
            total_charge: parseFloat(c.total_charge || 0),
            additional_charges: parseFloat(c.additional_charges || 0),
            net_charge:
              parseFloat(c.total_charge || 0) +
              parseFloat(c.additional_charges || 0),
          }));

          const total_vehicle_charges = transporterDetails.recordset.reduce(
            (sum, c) =>
              sum +
              parseFloat(c.total_charge || 0) +
              parseFloat(c.additional_charges || 0),
            0
          );

          enhancedResults.push({
            ...transaction,
            containers,
            vehicle_charges,
            total_vehicle_charges,
          });
        } catch (error) {
          console.error(
            "Error fetching container details for transaction:",
            transaction.request_id,
            error
          );
          enhancedResults.push({
            ...transaction,
            containers: [],
            vehicle_charges: [],
            total_vehicle_charges: 0,
          });
        }
      }

      const result = {
        recordset: enhancedResults,
      };

      // Group by date for easier frontend processing
      const dailyAdvances = {};
      enhancedResults.forEach((transaction) => {
        const dateKey = transaction.transaction_date
          .toISOString()
          .split("T")[0]; // YYYY-MM-DD format

        if (!dailyAdvances[dateKey]) {
          dailyAdvances[dateKey] = [];
        }

        dailyAdvances[dateKey].push({
          id: transaction.id,
          vehicle_number: transaction.vehicle_number,
          transporter_name: transaction.transporter_name,
          driver_name: transaction.driver_name,
          advance_amount: parseFloat(transaction.advance_amount || 0),
          payment_mode: transaction.payment_mode,
          last_payment_date: transaction.last_payment_date,
          gr_no: transaction.gr_no,
          request_id: transaction.request_id,
          customer_name: transaction.customer_name,
          pickup_location: transaction.pickup_location,
          delivery_location: transaction.delivery_location,
          status: transaction.request_status,
          created_at: transaction.created_at,
          containers: transaction.containers,
          vehicle_charges: transaction.vehicle_charges,
          total_vehicle_charges: transaction.total_vehicle_charges,
          vehicle_payment_status: transaction.vehicle_payment_status,
          remarks: transaction.remarks,
          neft_reference: extractNEFTReference(transaction.remarks),
        });

        function extractNEFTReference(remarks) {
          if (!remarks) return null;
          const neftMatch = remarks.match(/NEFT\/Ref:\s*([^;]+)/i);
          return neftMatch ? neftMatch[1].trim() : null;
        }
      });

      return res.status(200).json({
        success: true,
        data: dailyAdvances,
      });
    } catch (error) {
      console.error("Get daily advance payments error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching daily advance payments",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update vehicle payment status for advance payments
  static async updateVehiclePaymentStatus(req, res) {
    try {
      const { requestId } = req.params;
      const requestIdInt = parseInt(requestId, 10);

      if (isNaN(requestIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid request ID",
        });
      }

      const {
        vehicle_number,
        payment_status,
        payment_date,
        notes,
        neft_reference,
      } = req.body;

      if (!vehicle_number) {
        return res.status(400).json({
          success: false,
          message: "Vehicle number is required",
        });
      }

      // Check if vehicle payment status table exists, if not create it
      // For now, since user mentioned creating new column, let's first check if a vehicle payment status column exists
      const checkColumnResult = await pool.request().query(`
        SELECT TOP 1 * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'transport_transaction_master'
        AND COLUMN_NAME = 'vehicle_payment_status'
      `);

      let columnExists = checkColumnResult.recordset.length > 0;

      if (!columnExists) {
        // Add the column if it doesn't exist
        try {
          // For Microsoft SQL Server, we need to alter the table to add the column
          await pool.request().query(`
            ALTER TABLE [fleet2].[dbo].[transport_transaction_master]
            ADD vehicle_payment_status NVARCHAR(20) DEFAULT NULL
          `);
          columnExists = true;
        } catch (error) {
          console.error("Error creating vehicle_payment_status column:", error);
          // Continue with JSON-based approach in transaction_remarks or similar
          columnExists = false;
        }
      }

      // Set notes text
      let notesText =
        notes ||
        `Payment ${payment_status} for vehicle ${vehicle_number} on ${new Date().toLocaleDateString()}`;

      console.log("Column exists check result:", columnExists);

      // Add NEFT reference to notes if provided
      if (neft_reference && neft_reference.trim() !== "") {
        notesText += ` NEFT/Ref: ${neft_reference.trim()}`;
      }

      // Update the vehicle payment status
      let result;

      if (columnExists) {
        console.log("Using column-based update");
        result = await pool
          .request()
          .input("requestId", sql.Int, requestIdInt)
          .input("vehicle_number", sql.VarChar(50), vehicle_number)
          .input("payment_status", sql.VarChar(20), payment_status)
          .input("notes", sql.VarChar(500), notesText).query(`
            UPDATE transport_transaction_master
            SET vehicle_payment_status = @payment_status,
                remarks = ISNULL(remarks + '; ', '') + @notes,
                updated_at = GETDATE()
            WHERE request_id = @requestId AND vehicle_number = @vehicle_number
          `);
      } else {
        // Use remarks field to store vehicle payment status as JSON with NEFT reference
        const statusJson = JSON.stringify({
          vehicle_number,
          payment_status,
          payment_date: payment_date || new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
          notes: notes || "",
          neft_reference: neft_reference || "",
        });
        result = await pool
          .request()
          .input("requestId", sql.Int, requestIdInt)
          .input("vehicle_number", sql.VarChar(50), vehicle_number)
          .input("statusJson", sql.VarChar(1000), statusJson)
          .input("notes", sql.VarChar(500), notesText).query(`
            UPDATE transport_transaction_master
            SET remarks = ISNULL(remarks + '; ', '') + @notes + '; VEHICLE_PAYMENT_STATUS:' + @statusJson + ';',
                updated_at = GETDATE()
            WHERE request_id = @requestId AND vehicle_number = @vehicle_number
          `);
      }

      if (result.rowsAffected && result.rowsAffected[0] === 0) {
        return res.status(404).json({
          success: false,
          message:
            "No transaction found for the specified request ID and vehicle number",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Vehicle payment status updated to ${payment_status} successfully`,
        data: {
          request_id: requestIdInt,
          vehicle_number,
          payment_status,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Update vehicle payment status error:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating vehicle payment status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update vehicle payment status for a specific transaction
  static async updateTransactionVehiclePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const transactionIdInt = parseInt(id, 10);

      if (isNaN(transactionIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID",
        });
      }

      const { payment_status, neft_reference } = req.body;

      if (!payment_status) {
        return res.status(400).json({
          success: false,
          message: "Payment status is required",
        });
      }

      // Build remarks update if NEFT reference is provided
      let remarksUpdate = "";
      let request = pool
        .request()
        .input("id", sql.Int, transactionIdInt)
        .input("payment_status", sql.VarChar(20), payment_status);

      if (neft_reference && neft_reference.trim() !== "") {
        // Add NEFT reference to remarks
        const neftText = `NEFT/Ref: ${neft_reference.trim()}`;
        request = request.input("neft_reference", sql.VarChar(100), neftText);
        remarksUpdate =
          ", remarks = ISNULL(remarks + '; ', '') + @neft_reference";
      }

      const result = await request.query(`
        UPDATE transport_transaction_master
        SET vehicle_payment_status = @payment_status${remarksUpdate},
            updated_at = GETDATE()
        WHERE id = @id
      `);

      if (result.rowsAffected && result.rowsAffected[0] === 0) {
        return res.status(404).json({
          success: false,
          message: "No transaction found for the specified ID",
        });
      }

      // Fetch the updated transaction to return it
      const updatedTransaction = await TransactionModel.getTransactionById(
        transactionIdInt
      );

      return res.status(200).json({
        success: true,
        message: `Vehicle payment status updated to ${payment_status} successfully`,
        data: updatedTransaction,
      });
    } catch (error) {
      console.error("Update vehicle payment status error:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating vehicle payment status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = TransactionController;
