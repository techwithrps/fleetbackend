const DriverModel = require("../models/DriverModel");

class DriverController {
  // Get all drivers
  static async getAllDrivers(req, res) {
    try {
      const drivers = await DriverModel.getAll();
      res.json({ success: true, data: drivers });
    } catch (error) {
      console.error("Get all drivers controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch drivers." });
    }
  }

  // Get drivers by vendor ID
  static async getDriversByVendorId(req, res) {
    try {
      const { vendorId } = req.params;
      
      // Validate vendorId
      if (!vendorId || isNaN(vendorId)) {
        return res.status(400).json({ success: false, error: "Valid vendor ID is required." });
      }
      
      const drivers = await DriverModel.getByVendorId(vendorId);
      res.json({ success: true, data: drivers });
    } catch (error) {
      console.error("Get drivers by vendor ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch drivers for this vendor." });
    }
  }

  // Get driver by ID
  static async getDriverById(req, res) {
    try {
      const { id } = req.params;
      
      // Validate driver ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid driver ID is required." });
      }
      
      const driver = await DriverModel.getById(id);
      if (!driver) {
        return res.status(404).json({ success: false, message: "Driver not found." });
      }
      res.json({ success: true, data: driver });
    } catch (error) {
      console.error("Get driver by ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch driver details." });
    }
  }

  // Create new driver
  static async createDriver(req, res) {
    try {
      const data = req.body;
      
      // Validate required fields
      if (!data.vendor_id) {
        return res.status(400).json({ success: false, error: "Vendor ID is required." });
      }
      
      if (!data.driver_name) {
        return res.status(400).json({ success: false, error: "Driver name is required." });
      }
      
      // Validate vendor_id is numeric
      if (isNaN(data.vendor_id)) {
        return res.status(400).json({ success: false, error: "Vendor ID must be a valid number." });
      }
      
      // Add created_by if available from auth middleware
      if (req.user && req.user.userId) {
        data.created_by = req.user.userId;
      }
      
      const result = await DriverModel.create(data);
      res.status(201).json({ success: true, message: "Driver created successfully.", data: result });
    } catch (error) {
      console.error("Create driver controller error:", error);
      
      // Handle foreign key constraint error
      if (error.message && (error.message.includes('FK_DRIVER_VENDOR') || error.message.includes('FOREIGN KEY'))) {
        return res.status(400).json({ success: false, error: "Invalid vendor ID. Vendor does not exist." });
      }
      
      // Handle duplicate key error
      if (error.message && error.message.includes('PRIMARY KEY')) {
        return res.status(400).json({ success: false, error: "Driver ID already exists. Please try again." });
      }
      
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to create driver." 
      });
    }
  }

  // Update driver
  static async updateDriver(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // Validate driver ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid driver ID is required." });
      }
      
      // Validate required fields
      if (!data.driver_name) {
        return res.status(400).json({ success: false, error: "Driver name is required." });
      }
      
      // Validate vendor_id if provided
      if (data.vendor_id && isNaN(data.vendor_id)) {
        return res.status(400).json({ success: false, error: "Vendor ID must be a valid number." });
      }
      
      // Check if driver exists
      const existingDriver = await DriverModel.getById(id);
      if (!existingDriver) {
        return res.status(404).json({ success: false, error: "Driver not found." });
      }
      
      await DriverModel.update(id, data);
      res.json({ success: true, message: "Driver updated successfully." });
    } catch (error) {
      console.error("Update driver controller error:", error);
      
      // Handle foreign key constraint error
      if (error.message && (error.message.includes('FK_DRIVER_VENDOR') || error.message.includes('FOREIGN KEY'))) {
        return res.status(400).json({ success: false, error: "Invalid vendor ID. Vendor does not exist." });
      }
      
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to update driver." 
      });
    }
  }

  // Delete driver
  static async deleteDriver(req, res) {
    try {
      const { id } = req.params;
      
      // Validate driver ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid driver ID is required." });
      }
      
      // Check if driver exists
      const existingDriver = await DriverModel.getById(id);
      if (!existingDriver) {
        return res.status(404).json({ success: false, error: "Driver not found." });
      }
      
      await DriverModel.delete(id);
      res.json({ success: true, message: "Driver deleted successfully." });
    } catch (error) {
      console.error("Delete driver controller error:", error);
      
      // Handle foreign key constraint error (if driver is referenced in other tables)
      if (error.message && error.message.includes('FOREIGN KEY')) {
        return res.status(400).json({ 
          success: false, 
          error: "Cannot delete driver. Driver is being used in other records." 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to delete driver." 
      });
    }
  }

  // Get vendors for dropdown
  static async getVendors(req, res) {
    try {
      const vendors = await DriverModel.getVendors();
      res.json({ success: true, data: vendors });
    } catch (error) {
      console.error("Get vendors controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch vendors." });
    }
  }
}

module.exports = DriverController;