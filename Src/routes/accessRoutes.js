const express = require("express");
const router = express.Router();
const accessController = require("../controller/accessController");
const authenticateToken = require("../middlewares/auth");

// We apply token authentication to ensure only logged in users (specifically Admin usually) can do this.
router.use(authenticateToken);

// 1. Fetch Pages
router.get("/pages", accessController.getAllPages);

// 2. Fetch Locations
router.get("/locations", accessController.getAllLocations);

// 3. Fetch specific user access
router.get("/user/:userId", accessController.getUserAccess);

// 4. Update specific user access (from Checkboxes)
router.post("/user/:userId", accessController.saveUserAccess);

module.exports = router;
