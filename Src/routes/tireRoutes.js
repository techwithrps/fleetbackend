const express = require("express");
const router = express.Router();
const TireController = require("../controller/tireController");
const auth = require("../middlewares/auth");

router.get("/tires", auth, TireController.getAllTires);
router.get("/tires/search", auth, TireController.searchTires);
router.get("/tires/:id", auth, TireController.getTireById);
router.post("/tires", auth, TireController.createTire);
router.put("/tires/:id", auth, TireController.updateTire);
router.delete("/tires/:id", auth, TireController.deleteTire);

module.exports = router;
