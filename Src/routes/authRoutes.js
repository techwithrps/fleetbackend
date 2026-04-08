const express = require("express");
const router = express.Router();
const authController = require("../controller/authcontroller");
const otpController = require("../controller/otpcontroller");

router.post("/signup", authController.signup);

router.post("/login", authController.login);

module.exports = router;
