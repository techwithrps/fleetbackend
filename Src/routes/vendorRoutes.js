const express = require("express");
const router = express.Router();
const VendorController = require("../controller/vendorController");
const auth = require("../middlewares/auth");

// Get all vendors
router.get("/vendors", auth, VendorController.getAllVendors);

// Get vendor by ID
router.get("/vendors/:id", auth, VendorController.getVendorById);

// Get vendor document (for viewing/downloading documents)
router.get(
  "/vendors/:id/document/:documentNumber",
  auth,
  VendorController.getVendorDocument
);

// Create new vendor with documents
router.post(
  "/vendors",
  auth,
  VendorController.uploadDocuments,
  VendorController.createVendor
);

// Update vendor with documents
router.put(
  "/vendors/:id",
  auth,
  VendorController.uploadDocuments,
  VendorController.updateVendor
);

// Delete vendor
router.delete("/vendors/:id", auth, VendorController.deleteVendor);

module.exports = router;
