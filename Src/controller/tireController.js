const TireModel = require("../models/TireModel");

class TireController {
  static async getAllTires(req, res) {
    try {
      const tires = await TireModel.getAll();
      res.json({ success: true, data: tires });
    } catch (error) {
      console.error("Get all tires controller error:", error);
      res.status(500).json({
        success: false,
        error: "Unable to fetch tire details. Please try again later.",
      });
    }
  }

  static async getTireById(req, res) {
    try {
      const { id } = req.params;

      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid tire ID is required." });
      }

      const tire = await TireModel.getById(id);
      if (!tire) {
        return res
          .status(404)
          .json({ success: false, error: "Tire not found." });
      }

      res.json({ success: true, data: tire });
    } catch (error) {
      console.error("Get tire by ID controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch tire details." });
    }
  }

  static async createTire(req, res) {
    try {
      const data = req.body;
      if (!data.tire_no) {
        return res.status(400).json({
          success: false,
          error: "Tire Number is required.",
        });
      }

      if (req.user?.id) {
        data.created_by = String(req.user.id);
      }

      const result = await TireModel.create(data);
      res.status(201).json({
        success: true,
        message: "Tire created successfully.",
        data: result,
      });
    } catch (error) {
      console.error("Create tire controller error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create tire.",
      });
    }
  }

  static async updateTire(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid tire ID is required." });
      }

      if (!data.tire_no) {
        return res
          .status(400)
          .json({ success: false, error: "Tire Number is required." });
      }

      const existingTire = await TireModel.getById(id);
      if (!existingTire) {
        return res
          .status(404)
          .json({ success: false, error: "Tire not found." });
      }

      if (req.user?.id) {
        data.updated_by = String(req.user.id);
      }

      await TireModel.update(id, data);
      res.json({ success: true, message: "Tire updated successfully." });
    } catch (error) {
      console.error("Update tire controller error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to update tire.",
      });
    }
  }

  static async deleteTire(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid tire ID is required." });
      }

      const existingTire = await TireModel.getById(id);
      if (!existingTire) {
        return res
          .status(404)
          .json({ success: false, error: "Tire not found." });
      }

      await TireModel.delete(id);
      res.json({ success: true, message: "Tire deleted successfully." });
    } catch (error) {
      console.error("Delete tire controller error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete tire.",
      });
    }
  }

  static async searchTires(req, res) {
    try {
      const { search } = req.query;
      if (!search) {
        return res
          .status(400)
          .json({ success: false, error: "Search text is required." });
      }

      const tires = await TireModel.search(search);
      res.json({ success: true, data: tires });
    } catch (error) {
      console.error("Search tires controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to search tires." });
    }
  }
}

module.exports = TireController;
