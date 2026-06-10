const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/adminmiddleware");
const emailConfigController = require("../controller/emailConfigController");

// Admin-only email config endpoints
router.get("/active", auth, isAdmin, emailConfigController.getActiveConfig);
router.put("/active", auth, isAdmin, emailConfigController.upsertActiveConfig);
router.post("/test", auth, isAdmin, emailConfigController.testEmail);

module.exports = router;

