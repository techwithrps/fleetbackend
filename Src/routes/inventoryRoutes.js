const express = require("express");
const router = express.Router();
const inventoryReportController = require("../controller/inventoryReportController");

router.get("/", inventoryReportController.getInventoryReport);

module.exports = router;
