const EquipmentModel = require("../models/EquipmentModel");

class EquipmentController {
  // Get all equipment
  static async getAllEquipment(req, res) {
    try {
      const equipment = await EquipmentModel.getAll();
      res.json({ success: true, data: equipment });
    } catch (error) {
      console.error("Get all equipment controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch equipment." });
    }
  }

  // Get equipment by ID
  static async getEquipmentById(req, res) {
    try {
      const { id } = req.params;
      
      // Validate equipment ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid equipment ID is required." });
      }
      
      const equipment = await EquipmentModel.getById(id);
      
      if (!equipment) {
        return res.status(404).json({ success: false, error: "Equipment not found." });
      }
      
      res.json({ success: true, data: equipment });
    } catch (error) {
      console.error("Get equipment by ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch equipment details." });
    }
  }

  // Create new equipment
  static async createEquipment(req, res) {
    try {
      const data = { ...req.body };

      if (req.files) {
        Object.entries(req.files).forEach(([field, files]) => {
          if (files && files[0]) {
            data[field] = `uploads/vehicles/${files[0].filename}`;
          }
        });
      }
      
      // Validate required fields
      if (!data.EQUIPMENT_NO) {
        return res.status(400).json({ success: false, error: "Equipment number is required." });
      }
      
      const result = await EquipmentModel.create(data);
      res.status(201).json({ 
        success: true, 
        message: "Equipment created successfully", 
        data: { id: result.id } 
      });
    } catch (error) {
      console.error("Create equipment controller error:", error);
      res.status(500).json({ success: false, error: "Failed to create equipment." });
    }
  }

  // Update equipment
  static async updateEquipment(req, res) {
    try {
      const { id } = req.params;
      const data = { ...req.body };

      if (req.files) {
        Object.entries(req.files).forEach(([field, files]) => {
          if (files && files[0]) {
            data[field] = `uploads/vehicles/${files[0].filename}`;
          }
        });
      }
      
      // Validate equipment ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid equipment ID is required." });
      }
      
      // Validate required fields
      if (!data.EQUIPMENT_NO) {
        return res.status(400).json({ success: false, error: "Equipment number is required." });
      }
      
      // Check if equipment exists
      const existingEquipment = await EquipmentModel.getById(id);
      if (!existingEquipment) {
        return res.status(404).json({ success: false, error: "Equipment not found." });
      }
      
      await EquipmentModel.update(id, data);
      res.json({ success: true, message: "Equipment updated successfully" });
    } catch (error) {
      console.error("Update equipment controller error:", error);
      res.status(500).json({ success: false, error: "Failed to update equipment." });
    }
  }

  // Delete equipment
  static async deleteEquipment(req, res) {
    try {
      const { id } = req.params;
      
      // Validate equipment ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid equipment ID is required." });
      }
      
      // Check if equipment exists
      const existingEquipment = await EquipmentModel.getById(id);
      if (!existingEquipment) {
        return res.status(404).json({ success: false, error: "Equipment not found." });
      }
      
      await EquipmentModel.delete(id);
      res.json({ success: true, message: "Equipment deleted successfully" });
    } catch (error) {
      console.error("Delete equipment controller error:", error);
      res.status(500).json({ success: false, error: "Failed to delete equipment." });
    }
  }
}

module.exports = EquipmentController;
