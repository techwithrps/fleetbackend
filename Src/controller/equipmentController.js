const EquipmentModel = require("../models/EquipmentModel");
const {
  validateEquipmentPayload,
  normalizeEquipmentPayload,
} = require("../utils/indiaValidators");

class EquipmentController {
  // Get all vehicles
  static async getAllEquipment(req, res) {
    try {
      const equipment = await EquipmentModel.getAll();
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
      
      const equipment = await EquipmentModel.getById(id);
      
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
          if (files && files[0]) {
            data[field] = `uploads/vehicles/${files[0].filename}`;
          }
        });
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
          if (files && files[0]) {
            data[field] = `uploads/vehicles/${files[0].filename}`;
          }
        });
      }
      
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
      const existingEquipment = await EquipmentModel.getById(id);
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
      
      // Check if vehicle exists
      const existingEquipment = await EquipmentModel.getById(id);
      if (!existingEquipment) {
        return res.status(404).json({ success: false, error: "Vehicle not found." });
      }
      
      await EquipmentModel.delete(id);
      res.json({ success: true, message: "Vehicle deleted successfully" });
    } catch (error) {
      console.error("Delete vehicle controller error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to delete vehicle." });
    }
  }
}

module.exports = EquipmentController;
