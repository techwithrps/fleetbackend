const express = require("express");
const router = express.Router();
const {
  createPaymentReceipt,
  getAllPaymentReceipts,
  getPaymentReceiptById,
  getPaymentReceiptsByInvoice,
  updatePayment,
  deletePaymentReceipt,
  initializePaymentReceipts,
  getPaymentSummary,
  getPaymentReceiptsByCustomer,
  getPaymentHistory,
} = require("../controller/paymentReceiptController");
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminmiddleware");

// Protect all routes with authentication
router.use(auth);

// Create a new payment receipt (Admin only)
router.post("/create", adminAuth, createPaymentReceipt);

// Get all payment receipts with filters and pagination
router.get("/all", getAllPaymentReceipts);

// Get payment summary stats
router.get("/summary", getPaymentSummary);

// Get payment receipts by customer ID
router.get("/customer/:customerId", getPaymentReceiptsByCustomer);

// Get payment receipt by ID
router.get("/:id", getPaymentReceiptById);

// Get payment receipts by invoice number
router.get("/invoice/:invoiceNo", getPaymentReceiptsByInvoice);

// Get payment history for a receipt
router.get("/:receiptId/history", getPaymentHistory);

// Update payment receipt (add payment) - Admin only
router.put("/:id/payment", adminAuth, updatePayment);

// Delete payment receipt (Admin only)
router.delete("/:id", adminAuth, deletePaymentReceipt);

// Initialize payment receipts for existing requests (Admin only)
router.post("/initialize", adminAuth, initializePaymentReceipts);

module.exports = router;
