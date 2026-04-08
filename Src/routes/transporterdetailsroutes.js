const express = require("express");
const router = express.Router();
const TransporterController = require("../controller/transporterController");
const auth = require("../middlewares/auth");

// Create single transporter details
router.post(
  "/transport-requests/:requestId/transporter",
  auth,
  TransporterController.createTransporterDetails
);

// NEW: Create multiple vehicles at once
router.post(
  "/transport-requests/:requestId/vehicles/batch",
  auth,
  TransporterController.createMultipleVehicles
);

// NEW: Update containers for multiple vehicles at once
router.post(
  "/transport-requests/:requestId/vehicles/containers/batch",
  auth,
  TransporterController.updateMultipleVehicleContainers
);

// Get transporter details by request ID
router.get(
  "/transport-requests/:requestId/transporter",
  auth,
  TransporterController.getTransporterDetailsByRequestId
);

// Update transporter details
router.put(
  "/transporter/:id",
  auth,
  TransporterController.updateTransporterDetails
);

// Update container details only
router.put(
  "/transporter/:id/container",
  auth,
  TransporterController.updateContainerDetails
);

// Get containers by vehicle number for a specific request
router.get(
  "/transport-requests/:requestId/vehicle/:vehicleNumber/containers",
  auth,
  TransporterController.getContainersByVehicleNumber
);

// Get all containers for a request
router.get(
  "/transport-requests/:requestId/containers",
  auth,
  TransporterController.getContainersByRequestId
);

// Add multiple containers to a single vehicle
router.post(
  "/transport-requests/:requestId/vehicle/:vehicleNumber/containers",
  auth,
  TransporterController.addContainersToVehicle
);

// Delete container
router.delete(
  "/transporter/container/:id",
  auth,
  TransporterController.deleteContainer
);

// Delete transporter
router.delete(
  "/transporter/:id",
  auth,
  TransporterController.deleteTransporterDetails
);

module.exports = router;
