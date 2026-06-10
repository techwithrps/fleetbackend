const express = require("express");
const router = express.Router();
const vehicleController = require("../controller/vehiclecontroller");

router.get("/vehicles", vehicleController.getAllVehicles);

module.exports = router;
