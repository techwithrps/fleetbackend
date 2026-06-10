const express = require("express");
const router = express.Router();
const TransporterController = require("../controllers/TransporterController");

router.post("/", TransporterController.createTransporter);
router.get("/", TransporterController.getAllTransporters);
router.get("/:id", TransporterController.getTransporterById);
router.put("/:id", TransporterController.updateTransporter);
router.delete("/:id", TransporterController.deleteTransporter);

module.exports = router;
