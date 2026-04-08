const express = require("express");
const router = express.Router();
const TransporterlistController = require("../controller/transporterlistcontroller");

const auth = require("../middlewares/auth");

router.get("/getall", TransporterlistController.getAll);
router.get("/getbyid/:id", auth, TransporterlistController.getById);
router.get("/getbyemail/:email", auth, TransporterlistController.getByEmail);

module.exports = router;
