const TransporterDetailsModal = require("../models/Transporterdetailsmodal"); // Adjust path if needed

class TransporterController {
  // Create new transporter
  static async createTransporter(req, res) {
    try {
      const data = req.body;
      await TransporterDetailsModal.create(data);
      res.status(201).json({ success: true, message: "Transporter created successfully." });
    } catch (error) {
      console.error("Create transporter controller error:", error);
      res.status(500).json({ success: false, error: "Failed to create transporter." });
    }
  }

  // Get transporter by ID
  static async getTransporterById(req, res) {
    try {
      const { id } = req.params;
      const transporter = await TransporterDetailsModal.getById(parseInt(id));
      if (!transporter) {
        return res.status(404).json({ success: false, message: "Transporter not found." });
      }
      res.json({ success: true, transporter });
    } catch (error) {
      console.error("Get transporter by ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch transporter details." });
    }
  }

  // Get all transporters
  static async getAllTransporters(req, res) {
    try {
      const transporters = await TransporterDetailsModal.getAll();
      res.json({ success: true, transporters });
    } catch (error) {
      console.error("Get all transporters controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch transporters." });
    }
  }

  // Update transporter by ID
  static async updateTransporter(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      await TransporterDetailsModal.update(parseInt(id), data);
      res.json({ success: true, message: "Transporter updated successfully." });
    } catch (error) {
      console.error("Update transporter controller error:", error);
      res.status(500).json({ success: false, error: "Failed to update transporter." });
    }
  }

  // Delete transporter by ID
  static async deleteTransporter(req, res) {
    try {
      const { id } = req.params;
      await TransporterDetailsModal.delete(parseInt(id));
      res.json({ success: true, message: "Transporter deleted successfully." });
    } catch (error) {
      console.error("Delete transporter controller error:", error);
      res.status(500).json({ success: false, error: "Failed to delete transporter." });
    }
  }
}

module.exports = TransporterController;
