const express = require("express");
const router = express.Router();
const itemGroupController = require("../controller/itemGroupController");

router.get("/", itemGroupController.getAllGroups);
router.post("/", itemGroupController.createGroup);

module.exports = router;
