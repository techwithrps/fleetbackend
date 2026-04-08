const FleetEquipmentModel = require("../models/FleetEquipmentModel");

class FleetEquipmentController {
  // Get all fleet equipment
  static async getAllFleetEquipment(req, res) {
    try {
      const equipment = await FleetEquipmentModel.getAll();
      res.json({ success: true, data: equipment });
    } catch (error) {
      console.error("Get all fleet equipment controller error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch fleet equipment.",
        details: error.message 
      });
    }
  }

  // Get fleet equipment by ID
  static async getFleetEquipmentById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid equipment ID provided." 
        });
      }

      const equipment = await FleetEquipmentModel.getById(id);
      if (!equipment) {
        return res.status(404).json({ 
          success: false, 
          error: "Fleet equipment not found." 
        });
      }
      
      res.json({ success: true, data: equipment });
    } catch (error) {
      console.error("Get fleet equipment by ID controller error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch fleet equipment details.",
        details: error.message 
      });
    }
  }

  // Create new fleet equipment
  static async createFleetEquipment(req, res) {
    try {
      const data = req.body;
      
      // Basic validation
      if (!data.equipment_name || data.equipment_name.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: "Equipment name is required." 
        });
      }

      // Add created_by from authenticated user if available
      if (req.user && req.user.userId) {
        data.created_by = req.user.userId;
      }

      const result = await FleetEquipmentModel.create(data);
      res.status(201).json({ 
        success: true, 
        message: "Fleet equipment created successfully.", 
        data: result 
      });
    } catch (error) {
      console.error("Create fleet equipment controller error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to create fleet equipment.",
        details: error.message 
      });
    }
  }

  // Update fleet equipment
  static async updateFleetEquipment(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid equipment ID provided." 
        });
      }

      if (!data.equipment_name || data.equipment_name.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: "Equipment name is required." 
        });
      }

      // Check if equipment exists
      const existingEquipment = await FleetEquipmentModel.getById(id);
      if (!existingEquipment) {
        return res.status(404).json({ 
          success: false, 
          error: "Fleet equipment not found." 
        });
      }

      await FleetEquipmentModel.update(id, data);
      res.json({ 
        success: true, 
        message: "Fleet equipment updated successfully." 
      });
    } catch (error) {
      console.error("Update fleet equipment controller error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to update fleet equipment.",
        details: error.message 
      });
    }
  }

  // Delete fleet equipment
  static async deleteFleetEquipment(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid equipment ID provided." 
        });
      }

      // Check if equipment exists
      const existingEquipment = await FleetEquipmentModel.getById(id);
      if (!existingEquipment) {
        return res.status(404).json({ 
          success: false, 
          error: "Fleet equipment not found." 
        });
      }

      await FleetEquipmentModel.delete(id);
      res.json({ 
        success: true, 
        message: "Fleet equipment deleted successfully." 
      });
    } catch (error) {
      console.error("Delete fleet equipment controller error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to delete fleet equipment.",
        details: error.message 
      });
    }
  }
}

module.exports = FleetEquipmentController;