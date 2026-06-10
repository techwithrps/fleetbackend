const express = require("express");
const router = express.Router();
const TransactionController = require("../controller/transactionController");
const auth = require("../middlewares/auth");

// Create a new transaction
router.post("/create", TransactionController.createTransaction);

// Get all transactions (admin only)
router.get("/all", TransactionController.getAllTransactions);

// Get daily advance payments with date filters
router.get("/daily-advances", TransactionController.getDailyAdvancePayments);

// Get transactions by request ID
router.get(
  "/request/:requestId",
  TransactionController.getTransactionsByRequestId
);

// Get transactions by transporter ID
router.get(
  "/transporter/:transporterId",
  TransactionController.getTransactionsByTransporterId
);

// Get transactions by vehicle number
router.get(
  "/vehicle/:vehicleNumber",
  TransactionController.getTransactionsByVehicleNumber
);

// Get customer transactions (new endpoint)
router.get(
  "/customer/:customerId",
  TransactionController.getTransactionsByCustomerId
);

// Update vehicle payment status for a specific transaction
router.put(
  "/:id/vehicle-payment-status",
  TransactionController.updateTransactionVehiclePaymentStatus
);

// Update vehicle payment status for advance payments
router.put(
  "/vehicle-payment/:requestId",
  TransactionController.updateVehiclePaymentStatus
);

// Get payment details for a transaction - catchall for IDs
router.get("/:id/payments", TransactionController.getPaymentDetails);

// Get transaction by ID (catchall for IDs - keep after the specific routes)
router.get("/:id", TransactionController.getTransactionById);

// Update transaction payment (catchall for IDs - keep after the specific routes)
router.put("/:id/payment", TransactionController.updatePayment);

// Update individual payment record
router.put("/payment/:id", TransactionController.updateIndividualPayment);

// Delete transaction (catchall for IDs - keep after the specific routes)
router.delete("/:id", TransactionController.deleteTransaction);

module.exports = router;
