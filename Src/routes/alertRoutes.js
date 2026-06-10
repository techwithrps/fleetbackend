const express = require("express");
const router = express.Router();
const AlertController = require("../controller/alertController");
const auth = require("../middlewares/auth");

router.get("/alerts/expiries", auth, AlertController.getExpiryAlerts);

module.exports = router;
