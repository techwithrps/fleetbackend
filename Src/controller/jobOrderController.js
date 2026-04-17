const JobOrderModel = require("../models/JobOrderModel");

class JobOrderController {
  static async getAllJobOrders(req, res) {
    try {
      const { status } = req.query;
      const terminalId = (req.user?.role?.toLowerCase() === 'admin' && String(req.user?.terminalId) === 'ALL') ? null : req.user?.terminalId;
      const orders = await JobOrderModel.getAll(status, terminalId);
      res.json({ success: true, data: orders });
    } catch (error) {
      console.error("Get all job orders controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch job orders." });
    }
  }

  static async getJobOrderById(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid job order ID is required." });
      }
      const terminalId = (req.user?.role?.toLowerCase() === 'admin' && String(req.user?.terminalId) === 'ALL') ? null : req.user?.terminalId;
      const order = await JobOrderModel.getById(id, terminalId);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, error: "Job order not found." });
      }
      res.json({ success: true, data: order });
    } catch (error) {
      console.error("Get job order by ID controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch job order." });
    }
  }

  static async createJobOrder(req, res) {
    try {
      const data = req.body;
      if (!data.jo_type) {
        return res
          .status(400)
          .json({ success: false, error: "JO type is required." });
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
      const result = await JobOrderModel.create(data);
      res
        .status(201)
        .json({ success: true, message: "Job order created.", data: result });
    } catch (error) {
      console.error("Create job order controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateJobOrder(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      if (!id || Number.isNaN(Number(id))) {
        return res
          .status(400)
          .json({ success: false, error: "Valid job order ID is required." });
      }
      const userTerminalIds = req.user?.terminalIds || [];
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        if (!data.terminal_id) {
          return res.status(400).json({ success: false, error: "Terminal selection is required." });
        }
        if (!userTerminalIds.includes(Number(data.terminal_id))) {
          return res.status(403).json({ success: false, error: "You cannot manage job orders for an unassigned terminal." });
        }
      }
      if (req.user?.id) {
        data.updated_by = String(req.user.id);
      }
      await JobOrderModel.update(id, data);
      res.json({ success: true, message: "Job order updated." });
    } catch (error) {
      console.error("Update job order controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = JobOrderController;
