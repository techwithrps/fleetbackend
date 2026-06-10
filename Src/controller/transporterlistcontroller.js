const TransporterlistModel = require("../models/Transporterlistmodal");

const TransporterlistController = {
  // GET /api/transporters
  async getAll(req, res) {
    try {
      const data = await TransporterlistModel.getAllTransporters();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch transporters",
        error: error.message,
      });
    }
  },

  // GET /api/transporters/:id
  async getById(req, res) {
    const { id } = req.params;
    try {
      const transporter = await TransporterlistModel.getTransporterById(
        parseInt(id)
      );
      if (!transporter) {
        return res.status(404).json({ message: "Transporter not found" });
      }
      res.status(200).json(transporter);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch transporter", error: error.message });
    }
  },

  // GET /api/transporters/email/:email
  async getByEmail(req, res) {
    const { email } = req.params;
    try {
      const transporter = await TransporterlistModel.getTransporterByEmail(
        email
      );
      if (!transporter) {
        return res.status(404).json({ message: "Transporter not found" });
      }
      res.status(200).json(transporter);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch transporter", error: error.message });
    }
  },
};

module.exports = TransporterlistController;
