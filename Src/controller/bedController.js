const BedModel = require("../models/BedModel");

class BedController {
  static async getAllBeds(req, res) {
    try {
      const beds = await BedModel.getAll();
      res.json({ success: true, data: beds });
    } catch (error) {
      console.error("Get all beds controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch beds." });
    }
  }

  static async getBedById(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid bed ID is required." });
      }
      const bed = await BedModel.getById(id);
      if (!bed) {
        return res
          .status(404)
          .json({ success: false, error: "Bed not found." });
      }
      res.json({ success: true, data: bed });
    } catch (error) {
      console.error("Get bed by ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch bed." });
    }
  }

  static async createBed(req, res) {
    try {
      const data = req.body;
      if (!data.bed_no) {
        return res
          .status(400)
          .json({ success: false, error: "Bed number is required." });
      }
      if (req.user?.id) {
        data.created_by = String(req.user.id);
      }
      const result = await BedModel.create(data);
      res
        .status(201)
        .json({ success: true, message: "Bed created.", data: result });
    } catch (error) {
      console.error("Create bed controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateBed(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid bed ID is required." });
      }
      if (!data.bed_no) {
        return res
          .status(400)
          .json({ success: false, error: "Bed number is required." });
      }
      const existing = await BedModel.getById(id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: "Bed not found." });
      }
      if (req.user?.id) {
        data.updated_by = String(req.user.id);
      }
      await BedModel.update(id, data);
      res.json({ success: true, message: "Bed updated." });
    } catch (error) {
      console.error("Update bed controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteBed(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid bed ID is required." });
      }
      const existing = await BedModel.getById(id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: "Bed not found." });
      }
      await BedModel.delete(id);
      res.json({ success: true, message: "Bed deleted." });
    } catch (error) {
      console.error("Delete bed controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = BedController;
