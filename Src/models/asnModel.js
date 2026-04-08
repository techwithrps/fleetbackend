const { pool, sql } = require("../config/dbconfig");

const ASNMaster = {
  // Get all records
  async getAll() {
    try {
      const request = pool.request();
      const result = await request.query(
        "SELECT * FROM ASN_MASTER ORDER BY CreatedAt DESC"
      );
      return result.recordset;
    } catch (error) {
      throw new Error(`Error fetching ASN records: ${error.message}`);
    }
  },

  // Get record by ID
  async getById(id) {
    try {
      const request = pool.request();
      const result = await request
        .input("id", sql.Int, id)
        .query("SELECT * FROM ASN_MASTER WHERE ID = @id");
      return result.recordset[0];
    } catch (error) {
      throw new Error(`Error fetching ASN record: ${error.message}`);
    }
  },

  // Create new record
  async create(data) {
    try {
      const request = pool.request();
      const result = await request
        .input("VIN", sql.VarChar(50), data.vin)
        .input("ModelCode", sql.VarChar(50), data.modelCode)
        .input("ModelName", sql.VarChar(100), data.modelName)
        .input("DealerCode", sql.VarChar(50), data.dealerCode)
        .input("OriginCode", sql.VarChar(50), data.originCode)
        .input("DestinationCode", sql.VarChar(50), data.destinationCode)
        .input("OriginTerminal", sql.VarChar(100), data.originTerminal)
        .input(
          "DestinationTerminal",
          sql.VarChar(100),
          data.destinationTerminal
        )
        .input("InvoiceNo", sql.VarChar(50), data.invoiceNo)
        .input("InvoiceAmount", sql.Decimal(18, 2), data.invoiceAmount || 0)
        .input("InvoiceDate", sql.Date, data.invoiceDate)
        .input("ShipmentNo", sql.VarChar(50), data.shipmentNo).query(`
          INSERT INTO ASN_MASTER (
            VIN, ModelCode, ModelName, DealerCode, OriginCode, DestinationCode,
            OriginTerminal, DestinationTerminal, InvoiceNo, InvoiceAmount, InvoiceDate, ShipmentNo
          )
          OUTPUT INSERTED.ID
          VALUES (
            @VIN, @ModelCode, @ModelName, @DealerCode, @OriginCode, @DestinationCode,
            @OriginTerminal, @DestinationTerminal, @InvoiceNo, @InvoiceAmount, @InvoiceDate, @ShipmentNo
          )
        `);
      return result.recordset[0];
    } catch (error) {
      throw new Error(`Error creating ASN record: ${error.message}`);
    }
  },

  // Update record by ID
  async update(id, data) {
    try {
      const request = pool.request();
      const result = await request
        .input("ID", sql.Int, id)
        .input("VIN", sql.VarChar(50), data.vin)
        .input("ModelCode", sql.VarChar(50), data.modelCode)
        .input("ModelName", sql.VarChar(100), data.modelName)
        .input("DealerCode", sql.VarChar(50), data.dealerCode)
        .input("OriginCode", sql.VarChar(50), data.originCode)
        .input("DestinationCode", sql.VarChar(50), data.destinationCode)
        .input("OriginTerminal", sql.VarChar(100), data.originTerminal)
        .input(
          "DestinationTerminal",
          sql.VarChar(100),
          data.destinationTerminal
        )
        .input("InvoiceNo", sql.VarChar(50), data.invoiceNo)
        .input("InvoiceAmount", sql.Decimal(18, 2), data.invoiceAmount || 0)
        .input("InvoiceDate", sql.Date, data.invoiceDate)
        .input("ShipmentNo", sql.VarChar(50), data.shipmentNo).query(`
          UPDATE ASN_MASTER SET
            VIN = @VIN,
            ModelCode = @ModelCode,
            ModelName = @ModelName,
            DealerCode = @DealerCode,
            OriginCode = @OriginCode,
            DestinationCode = @DestinationCode,
            OriginTerminal = @OriginTerminal,
            DestinationTerminal = @DestinationTerminal,
            InvoiceNo = @InvoiceNo,
            InvoiceAmount = @InvoiceAmount,
            InvoiceDate = @InvoiceDate,
            ShipmentNo = @ShipmentNo,
            UpdatedAt = GETDATE()
          WHERE ID = @ID
        `);
      return result.rowsAffected[0] > 0;
    } catch (error) {
      throw new Error(`Error updating ASN record: ${error.message}`);
    }
  },

  // Delete record by ID
  async remove(id) {
    try {
      const request = pool.request();
      const result = await request
        .input("id", sql.Int, id)
        .query("DELETE FROM ASN_MASTER WHERE ID = @id");
      return result.rowsAffected[0] > 0;
    } catch (error) {
      throw new Error(`Error deleting ASN record: ${error.message}`);
    }
  },
};

module.exports = ASNMaster;
