const express = require("express");
const router = express.Router();
const BedController = require("../controller/bedController");
const auth = require("../middlewares/auth");

router.get("/beds", auth, BedController.getAllBeds);
router.get("/beds/:id", auth, BedController.getBedById);
router.post("/beds", auth, BedController.createBed);
router.put("/beds/:id", auth, BedController.updateBed);
router.delete("/beds/:id", auth, BedController.deleteBed);

module.exports = router;
