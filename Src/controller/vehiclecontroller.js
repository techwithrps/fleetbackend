const vehicleModel = require("../models/vehiclemode");

const getAllVehicles = async (req, res) => {
  try {
    const vehicles = await vehicleModel.getAllVehicles();
    res.status(200).json(vehicles);
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getAllVehicles,
};
