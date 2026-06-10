const ServiceMasterModal = require("../models/servicemodel");

const ServiceMasterController = {
  // GET /api/services
  async getAll(req, res) {
    try {
      const services = await ServiceMasterModal.getAll();
      res.status(200).json(services);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch services", error: error.message });
    }
  },

  // GET /api/services/:id
  async getById(req, res) {
    const { id } = req.params;
    try {
      const service = await ServiceMasterModal.getById(parseInt(id));
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.status(200).json(service);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch service", error: error.message });
    }
  },

  // POST /api/services
  async create(req, res) {
    try {
      const result = await ServiceMasterModal.create(req.body);
      res.status(201).json({ message: "Service created successfully", result });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to create service", error: error.message });
    }
  },
};

module.exports = ServiceMasterController;
