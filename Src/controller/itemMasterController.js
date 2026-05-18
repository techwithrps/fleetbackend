const ItemMasterModel = require("../models/ItemMasterModel");

class ItemMasterController {
  static async getAllItems(req, res) {
    try {
      const isAdmin = req.user?.role?.toLowerCase() === "admin";
      const selectedTerminalId =
        req.user?.terminalId && String(req.user.terminalId).toUpperCase() !== "ALL"
          ? Number(req.user.terminalId)
          : null;
      const terminalScope = Number.isFinite(selectedTerminalId)
        ? [selectedTerminalId]
        : (isAdmin ? null : req.user?.terminalIds);
      const items = await ItemMasterModel.getAll(terminalScope);
      res.json({ success: true, data: items });
    } catch (error) {
      console.error("Get all items controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch items." });
    }
  }

  static async getItemById(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({ success: false, error: "Valid item ID is required." });
      }
      const isAdmin = req.user?.role?.toLowerCase() === "admin";
      const selectedTerminalId =
        req.user?.terminalId && String(req.user.terminalId).toUpperCase() !== "ALL"
          ? Number(req.user.terminalId)
          : null;
      const terminalScope = Number.isFinite(selectedTerminalId)
        ? [selectedTerminalId]
        : (isAdmin ? null : req.user?.terminalIds);
      const item = await ItemMasterModel.getById(id, terminalScope);
      if (!item) {
        return res.status(404).json({ success: false, error: "Item not found." });
      }
      res.json({ success: true, data: item });
    } catch (error) {
      console.error("Get item by ID controller error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch item." });
    }
  }

  static async createItem(req, res) {
    try {
      const data = req.body;
      if (!data.item_code || !data.item_name) {
        return res.status(400).json({ success: false, error: "Item code and name are required." });
      }
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!data.terminal_id || !isAdmin) {
        data.terminal_id = req.user?.terminalId !== 'ALL' ? req.user?.terminalId : data.terminal_id;
      }
      
      if (!isAdmin && !data.terminal_id) {
        return res.status(400).json({ success: false, error: "Terminal context missing." });
      }
      if (req.user?.id) {
        data.created_by = String(req.user.id);
      }
      const result = await ItemMasterModel.create(data);
      res.status(201).json({ success: true, message: "Item created.", data: result });
    } catch (error) {
      console.error("Create item controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateItem(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({ success: false, error: "Valid item ID is required." });
      }
      if (!data.item_code || !data.item_name) {
        return res.status(400).json({ success: false, error: "Item code and name are required." });
      }
      const userTerminalIds = req.user?.terminalIds || [];
      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        if (!data.terminal_id) {
          return res.status(400).json({ success: false, error: "Terminal selection is required." });
        }
        if (!userTerminalIds.includes(Number(data.terminal_id))) {
          return res.status(403).json({ success: false, error: "You cannot manage items for an unassigned terminal." });
        }
      }
      
      const terminalIds = req.user?.role?.toLowerCase() === 'admin' ? null : req.user?.terminalIds;
      const existing = await ItemMasterModel.getById(id, terminalIds);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Item not found." });
      }
      if (req.user?.id) {
        data.updated_by = String(req.user.id);
      }
      await ItemMasterModel.update(id, data);
      res.json({ success: true, message: "Item updated." });
    } catch (error) {
      console.error("Update item controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteItem(req, res) {
    try {
      const { id } = req.params;
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({ success: false, error: "Valid item ID is required." });
      }
      const terminalId = (req.user?.role?.toLowerCase() === 'admin' && String(req.user?.terminalId) === 'ALL') ? null : req.user?.terminalId;
      const existing = await ItemMasterModel.getById(id, terminalId);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Item not found or access denied." });
      }

      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      
      if (!isAdmin) {
        await ItemMasterModel.update(id, { ...existing, status: 'Inactive' });
        return res.json({ success: true, message: "Item disabled successfully (Status set to Inactive)." });
      }

      await ItemMasterModel.delete(id);
      res.json({ success: true, message: "Item deleted successfully." });
    } catch (error) {
      console.error("Delete item controller error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = ItemMasterController;
