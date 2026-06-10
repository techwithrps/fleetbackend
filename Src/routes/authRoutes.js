const express = require("express");
const router = express.Router();
const authController = require("../controller/authcontroller");
const otpController = require("../controller/otpcontroller");
const auth = require("../middlewares/auth");

router.post("/signup", authController.signup);

router.post("/login", authController.login);
router.post("/user-locations", authController.getUserLocations);
router.post("/switch-location", auth, authController.switchLocation);
router.get("/validate", auth, authController.validate);

module.exports = router;
