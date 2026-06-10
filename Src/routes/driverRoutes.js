const express = require("express");
const router = express.Router();
const DriverController = require("../controller/driverController");
const auth = require("../middlewares/auth");

// Get all drivers
router.get("/drivers", auth, DriverController.getAllDrivers);

// Get drivers by vendor ID - This route should come BEFORE the /:id route
router.get("/drivers/vendor/:vendorId", auth, DriverController.getDriversByVendorId);

// Get vendors for dropdown (if you want a separate endpoint)
router.get("/drivers/vendors/list", auth, DriverController.getVendors);

// Get driver by ID - This should come after specific routes
router.get("/drivers/:id", auth, DriverController.getDriverById);

// Create new driver
router.post("/drivers", auth, DriverController.createDriver);

// Update driver
router.put("/drivers/:id", auth, DriverController.updateDriver);

// Delete driver
router.delete("/drivers/:id", auth, DriverController.deleteDriver);

module.exports = router;