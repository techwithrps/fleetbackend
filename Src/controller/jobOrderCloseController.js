const JobOrderCloseModel = require("../models/JobOrderCloseModel");

class JobOrderCloseController {
  static async getAllJobOrderClose(req, res) {
    try {
      const terminalIds = req.user?.role?.toLowerCase() === 'admin' ? null : req.user?.terminalIds;
      const rows = await JobOrderCloseModel.getAll(terminalIds);
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
      const terminalIds = req.user?.role?.toLowerCase() === 'admin' ? null : req.user?.terminalIds;
      const row = await JobOrderCloseModel.getById(id, terminalIds);
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
      const userTerminalIds = req.user?.terminalIds || [];
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        if (!data.terminal_id) {
          return res.status(400).json({ success: false, error: "Terminal selection is required." });
        }
        if (!userTerminalIds.includes(Number(data.terminal_id))) {
          return res.status(403).json({ success: false, error: "You cannot manage job order closes for an unassigned terminal." });
        }
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
