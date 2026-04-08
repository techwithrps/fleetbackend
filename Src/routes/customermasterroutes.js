const express = require("express");
const router = express.Router();
const CustomerMasterController = require("../controller/customermastercontroller");

router.get("/customers", CustomerMasterController.getAllCustomers);

module.exports = router;
