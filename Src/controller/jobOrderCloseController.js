const JobOrderCloseModel = require("../models/JobOrderCloseModel");

class JobOrderCloseController {
  static async getAllJobOrderClose(req, res) {
    try {
      const rows = await JobOrderCloseModel.getAll();
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error("Get job order close controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch job order closes." });
    }
  }

  static async getJobOrderCloseById(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid close ID is required." });
      }
      const row = await JobOrderCloseModel.getById(id);
      if (!row) {
        return res
          .status(404)
          .json({ success: false, error: "Job order close not found." });
      }
      res.json({ success: true, data: row });
    } catch (error) {
      console.error("Get job order close by ID controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch job order close." });
    }
  }

  static async createJobOrderClose(req, res) {
    try {
      const data = req.body;
      if (!data.jo_id) {
        return res
          .status(400)
          .json({ success: false, error: "JO ID is required." });
      }
      if (req.user?.id) {
        data.created_by = String(req.user.id);
      }
      const result = await JobOrderCloseModel.create(data);
      res.status(201).json({
        success: true,
        message: "Job order closed successfully.",
        data: result,
      });
    } catch (error) {
      console.error("Create job order close controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = JobOrderCloseController;
