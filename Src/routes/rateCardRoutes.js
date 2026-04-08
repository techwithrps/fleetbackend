const express = require("express");
const router = express.Router();
const rateCardController = require("../controller/rateCardController");
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/adminmiddleware");

// Customer Routes
router.post("/create", auth, rateCardController.createRateCard);
router.post("/bulk", auth, rateCardController.createBulkRateCards);
router.post("/match", auth, rateCardController.matchRateCard);
router.get("/customer-rates", auth, rateCardController.getCustomerRateCards);
router.get("/fetch-active-rate", auth, rateCardController.fetchActiveRateForUser);
router.delete('/:id', auth, rateCardController.deleteRateCard);

// Admin Routes
router.get("/pending", auth, isAdmin, rateCardController.getPendingRateCards);
router.put("/update-status/:id", auth, isAdmin, rateCardController.updateRateCardStatus);

module.exports = router;
