const BedModel = require("../models/BedModel");

class BedController {
  static async getAllBeds(req, res) {
    try {
      const terminalId = (req.user?.role?.toLowerCase() === 'admin' && String(req.user?.terminalId) === 'ALL') ? null : req.user?.terminalId;
      const beds = await BedModel.getAll(terminalId);
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
      const terminalId = (req.user?.role?.toLowerCase() === 'admin' && String(req.user?.terminalId) === 'ALL') ? null : req.user?.terminalId;
      const bed = await BedModel.getById(id, terminalId);
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
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      // Auto-tag terminal_id from selected terminal if not provided or for customer
      if (!data.terminal_id || !isAdmin) {
        data.terminal_id = req.user?.terminalId !== 'ALL' ? req.user?.terminalId : data.terminal_id;
      }
      
      if (!isAdmin && !data.terminal_id) {
        return res.status(400).json({ success: false, error: "Terminal context missing." });
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
      const userTerminalIds = req.user?.terminalIds || [];
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        if (!data.terminal_id) {
          return res.status(400).json({ success: false, error: "Terminal selection is required." });
        }
        if (!userTerminalIds.includes(Number(data.terminal_id))) {
          return res.status(403).json({ success: false, error: "You cannot manage beds for an unassigned terminal." });
        }
      }
      const terminalIds = req.user?.role?.toLowerCase() === 'admin' ? null : req.user?.terminalIds;
      const existing = await BedModel.getById(id, terminalIds);
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
      const terminalId = (req.user?.role?.toLowerCase() === 'admin' && String(req.user?.terminalId) === 'ALL') ? null : req.user?.terminalId;
      const existing = await BedModel.getById(id, terminalId);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: "Bed not found or access denied." });
      }

      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        // Customer can only disable data
        await BedModel.update(id, { ...existing, status: 'Inactive' });
        return res.json({ success: true, message: "Bed disabled successfully (Status set to Inactive)." });
      }

      await BedModel.delete(id);
      res.json({ success: true, message: "Bed deleted successfully." });
    } catch (error) {
      console.error("Delete bed controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = BedController;
