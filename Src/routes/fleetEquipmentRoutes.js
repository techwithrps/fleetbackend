const express = require("express");
const router = express.Router();
const FleetEquipmentController = require("../controller/fleetEquipmentController");
const auth = require("../middlewares/auth");

// Get all fleet equipment
router.get("/fleet-equipment", auth, FleetEquipmentController.getAllFleetEquipment);

// Get fleet equipment by ID
router.get("/fleet-equipment/:id", auth, FleetEquipmentController.getFleetEquipmentById);

// Create new fleet equipment
router.post("/fleet-equipment", auth, FleetEquipmentController.createFleetEquipment);

// Update fleet equipment
router.put("/fleet-equipment/:id", auth, FleetEquipmentController.updateFleetEquipment);

// Delete fleet equipment
router.delete("/fleet-equipment/:id", auth, FleetEquipmentController.deleteFleetEquipment);

module.exports = router;