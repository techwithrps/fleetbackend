const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminmiddleware");
const UserController = require("../controller/UserController");

router.use(auth, adminAuth);

router.get("/allusers", UserController.getAllusers);
router.get("/:id", UserController.getUserById);
router.post("/create", UserController.createUser);
router.put("/:id/role", UserController.updateUserRole);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

module.exports = router;
