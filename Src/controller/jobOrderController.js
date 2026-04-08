const JobOrderModel = require("../models/JobOrderModel");

class JobOrderController {
  static async getAllJobOrders(req, res) {
    try {
      const { status } = req.query;
      const orders = await JobOrderModel.getAll(status);
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
      const order = await JobOrderModel.getById(id);
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
