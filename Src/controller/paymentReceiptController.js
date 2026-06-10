const PaymentReceiptModel = require("../models/PaymentReceiptModel");

class PaymentReceiptController {
  // Create a new payment receipt
  static async createPaymentReceipt(req, res) {
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
      } = req.body;

      // Validate required fields
      if (
        !request_id ||
        !invoice_no ||
        !invoice_date ||
        !invoice_amount ||
        !customer_id
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: request_id, invoice_no, invoice_date, invoice_amount, and customer_id are required",
        });
      }

      const paymentData = {
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
      };

      const paymentReceipt = await PaymentReceiptModel.createPaymentReceipt(
        paymentData
      );

      return res.status(201).json({
        success: true,
        message: "Payment receipt created successfully",
        data: paymentReceipt,
      });
    } catch (error) {
      console.error("Create payment receipt error:", error);
      return res.status(500).json({
        success: false,
        message: "Error creating payment receipt",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get all payment receipts with filters
  static async getAllPaymentReceipts(req, res) {
    try {
      const {
        invoice_no,
        payment_status,
        from_date,
        to_date,
        customer_id,
        consigner,
        request_id,
        page,
        limit,
      } = req.query;

      const filters = {};
      if (invoice_no) filters.invoice_no = invoice_no;
      if (payment_status) filters.payment_status = payment_status;
      if (from_date) filters.from_date = from_date;
      if (to_date) filters.to_date = to_date;
      if (customer_id) filters.customer_id = parseInt(customer_id);
      if (consigner) filters.consigner = consigner;
      if (request_id) filters.request_id = request_id;

      // Pagination
      const currentPage = parseInt(page) || 1;
      const itemsPerPage = parseInt(limit) || 50;
      const offset = (currentPage - 1) * itemsPerPage;

      const allReceipts = await PaymentReceiptModel.getAllPaymentReceipts(
        filters
      );

      // Apply pagination
      const totalItems = allReceipts.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const paginatedReceipts = allReceipts.slice(
        offset,
        offset + itemsPerPage
      );

      return res.status(200).json({
        success: true,
        data: paginatedReceipts,
        pagination: {
          currentPage,
          totalPages,
          totalItems,
          itemsPerPage,
        },
      });
    } catch (error) {
      console.error("Get all payment receipts error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment receipts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get payment receipt by ID
  static async getPaymentReceiptById(req, res) {
    try {
      const { id } = req.params;
      const receiptId = parseInt(id, 10);

      if (isNaN(receiptId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment receipt ID",
        });
      }

      const paymentReceipt = await PaymentReceiptModel.getPaymentReceiptById(
        receiptId
      );

      if (!paymentReceipt) {
        return res.status(404).json({
          success: false,
          message: "Payment receipt not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: paymentReceipt,
      });
    } catch (error) {
      console.error("Get payment receipt by ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment receipt",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get payment receipts by invoice number
  static async getPaymentReceiptsByInvoice(req, res) {
    try {
      const { invoiceNo } = req.params;

      if (!invoiceNo) {
        return res.status(400).json({
          success: false,
          message: "Invoice number is required",
        });
      }

      const paymentReceipts =
        await PaymentReceiptModel.getPaymentReceiptsByInvoice(invoiceNo);

      return res.status(200).json({
        success: true,
        data: paymentReceipts,
      });
    } catch (error) {
      console.error("Get payment receipts by invoice error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment receipts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update payment receipt (add payment)
  static async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const receiptId = parseInt(id, 10);

      if (isNaN(receiptId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment receipt ID",
        });
      }

      const {
        received_amount,
        voucher_no,
        voucher_date,
        payment_mode,
        payment_date,
        remarks,
      } = req.body;

      if (!received_amount || received_amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid received amount is required",
        });
      }

      const paymentData = {
        received_amount,
        voucher_no,
        voucher_date,
        payment_mode,
        payment_date,
        remarks,
      };

      const updatedReceipt = await PaymentReceiptModel.updatePayment(
        receiptId,
        paymentData
      );

      if (!updatedReceipt) {
        return res.status(404).json({
          success: false,
          message: "Payment receipt not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment updated successfully",
        data: updatedReceipt,
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

  // Delete payment receipt
  static async deletePaymentReceipt(req, res) {
    try {
      const { id } = req.params;
      const receiptId = parseInt(id, 10);

      if (isNaN(receiptId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment receipt ID",
        });
      }

      const deletedReceipt = await PaymentReceiptModel.deletePaymentReceipt(
        receiptId
      );

      if (!deletedReceipt) {
        return res.status(404).json({
          success: false,
          message: "Payment receipt not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Payment receipt deleted successfully",
      });
    } catch (error) {
      console.error("Delete payment receipt error:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting payment receipt",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Clean up duplicate payment receipts
  static async cleanupDuplicateReceipts(req, res) {
    try {
      console.log("Cleaning up duplicate payment receipts...");
      await PaymentReceiptModel.cleanupDuplicateReceipts();

      return res.status(200).json({
        success: true,
        message: "Duplicate payment receipts cleaned up successfully",
      });
    } catch (error) {
      console.error("Cleanup duplicate receipts error:", error);
      return res.status(500).json({
        success: false,
        message: "Error cleaning up duplicate receipts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Initialize payment receipts for existing requests
  static async initializePaymentReceipts(req, res) {
    try {
      console.log("Initializing payment receipts...");
      const receipts = await PaymentReceiptModel.initializePaymentReceipts();

      return res.status(200).json({
        success: true,
        message: `${receipts.length} payment receipts initialized`,
        data: receipts,
      });
    } catch (error) {
      console.error("Initialize payment receipts error:", error);
      return res.status(500).json({
        success: false,
        message: "Error initializing payment receipts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get payment summary stats
  static async getPaymentSummary(req, res) {
    try {
      const receipts = await PaymentReceiptModel.getAllPaymentReceipts({});

      const summary = receipts.reduce(
        (acc, receipt) => ({
          totalInvoices: acc.totalInvoices + 1,
          totalInvoiceAmount:
            acc.totalInvoiceAmount + parseFloat(receipt.invoice_amount || 0),
          totalReceived:
            acc.totalReceived + parseFloat(receipt.received_amount || 0),
          totalOutstanding:
            acc.totalOutstanding + parseFloat(receipt.balance || 0),
          paidCount:
            acc.paidCount + (receipt.payment_status === "Paid" ? 1 : 0),
          partialCount:
            acc.partialCount + (receipt.payment_status === "Partial" ? 1 : 0),
          pendingCount:
            acc.pendingCount + (receipt.payment_status === "Pending" ? 1 : 0),
        }),
        {
          totalInvoices: 0,
          totalInvoiceAmount: 0,
          totalReceived: 0,
          totalOutstanding: 0,
          paidCount: 0,
          partialCount: 0,
          pendingCount: 0,
        }
      );

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Get payment summary error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment summary",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get payment receipts by customer ID
  static async getPaymentReceiptsByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const customerIdInt = parseInt(customerId, 10);

      if (isNaN(customerIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const receipts = await PaymentReceiptModel.getAllPaymentReceipts({
        customer_id: customerIdInt,
      });

      return res.status(200).json({
        success: true,
        data: receipts,
      });
    } catch (error) {
      console.error("Get payment receipts by customer error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment receipts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get payment history for a specific receipt
  static async getPaymentHistory(req, res) {
    try {
      const { receiptId } = req.params;
      const receiptIdInt = parseInt(receiptId, 10);

      if (isNaN(receiptIdInt)) {
        return res.status(400).json({
          success: false,
          message: "Invalid receipt ID",
        });
      }

      const history = await PaymentReceiptModel.getPaymentHistory(receiptIdInt);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error("Get payment history error:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment history",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = PaymentReceiptController;
