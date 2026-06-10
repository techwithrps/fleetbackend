const express = require("express");
const router = express.Router();
const ServiceMasterController = require("../controller/servicemastercontroller");

router.get("/getallservices", ServiceMasterController.getAll);
router.get("/services/:id", ServiceMasterController.getById);
router.post("/services", ServiceMasterController.create);

module.exports = router;
