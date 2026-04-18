const TireAttachmentModel = require("../models/TireAttachmentModel");

class TireAttachmentController {
  static async getHistory(req, res) {
    try {
      const { equipment_id, bed_id } = req.query;
      const isAdmin = req.user?.role?.toLowerCase() === "admin";
      const terminalIds = (!isAdmin && Array.isArray(req.user?.terminalIds)) 
        ? req.user.terminalIds 
        : null;

      const history = await TireAttachmentModel.getHistory({
        equipment_id,
        bed_id,
      }, terminalIds);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error("Get tire attachment history controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch tire attachments." });
    }
  }

  static async attachTire(req, res) {
    try {
      const data = req.body;
      if (!data.attach_for || !data.tire_id || !data.position_id) {
        return res.status(400).json({
          success: false,
          error: "Attach target, tire, and position are required.",
        });
      }
      if (req.user?.id) {
        data.created_by = String(req.user.id);
      }
      const result = await TireAttachmentModel.attach(data);
      res.status(201).json({
        success: true,
        message: "Tire attached successfully.",
        data: result,
      });
    } catch (error) {
      console.error("Attach tire controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async detachTire(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          error: "Valid attachment ID is required.",
        });
      }
      const data = req.body || {};
      if (req.user?.id) {
        data.updated_by = String(req.user.id);
      }
      await TireAttachmentModel.detach(id, data);
      res.json({ success: true, message: "Tire detached successfully." });
    } catch (error) {
      console.error("Detach tire controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = TireAttachmentController;
