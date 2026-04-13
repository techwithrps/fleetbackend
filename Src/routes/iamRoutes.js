const express = require("express");
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminmiddleware");
const iamController = require("../controller/iamController");

const router = express.Router();

router.use(auth, adminAuth);

router.get("/bootstrap", iamController.getBootstrap);
router.get("/terminals", iamController.getTerminals);
router.post("/seed-defaults", iamController.seedDefaults);
router.post("/roles", iamController.createRole);
router.put("/roles/:id/permissions", iamController.updateRolePermissions);
router.put("/users/:id/access", iamController.updateUserAccess);

module.exports = router;
