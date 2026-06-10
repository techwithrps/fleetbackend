const express = require("express");
const router = express.Router();
const multer = require("multer");
const expenseBookingController = require("../controller/expenseBookingController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.post("/", upload.single("document"), expenseBookingController.createExpenseBooking);
router.get("/", expenseBookingController.getAllExpenseBookings);
router.get("/:id", expenseBookingController.getExpenseBookingById);

module.exports = router;
