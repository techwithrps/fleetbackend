const ASNMaster = require("../models/asnModel");

const ASNController = {
  // Get all ASN records
  async getAll(req, res) {
    try {
      const records = await ASNMaster.getAll();
      res.status(200).json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (error) {
      console.error("Error in getAll:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch ASN records",
        error: error.message,
      });
    }
  },

  // Get ASN record by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const record = await ASNMaster.getById(parseInt(id));

      if (!record) {
        return res.status(404).json({
          success: false,
          message: "ASN record not found",
        });
      }

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      console.error("Error in getById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch ASN record",
        error: error.message,
      });
    }
  },

  // Create new ASN record
  async create(req, res) {
    try {
      const {
        vin,
        modelCode,
        modelName,
        dealerCode,
        originCode,
        destinationCode,
        originTerminal,
        destinationTerminal,
        invoiceNo,
        invoiceAmount,
        invoiceDate,
        shipmentNo,
      } = req.body;

      // Basic validation for required fields
      if (!originTerminal || !destinationTerminal) {
        return res.status(400).json({
          success: false,
          message: "OriginTerminal and DestinationTerminal are required",
        });
      }

      const newRecord = await ASNMaster.create({
        vin,
        modelCode,
        modelName,
        dealerCode,
        originCode,
        destinationCode,
        originTerminal,
        destinationTerminal,
        invoiceNo,
        invoiceAmount,
        invoiceDate,
        shipmentNo,
      });

      res.status(201).json({
        success: true,
        message: "ASN record created successfully",
        data: newRecord,
      });
    } catch (error) {
      console.error("Error in create:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create ASN record",
        error: error.message,
      });
    }
  },

  // Bulk create ASN records
  async createBulk(req, res) {
    try {
      const { records } = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Records must be a non-empty array",
        });
      }

      // Validate all records
      const validationErrors = [];
      const validatedRecords = records.map((record, index) => {
        const {
          vin = "",
          modelCode = "",
          modelName = "",
          dealerCode = "",
          originCode = "",
          destinationCode = "",
          originTerminal,
          destinationTerminal,
          invoiceNo = "",
          invoiceAmount = 0,
          invoiceDate = "",
          shipmentNo = "",
        } = record;

        // Validate required fields
        if (!originTerminal || !originTerminal.trim()) {
          validationErrors.push(
            `Record ${index + 1}: OriginTerminal is required`
          );
        }
        if (!destinationTerminal || !destinationTerminal.trim()) {
          validationErrors.push(
            `Record ${index + 1}: DestinationTerminal is required`
          );
        }

        return {
          vin,
          modelCode,
          modelName,
          dealerCode,
          originCode,
          destinationCode,
          originTerminal: originTerminal || "",
          destinationTerminal: destinationTerminal || "",
          invoiceNo,
          invoiceAmount: parseFloat(invoiceAmount) || 0,
          invoiceDate,
          shipmentNo,
        };
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation errors in bulk upload",
          errors: validationErrors,
        });
      }

      // Create all valid records
      const createdRecords = await Promise.all(
        validatedRecords.map(async (record) => {
          try {
            return await ASNMaster.create(record);
          } catch (error) {
            return {
              error: true,
              message: `Failed to create record: ${error.message}`,
              data: record,
            };
          }
        })
      );

      // Check for any creation errors
      const creationErrors = createdRecords.filter((record) => record?.error);
      if (creationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Some records failed to create",
          errors: creationErrors,
        });
      }

      res.status(201).json({
        success: true,
        message: `Successfully created ${createdRecords.length} ASN records`,
        count: createdRecords.length,
        data: createdRecords,
      });
    } catch (error) {
      console.error("Error in createBulk:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create bulk ASN records",
        error: error.message,
      });
    }
  },

  // Update ASN record
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        vin,
        modelCode,
        modelName,
        dealerCode,
        originCode,
        destinationCode,
        originTerminal,
        destinationTerminal,
        invoiceNo,
        invoiceAmount,
        invoiceDate,
        shipmentNo,
      } = req.body;

      // Basic validation for required fields
      if (!originTerminal || !destinationTerminal) {
        return res.status(400).json({
          success: false,
          message: "OriginTerminal and DestinationTerminal are required",
        });
      }

      const updated = await ASNMaster.update(parseInt(id), {
        vin,
        modelCode,
        modelName,
        dealerCode,
        originCode,
        destinationCode,
        originTerminal,
        destinationTerminal,
        invoiceNo,
        invoiceAmount,
        invoiceDate,
        shipmentNo,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "ASN record not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "ASN record updated successfully",
      });
    } catch (error) {
      console.error("Error in update:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update ASN record",
        error: error.message,
      });
    }
  },

  // Delete ASN record
  async remove(req, res) {
    try {
      const { id } = req.params;
      const deleted = await ASNMaster.remove(parseInt(id));

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "ASN record not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "ASN record deleted successfully",
      });
    } catch (error) {
      console.error("Error in remove:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete ASN record",
        error: error.message,
      });
    }
  },
};

module.exports = ASNController;
