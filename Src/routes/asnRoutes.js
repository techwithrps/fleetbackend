const express = require("express");
const router = express.Router();
const asnController = require("../controller/asnController");

router.get("/asn", asnController.getAll);
router.get("/asn/:id", asnController.getById);
router.post("/asn", asnController.create);
router.put("/asn/:id", asnController.update);
router.delete("/:id", asnController.remove);
router.post("/asn/bulk", asnController.createBulk);

module.exports = router;
