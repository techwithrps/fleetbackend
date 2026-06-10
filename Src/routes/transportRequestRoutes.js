const express = require("express");
const router = express.Router();
const {
  createRequest,
  getCustomerRequests,
  getAllRequests,
  updateRequestStatus,
  updateRequest,
  getFilteredRequests,
} = require("../controller/transportRequestController");
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminmiddleware");

// Protect all routes with authentication
router.use(auth);

// Create new transport request
router.post("/create", createRequest);

// Get customer's transport requests
router.get("/my-requests", getCustomerRequests);

// Update transport request
router.put("/update/:id", updateRequest);

// Admin routes
router.get("/all", auth, getAllRequests);
router.get("/filtered", auth, getFilteredRequests);
router.put("/:requestId/status", auth, adminAuth, updateRequestStatus);

module.exports = router;
