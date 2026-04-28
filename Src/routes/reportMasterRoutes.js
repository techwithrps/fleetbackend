const express = require("express");
const auth = require("../middlewares/auth");
const ReportMasterController = require("../controller/reportMasterController");

const router = express.Router();

router.get("/report-master/summary", auth, ReportMasterController.getAllSummary);
router.get("/report-master/summary/:entity", auth, ReportMasterController.getEntitySummary);
router.get("/report-master", auth, ReportMasterController.getAllSummary);
router.get("/report-master/:entity", auth, ReportMasterController.getEntitySummary);

module.exports = router;
