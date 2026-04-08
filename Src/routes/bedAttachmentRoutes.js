const express = require("express");
const router = express.Router();
const BedAttachmentController = require("../controller/bedAttachmentController");
const auth = require("../middlewares/auth");

router.get("/bed-attachments", auth, BedAttachmentController.getHistory);
router.post("/bed-attachments/attach", auth, BedAttachmentController.attachBed);
router.put(
  "/bed-attachments/detach/:id",
  auth,
  BedAttachmentController.detachBed
);

module.exports = router;
