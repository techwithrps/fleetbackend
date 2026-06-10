const DriverModel = require("../models/DriverModel");
const {
  validateDriverPayload,
  normalizeDriverPayload,
} = require("../utils/indiaValidators");

class DriverController {
  static async getAllDrivers(req, res) {
    try {
      const drivers = await DriverModel.getAll(req.user);
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
      
      if (!vendorId || isNaN(vendorId)) {
        return res.status(400).json({ success: false, error: "Valid vendor ID is required." });
      }
      
      const drivers = await DriverModel.getByVendorId(vendorId, req.user);
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
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid driver ID is required." });
      }
      
      const driver = await DriverModel.getById(id, req.user);
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
      const data = normalizeDriverPayload(req.body);
      
      // Validate required fields
      if (!data.vendor_id) {
        return res.status(400).json({ success: false, error: "Vendor ID is required." });
      }
      
      if (!data.driver_name) {
        return res.status(400).json({ success: false, error: "Driver name is required." });
      }
      
      if (isNaN(data.vendor_id)) {
        return res.status(400).json({ success: false, error: "Vendor ID must be a valid number." });
      }

      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      // Auto-tag terminal_id from selected terminal if not provided or for customer
      if (!data.terminal_id || !isAdmin) {
        data.terminal_id = req.user?.terminalId !== 'ALL' ? req.user?.terminalId : data.terminal_id;
      }
      
      if (!isAdmin && !data.terminal_id) {
        return res.status(400).json({ success: false, error: "Terminal context missing." });
      }

      const validationErrors = validateDriverPayload(data);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed.",
          details: validationErrors,
        });
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
      const data = normalizeDriverPayload(req.body);
      
      // Validate driver ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid driver ID is required." });
      }
      
      // Validate required fields
      if (!data.driver_name) {
        return res.status(400).json({ success: false, error: "Driver name is required." });
      }
      
      if (data.vendor_id && isNaN(data.vendor_id)) {
        return res.status(400).json({ success: false, error: "Vendor ID must be a valid number." });
      }

      const userTerminalIds = req.user?.terminalIds || [];
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        if (!data.terminal_id) {
          return res.status(400).json({ success: false, error: "Terminal selection is required." });
        }
        if (!userTerminalIds.includes(Number(data.terminal_id))) {
          return res.status(403).json({ success: false, error: "You cannot manage drivers for an unassigned terminal." });
        }
      }

      const validationErrors = validateDriverPayload(data);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed.",
          details: validationErrors,
        });
      }
      
      // Check if driver exists
      const existingDriver = await DriverModel.getById(id, req.user);
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
      
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, error: "Valid driver ID is required." });
      }
      
      // Check if driver exists
      const existingDriver = await DriverModel.getById(id, req.user);
      if (!existingDriver) {
        return res.status(404).json({ success: false, error: "Driver not found." });
      }

      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        // Customer can only disable data
        await DriverModel.update(id, { ...existingDriver, status: 'Inactive' });
        return res.json({ success: true, message: "Driver disabled successfully (Status set to Inactive)." });
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
      const vendors = await DriverModel.getVendors(req.user);
      res.json({ success: true, data: vendors });
    } catch (error) {
      console.error("Get vendors controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch vendors." });
    }
  }
}

module.exports = DriverController;
