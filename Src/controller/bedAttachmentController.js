const BedAttachmentModel = require("../models/BedAttachmentModel");

class BedAttachmentController {
  static async getHistory(req, res) {
    try {
      const { equipment_id, bed_id } = req.query;
      const history = await BedAttachmentModel.getHistory({
        equipment_id,
        bed_id,
      });
      res.json({ success: true, data: history });
    } catch (error) {
      console.error("Get bed attachment history controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch bed attachments." });
    }
  }

  static async attachBed(req, res) {
    try {
      const data = req.body;
      if (!data.equipment_id || !data.bed_id) {
        return res.status(400).json({
          success: false,
          error: "Equipment ID and Bed ID are required.",
        });
      }
      if (req.user?.id) {
        data.created_by = String(req.user.id);
      }
      const result = await BedAttachmentModel.attach(data);
      res.status(201).json({
        success: true,
        message: "Bed attached successfully.",
        data: result,
      });
    } catch (error) {
      console.error("Attach bed controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async detachBed(req, res) {
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
      await BedAttachmentModel.detach(id, data);
      res.json({ success: true, message: "Bed detached successfully." });
    } catch (error) {
      console.error("Detach bed controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = BedAttachmentController;
