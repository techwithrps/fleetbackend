const TirePositionModel = require("../models/TirePositionModel");

class TirePositionController {
  static async getAllPositions(req, res) {
    try {
      const positions = await TirePositionModel.getAll();
      res.json({ success: true, data: positions });
    } catch (error) {
      console.error("Get all tire positions controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch positions." });
    }
  }

  static async getPositionById(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid position ID is required." });
      }
      const position = await TirePositionModel.getById(id);
      if (!position) {
        return res
          .status(404)
          .json({ success: false, error: "Position not found." });
      }
      res.json({ success: true, data: position });
    } catch (error) {
      console.error("Get tire position by ID controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch position." });
    }
  }

  static async createPosition(req, res) {
    try {
      const data = req.body;
      if (!data.position_code || !data.position_name) {
        return res.status(400).json({
          success: false,
          error: "Position code and name are required.",
        });
      }
      if (req.user?.id) {
        data.created_by = String(req.user.id);
      }
      const result = await TirePositionModel.create(data);
      res
        .status(201)
        .json({ success: true, message: "Position created.", data: result });
    } catch (error) {
      console.error("Create tire position controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updatePosition(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid position ID is required." });
      }
      if (!data.position_code || !data.position_name) {
        return res.status(400).json({
          success: false,
          error: "Position code and name are required.",
        });
      }
      const existing = await TirePositionModel.getById(id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: "Position not found." });
      }
      if (req.user?.id) {
        data.updated_by = String(req.user.id);
      }
      await TirePositionModel.update(id, data);
      res.json({ success: true, message: "Position updated." });
    } catch (error) {
      console.error("Update tire position controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deletePosition(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid position ID is required." });
      }
      const existing = await TirePositionModel.getById(id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: "Position not found." });
      }
      await TirePositionModel.delete(id);
      res.json({ success: true, message: "Position deleted." });
    } catch (error) {
      console.error("Delete tire position controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = TirePositionController;
