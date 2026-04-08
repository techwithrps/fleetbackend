const express = require("express");
const router = express.Router();
const TirePositionController = require("../controller/tirePositionController");
const auth = require("../middlewares/auth");

router.get("/tire-positions", auth, TirePositionController.getAllPositions);
router.get("/tire-positions/:id", auth, TirePositionController.getPositionById);
router.post("/tire-positions", auth, TirePositionController.createPosition);
router.put("/tire-positions/:id", auth, TirePositionController.updatePosition);
router.delete(
  "/tire-positions/:id",
  auth,
  TirePositionController.deletePosition
);

module.exports = router;
