const EquipmentModel = require("../models/EquipmentModel");
const {
  validateEquipmentPayload,
  normalizeEquipmentPayload,
} = require("../utils/indiaValidators");

class EquipmentController {
  static coerceDocToBufferOrNull(value) {
    if (!value) return null;
    if (Buffer.isBuffer(value)) return value;

    if (typeof value !== "string") return null;

    const s = value.trim();
    if (!s) return null;

    // Existing "view current doc" URLs should not be sent back as payload for binary columns.
    if (/^api\/equipment\/\d+\/document\//i.test(s)) return null;
    if (/^https?:\/\//i.test(s)) return null;
    if (/^uploads\//i.test(s)) return null;

    // Handle data URLs: data:application/pdf;base64,xxxx
    const dataUrlMatch = s.match(/^data:.*;base64,(.+)$/i);
    const base64Payload = dataUrlMatch ? dataUrlMatch[1] : s;

    // Guardrail: Only treat as base64 if it looks like base64 and is reasonably long.
    if (!/^[a-z0-9+/=\r\n]+$/i.test(base64Payload) || base64Payload.length < 32) {
      return null;
    }

    try {
      return Buffer.from(base64Payload, "base64");
    } catch {
      return null;
    }
  }

  // Get all vehicles
  static async getAllEquipment(req, res) {
    try {
      const equipment = await EquipmentModel.getAll(req.user);
      res.json({ success: true, data: equipment });
    } catch (error) {
      console.error("Get all vehicle controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch vehicles." });
    }
  }

  // Get vehicle by ID
  static async getEquipmentById(req, res) {
    try {
      const { id } = req.params;
      
      // Validate vehicle ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid vehicle ID is required." });
      }
      
      const equipment = await EquipmentModel.getById(id, req.user);
      
      if (!equipment) {
        return res.status(404).json({ success: false, error: "Vehicle not found." });
      }
      
      res.json({ success: true, data: equipment });
    } catch (error) {
      console.error("Get vehicle by ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch vehicle details." });
    }
  }

