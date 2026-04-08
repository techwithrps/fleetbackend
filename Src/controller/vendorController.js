const VendorModel = require("../models/VendorModel");
const multer = require("multer");

// Configure multer for memory storage
const storage = multer.memoryStorage();
// In vendorController.js
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 3, // Maximum 3 files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["application/pdf"]; // Restrict to PDFs only

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF files are allowed."), false);
    }
  },
});

class VendorController {
  // FIXED: Use array upload with specific field name
  static uploadDocuments = upload.array("documents", 3);

  // Create new vendor - FIXED document processing
  static async createVendor(req, res) {
    try {
      console.log("Request body:", req.body);
      console.log("Files received:", req.files?.length || 0);

      // Validate required fields
      if (!req.body.vendor_name || req.body.vendor_name.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Vendor name is required",
        });
      }

      // FIXED: Process documents with proper indexing
      const documents = [];
      if (req.files && req.files.length > 0) {
        // Process each uploaded file and assign to document slots 1, 2, 3
        req.files.forEach((file, arrayIndex) => {
          if (arrayIndex < 3) {
            // Ensure we only process max 3 files
            documents.push({
              index: arrayIndex + 1, // Document slots: 1, 2, 3
              buffer: file.buffer,
              name: file.originalname,
              type: file.mimetype,
            });
          }
        });
      }

      console.log(
        "Documents to create:",
        documents.map((d) => ({ index: d.index, name: d.name, type: d.type }))
      );

      const result = await VendorModel.create(req.body, documents);

      res.status(201).json({
        success: true,
        message: "Vendor created successfully",
        data: result,
      });
    } catch (error) {
      console.error("Create vendor controller error:", error);

      // Handle specific SQL Server errors
      if (error.number === 2627) {
        return res.status(400).json({
          success: false,
          error: "Vendor with this ID already exists",
        });
      }

      if (error.number === 515) {
        return res.status(400).json({
          success: false,
          error: "Required field is missing or null",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to create vendor",
        details: error.message,
      });
    }
  }

  // Update vendor - FIXED document processing
  static async updateVendor(req, res) {
    try {
      const { id } = req.params;

      console.log("Update request body:", req.body);
      console.log("Update files:", req.files?.length || 0);

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid vendor ID provided",
        });
      }

      if (!req.body.vendor_name || req.body.vendor_name.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Vendor name is required",
        });
      }

      // Check if vendor exists
      const existingVendor = await VendorModel.getById(id);
      if (!existingVendor) {
        return res.status(404).json({
          success: false,
          error: "Vendor not found",
        });
      }

      // FIXED: Process documents with proper indexing
      const documents = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file, arrayIndex) => {
          if (arrayIndex < 3) {
            // Ensure we only process max 3 files
            documents.push({
              index: arrayIndex + 1, // Document slots: 1, 2, 3
              buffer: file.buffer,
              name: file.originalname,
              type: file.mimetype,
            });
          }
        });
      }

      console.log("Updating vendor ID:", id);
      console.log(
        "Documents to update:",
        documents.map((d) => ({ index: d.index, name: d.name, type: d.type }))
      );

      await VendorModel.update(id, req.body, documents);

      res.json({
        success: true,
        message: "Vendor updated successfully",
      });
    } catch (error) {
      console.error("Update vendor controller error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update vendor",
        details: error.message,
      });
    }
  }

  // Get vendor document - FIXED error handling
  static async getVendorDocument(req, res) {
    try {
      const { id, documentNumber } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid vendor ID provided",
        });
      }

      if (!["1", "2", "3"].includes(documentNumber)) {
        return res.status(400).json({
          success: false,
          error: "Invalid document number. Must be 1, 2, or 3",
        });
      }

      const documentData = await VendorModel.getVendorDocument(
        id,
        documentNumber
      );

      if (!documentData || !documentData.DOCUMENT_DATA) {
        return res.status(404).json({
          success: false,
          error: "Document not found for this vendor",
        });
      }

      // FIXED: Set appropriate headers for file serving
      const fileName =
        documentData.DOCUMENT_NAME || `document${documentNumber}`;
      const contentType =
        documentData.DOCUMENT_TYPE || "application/octet-stream";

      res.set({
        "Content-Type": contentType,
        "Content-Length": documentData.DOCUMENT_DATA.length,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "public, max-age=31536000",
      });

      // Send the binary data
      res.send(documentData.DOCUMENT_DATA);
    } catch (error) {
      console.error("Get vendor document controller error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vendor document",
        details: error.message,
      });
    }
  }

  // Keep existing methods for getAllVendors, getVendorById, deleteVendor...
  static async getAllVendors(req, res) {
    try {
      const vendors = await VendorModel.getAll();
      res.json({ success: true, data: vendors });
    } catch (error) {
      console.error("Get all vendors controller error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vendors",
        details: error.message,
      });
    }
  }

  static async getVendorById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid vendor ID provided",
        });
      }

      const vendor = await VendorModel.getById(id);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: "Vendor not found",
        });
      }

      res.json({ success: true, data: vendor });
    } catch (error) {
      console.error("Get vendor by ID controller error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch vendor details",
        details: error.message,
      });
    }
  }

  static async deleteVendor(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid vendor ID provided",
        });
      }

      // Check if vendor exists
      const existingVendor = await VendorModel.getById(id);
      if (!existingVendor) {
        return res.status(404).json({
          success: false,
          error: "Vendor not found",
        });
      }

      await VendorModel.delete(id);

      res.json({
        success: true,
        message: "Vendor deleted successfully",
      });
    } catch (error) {
      console.error("Delete vendor controller error:", error);

      // Handle foreign key constraint errors
      if (error.number === 547) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete vendor. It may be referenced by other records",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to delete vendor",
        details: error.message,
      });
    }
  }
}

module.exports = VendorController;
