const AlertModel = require("../models/alertModel");

class AlertController {
  static async getExpiryAlerts(req, res) {
    try {
      const daysParam = Number(req.query.days);
      const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 10;

      const [vehicleExpiries, driverExpiries] = await Promise.all([
        AlertModel.getVehicleExpiryAlerts(days),
        AlertModel.getDriverExpiryAlerts(days),
      ]);

      res.json({
        success: true,
        data: {
          days,
          vehicleExpiries,
          driverExpiries,
        },
      });
    } catch (error) {
      console.error("Get expiry alerts controller error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to load expiry alerts." });
    }
  }
}

module.exports = AlertController;
