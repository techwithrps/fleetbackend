const express = require("express");
const router = express.Router();
const EquipmentController = require("../controller/equipmentController");
const auth = require("../middlewares/auth");
const upload = require("../middlewares/upload");

const uploadFields = upload.fields([
  { name: "FITNESS_DOC", maxCount: 1 },
  { name: "RC_DOC", maxCount: 1 },
  { name: "INSURANCE_DOC", maxCount: 1 },
  { name: "PERMIT_A", maxCount: 1 },
  { name: "PERMIT_B", maxCount: 1 },
  { name: "IMAGE", maxCount: 1 },
]);

router.get("/equipment", auth, EquipmentController.getAllEquipment);

router.get("/equipment/:id", auth, EquipmentController.getEquipmentById);

router.post("/equipment", auth, uploadFields, EquipmentController.createEquipment);

router.put("/equipment/:id", auth, uploadFields, EquipmentController.updateEquipment);

router.delete("/equipment/:id", auth, EquipmentController.deleteEquipment);

router.get("/equipment/:id/document/:docType", auth, EquipmentController.getDocument);

module.exports = router;
