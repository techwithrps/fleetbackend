const express = require("express");
const router = express.Router();
const ItemMasterController = require("../controller/itemMasterController");
const auth = require("../middlewares/auth");

router.get("/items", auth, ItemMasterController.getAllItems);
router.get("/items/:id", auth, ItemMasterController.getItemById);
router.post("/items", auth, ItemMasterController.createItem);
router.put("/items/:id", auth, ItemMasterController.updateItem);
router.delete("/items/:id", auth, ItemMasterController.deleteItem);

module.exports = router;
