const express = require("express");
const router = express.Router();
const multer = require("multer");
const companyController = require("../controller/companyController");

// Use memory storage for logo upload (will be saved as blob in DB)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get("/", companyController.getAllCompanies);
router.get("/:id", companyController.getCompanyById);
router.post("/", upload.single("logo"), companyController.createCompany);
router.put("/:id", upload.single("logo"), companyController.updateCompany);
router.delete("/:id", companyController.deleteCompany);

module.exports = router;
