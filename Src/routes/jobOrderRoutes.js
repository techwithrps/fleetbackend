const express = require("express");
const router = express.Router();
const JobOrderController = require("../controller/jobOrderController");
const auth = require("../middlewares/auth");

router.get("/job-orders", auth, JobOrderController.getAllJobOrders);
router.get("/job-orders/:id", auth, JobOrderController.getJobOrderById);
router.post("/job-orders", auth, JobOrderController.createJobOrder);
router.put("/job-orders/:id", auth, JobOrderController.updateJobOrder);

module.exports = router;
