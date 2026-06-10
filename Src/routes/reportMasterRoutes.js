const express = require("express");
const auth = require("../middlewares/auth");
const ReportMasterController = require("../controller/reportMasterController");
const VehicleReportController = require("../controller/vehicleReportController");

const router = express.Router();

router.get("/report-master/vehicle-master-report", auth, VehicleReportController.getVehicleMasterReport);
router.get("/report-master/dashboard-summary", auth, ReportMasterController.getDashboardSummary);
router.get("/report-master/summary", auth, ReportMasterController.getAllSummary);
router.get("/report-master/summary/:entity", auth, ReportMasterController.getEntitySummary);
router.get("/report-master", auth, ReportMasterController.getAllSummary);
router.get("/report-master/:entity", auth, ReportMasterController.getEntitySummary);

module.exports = router;
