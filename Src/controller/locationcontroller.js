const locationModel = require("../models/LocationModel");

// Controller to handle GET request
const getLocations = async (req, res) => {
  try {
    const locations = await locationModel.getAllLocations();
    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLocations,
};
