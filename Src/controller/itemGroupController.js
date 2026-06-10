const ItemGroupModel = require("../models/ItemGroupModel");

const itemGroupController = {
  getAllGroups: async (req, res) => {
    try {
      const groups = await ItemGroupModel.getAllGroups();
      res.status(200).json({ success: true, data: groups });
    } catch (error) {
      console.error("Error fetching item groups:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
  },

  createGroup: async (req, res) => {
    try {
      const data = req.body;
      const newGroup = await ItemGroupModel.createGroup(data);
      res.status(201).json({ success: true, message: "Item Group created successfully", data: newGroup });
    } catch (error) {
      console.error("Error creating item group:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
  }
};

module.exports = itemGroupController;
