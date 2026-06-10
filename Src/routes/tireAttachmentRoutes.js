const express = require("express");
const router = express.Router();
const TireAttachmentController = require("../controller/tireAttachmentController");
const auth = require("../middlewares/auth");

router.get("/tire-attachments", auth, TireAttachmentController.getHistory);
router.post("/tire-attachments/attach", auth, TireAttachmentController.attachTire);
router.put(
  "/tire-attachments/detach/:id",
  auth,
  TireAttachmentController.detachTire
);
router.put("/tire-attachments/detach-bulk", auth, TireAttachmentController.detachTiresBulk);

module.exports = router;
