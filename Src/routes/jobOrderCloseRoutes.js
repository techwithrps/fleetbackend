const express = require("express");
const router = express.Router();
const JobOrderCloseController = require("../controller/jobOrderCloseController");
const auth = require("../middlewares/auth");

router.get("/job-orders/close", auth, JobOrderCloseController.getAllJobOrderClose);
router.get(
  "/job-orders/close/:id",
  auth,
  JobOrderCloseController.getJobOrderCloseById
);
router.post(
  "/job-orders/close",
  auth,
  JobOrderCloseController.createJobOrderClose
);

module.exports = router;
