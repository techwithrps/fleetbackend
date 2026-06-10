const express = require("express");
const router = express.Router();
const locationController = require("../controller/locationcontroller");

// GET /api/locations
router.get("/", locationController.getLocations);

module.exports = router;