  // Create new vehicle
  static async createEquipment(req, res) {
    try {
      let data = normalizeEquipmentPayload({ ...req.body });

      if (req.files) {
        Object.entries(req.files).forEach(([field, files]) => {
          if (files && files[0] && files[0].buffer) {
            // Map file field name to uppercase to match model expectation
            const upperField = field.toUpperCase();
            data[upperField] = files[0].buffer;
          }
        });
      }
      
      // Ensure specific document/image fields are Buffers or null to prevent mssql conversion errors
      const docFields = ["IMAGE", "FITNESS_DOC", "RC_DOC", "INSURANCE_DOC", "PERMIT_A", "PERMIT_B"];
      docFields.forEach((field) => {
        data[field] = EquipmentController.coerceDocToBufferOrNull(data[field]);
      });
      
      // Validate required fields
      if (!data.EQUIPMENT_NO) {
        return res.status(400).json({ success: false, error: "Vehicle number is required." });
      }

      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      // Auto-tag terminal_id from selected terminal if not provided or for customer
      if (!data.TERMINAL_ID || !isAdmin) {
        data.TERMINAL_ID = req.user?.terminalId !== 'ALL' ? req.user?.terminalId : data.TERMINAL_ID;
      }

      const validationErrors = validateEquipmentPayload(data);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed.",
          details: validationErrors,
        });
      }
      
      const result = await EquipmentModel.create(data);
      res.status(201).json({ 
        success: true, 
        message: "Vehicle created successfully", 
        data: { id: result.id } 
      });
    } catch (error) {
      console.error("Create vehicle controller error:", error);
      if (error.message === "Vehicle number already exists.") {
        return res.status(400).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message || "Failed to create vehicle." });
    }
  }

  // Update vehicle
  static async updateEquipment(req, res) {
    try {
      const { id } = req.params;
      let data = normalizeEquipmentPayload({ ...req.body });

      if (req.files) {
        Object.entries(req.files).forEach(([field, files]) => {
          if (files && files[0] && files[0].buffer) {
            // Map file field name to uppercase to match model expectation
            const upperField = field.toUpperCase();
            data[upperField] = files[0].buffer;
          }
        });
      }
      
      // Ensure specific document/image fields are Buffers or null to prevent mssql conversion errors
      const docFields = ["IMAGE", "FITNESS_DOC", "RC_DOC", "INSURANCE_DOC", "PERMIT_A", "PERMIT_B"];
      docFields.forEach((field) => {
        data[field] = EquipmentController.coerceDocToBufferOrNull(data[field]);
      });
      
      // Validate vehicle ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid vehicle ID is required." });
      }
      
      // Validate required fields
      if (!data.EQUIPMENT_NO) {
        return res.status(400).json({ success: false, error: "Vehicle number is required." });
      }

      const validationErrors = validateEquipmentPayload(data);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed.",
          details: validationErrors,
        });
      }
      
      // Check if vehicle exists
      const existingEquipment = await EquipmentModel.getById(id, req.user);
      if (!existingEquipment) {
        return res.status(404).json({ success: false, error: "Vehicle not found." });
      }
      
      await EquipmentModel.update(id, data);
      res.json({ success: true, message: "Vehicle updated successfully" });
    } catch (error) {
      console.error("Update vehicle controller error:", error);
      if (error.message === "Vehicle number already exists.") {
        return res.status(400).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message || "Failed to update vehicle." });
    }
  }

  // Delete vehicle
  static async deleteEquipment(req, res) {
    try {
      const { id } = req.params;
      
      // Validate vehicle ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid vehicle ID is required." });
      }
      
      const existingEquipment = await EquipmentModel.getById(id, req.user);
      if (!existingEquipment) {
        return res.status(404).json({ success: false, error: "Vehicle not found." });
      }

      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        // Customer can only disable data
        await EquipmentModel.update(id, { ...existingEquipment, STATUS: 'I' });
        return res.json({ success: true, message: "Vehicle disabled successfully (Status set to Inactive)" });
      }
      
      await EquipmentModel.delete(id);
      res.json({ success: true, message: "Vehicle deleted successfully" });
    } catch (error) {
      console.error("Delete vehicle controller error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to delete vehicle." });
    }
  }

  // Get raw document
  static async getDocument(req, res) {
    try {
      const { id, docType } = req.params;
      
      const buffer = await EquipmentModel.getDocumentRaw(id, docType.toUpperCase());
      if (!buffer) {
        return res.status(404).send("Document not found");
      }

      const detectMimeType = (buf) => {
        if (!Buffer.isBuffer(buf) || buf.length < 4) return "application/octet-stream";

        // PDF: 25 50 44 46 => %PDF
        if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
          return "application/pdf";
        }
        // PNG
        if (
          buf.length >= 8 &&
          buf[0] === 0x89 &&
          buf[1] === 0x50 &&
          buf[2] === 0x4e &&
          buf[3] === 0x47 &&
          buf[4] === 0x0d &&
          buf[5] === 0x0a &&
          buf[6] === 0x1a &&
          buf[7] === 0x0a
        ) {
          return "image/png";
        }
        // JPEG
        if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
          return "image/jpeg";
        }
        // GIF
        if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
          return "image/gif";
        }
        // WEBP: "RIFF....WEBP"
        if (
          buf.length >= 12 &&
          buf[0] === 0x52 &&
          buf[1] === 0x49 &&
          buf[2] === 0x46 &&
          buf[3] === 0x46 &&
          buf[8] === 0x57 &&
          buf[9] === 0x45 &&
          buf[10] === 0x42 &&
          buf[11] === 0x50
        ) {
          return "image/webp";
        }

        return "application/octet-stream";
      };

      let mimeType = detectMimeType(buffer);
      const upperDocType = String(docType || "").toUpperCase();
      const isDocField = ["FITNESS_DOC", "RC_DOC", "INSURANCE_DOC", "PERMIT_A", "PERMIT_B"].includes(upperDocType);

      // Fallback: these fields are usually PDFs. If magic-byte detection fails, serve as PDF.
      if (isDocField && mimeType === "application/octet-stream") {
        mimeType = "application/pdf";
      }

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", "inline");
      res.send(buffer);
    } catch (error) {
      console.error("Get document controller error:", error);
      res.status(500).send("Error fetching document");
    }
  }
}

module.exports = EquipmentController;
