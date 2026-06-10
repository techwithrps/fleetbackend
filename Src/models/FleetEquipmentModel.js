const { pool, sql } = require("../config/dbconfig");

class FleetEquipmentModel {
  // Helper function to parse date safely
  static parseDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  static async getAll(terminalIds = null) {
    try {
      const terminalIdsStr = terminalIds ? (Array.isArray(terminalIds) ? terminalIds.join(',') : String(terminalIds)) : null;
      const result = await pool.request()
        .input("terminal_ids", sql.VarChar, terminalIdsStr)
        .query(`
        SELECT * FROM FLEET_EQUIPMENT_MASTER
        WHERE (@terminal_ids IS NULL OR TERMINAL_ID IN (SELECT CAST(value AS NUMERIC) FROM STRING_SPLIT(@terminal_ids, ',')))
        ORDER BY EQUIPMENT_NAME
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all fleet equipment error:", error);
      throw error;
    }
  }

  static async getById(equipmentId, terminalIds = null) {
    try {
      const terminalIdsStr = terminalIds ? (Array.isArray(terminalIds) ? terminalIds.join(',') : String(terminalIds)) : null;
      const request = pool.request()
        .input("equipment_id", sql.Numeric(18, 0), equipmentId)
        .input("terminal_ids", sql.VarChar, terminalIdsStr);

      const result = await request.query(`
          SELECT * FROM FLEET_EQUIPMENT_MASTER
          WHERE EQUIPMENT_ID = @equipment_id
          AND (@terminal_ids IS NULL OR TERMINAL_ID IN (SELECT CAST(value AS NUMERIC) FROM STRING_SPLIT(@terminal_ids, ',')))
        `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get fleet equipment by ID error:", error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const {
        terminal_id,
        equipment_name,
        equipment_type,
        equipment_model,
        equipment_make,
        equipment_year,
        equipment_capacity,
        equipment_status,
        equipment_location,
        equipment_purchase_date,
        equipment_purchase_price,
        equipment_current_value,
        equipment_maintenance_schedule,
        equipment_last_maintenance_date,
        equipment_next_maintenance_date,
        equipment_notes,
        created_by
      } = data;

      const result = await pool
        .request()
        .input("terminal_id", sql.Numeric(18, 0), terminal_id ? Number(terminal_id) : null)
        .input("location_id", sql.Numeric(18, 0), terminal_id ? Number(terminal_id) : null)
        .input("equipment_name", sql.VarChar(100), equipment_name?.trim())
        .input("equipment_type", sql.VarChar(50), equipment_type?.trim() || null)
        .input("equipment_model", sql.VarChar(50), equipment_model?.trim() || null)
        .input("equipment_make", sql.VarChar(50), equipment_make?.trim() || null)
        .input("equipment_year", sql.Int, equipment_year ? parseInt(equipment_year) : null)
        .input("equipment_capacity", sql.VarChar(50), equipment_capacity?.trim() || null)
        .input("equipment_status", sql.VarChar(20), equipment_status?.trim() || 'Active')
        .input("equipment_location", sql.VarChar(100), equipment_location?.trim() || null)
        .input("equipment_purchase_date", sql.Date, this.parseDate(equipment_purchase_date))
        .input("equipment_purchase_price", sql.Numeric(18, 2), equipment_purchase_price ? parseFloat(equipment_purchase_price) : null)
        .input("equipment_current_value", sql.Numeric(18, 2), equipment_current_value ? parseFloat(equipment_current_value) : null)
        .input("equipment_maintenance_schedule", sql.VarChar(100), equipment_maintenance_schedule?.trim() || null)
        .input("equipment_last_maintenance_date", sql.Date, this.parseDate(equipment_last_maintenance_date))
        .input("equipment_next_maintenance_date", sql.Date, this.parseDate(equipment_next_maintenance_date))
        .input("equipment_notes", sql.VarChar(500), equipment_notes?.trim() || null)
        .input("created_by", sql.VarChar(30), created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .query(`
          INSERT INTO FLEET_EQUIPMENT_MASTER (
            TERMINAL_ID, location_id, EQUIPMENT_NAME, EQUIPMENT_TYPE, EQUIPMENT_MODEL, EQUIPMENT_MAKE, 
            EQUIPMENT_YEAR, EQUIPMENT_CAPACITY, EQUIPMENT_STATUS, EQUIPMENT_LOCATION, 
            EQUIPMENT_PURCHASE_DATE, EQUIPMENT_PURCHASE_PRICE, EQUIPMENT_CURRENT_VALUE, 
            EQUIPMENT_MAINTENANCE_SCHEDULE, EQUIPMENT_LAST_MAINTENANCE_DATE, 
            EQUIPMENT_NEXT_MAINTENANCE_DATE, EQUIPMENT_NOTES, CREATED_BY, CREATED_ON
          ) 
          VALUES (
            @terminal_id, @location_id, @equipment_name, @equipment_type, @equipment_model, @equipment_make, 
            @equipment_year, @equipment_capacity, @equipment_status, @equipment_location, 
            @equipment_purchase_date, @equipment_purchase_price, @equipment_current_value, 
            @equipment_maintenance_schedule, @equipment_last_maintenance_date, 
            @equipment_next_maintenance_date, @equipment_notes, @created_by, @created_on
          );
          SELECT SCOPE_IDENTITY() AS equipment_id;
        `);

      return { success: true, equipment_id: result.recordset[0].equipment_id };
    } catch (error) {
      console.error("Create fleet equipment error:", error);
      throw error;
    }
  }

  static async update(equipmentId, data) {
    try {
      const {
        terminal_id,
        equipment_name,
        equipment_type,
        equipment_model,
        equipment_make,
        equipment_year,
        equipment_capacity,
        equipment_status,
        equipment_location,
        equipment_purchase_date,
        equipment_purchase_price,
        equipment_current_value,
        equipment_maintenance_schedule,
        equipment_last_maintenance_date,
        equipment_next_maintenance_date,
        equipment_notes
      } = data;

      await pool
        .request()
        .input("terminal_id", sql.Numeric(18, 0), terminal_id ? Number(terminal_id) : null)
        .input("equipment_id", sql.Numeric(18, 0), equipmentId)
        .input("equipment_name", sql.VarChar(100), equipment_name?.trim())
        .input("equipment_type", sql.VarChar(50), equipment_type?.trim() || null)
        .input("equipment_model", sql.VarChar(50), equipment_model?.trim() || null)
        .input("equipment_make", sql.VarChar(50), equipment_make?.trim() || null)
        .input("equipment_year", sql.Int, equipment_year ? parseInt(equipment_year) : null)
        .input("equipment_capacity", sql.VarChar(50), equipment_capacity?.trim() || null)
        .input("equipment_status", sql.VarChar(20), equipment_status?.trim() || 'Active')
        .input("equipment_location", sql.VarChar(100), equipment_location?.trim() || null)
        .input("equipment_purchase_date", sql.Date, this.parseDate(equipment_purchase_date))
        .input("equipment_purchase_price", sql.Numeric(18, 2), equipment_purchase_price ? parseFloat(equipment_purchase_price) : null)
        .input("equipment_current_value", sql.Numeric(18, 2), equipment_current_value ? parseFloat(equipment_current_value) : null)
        .input("equipment_maintenance_schedule", sql.VarChar(100), equipment_maintenance_schedule?.trim() || null)
        .input("equipment_last_maintenance_date", sql.Date, this.parseDate(equipment_last_maintenance_date))
        .input("equipment_next_maintenance_date", sql.Date, this.parseDate(equipment_next_maintenance_date))
        .input("equipment_notes", sql.VarChar(500), equipment_notes?.trim() || null)
        .query(`
          UPDATE FLEET_EQUIPMENT_MASTER SET
            TERMINAL_ID = @terminal_id,
            EQUIPMENT_NAME = @equipment_name,
            EQUIPMENT_TYPE = @equipment_type,
            EQUIPMENT_MODEL = @equipment_model,
            EQUIPMENT_MAKE = @equipment_make,
            EQUIPMENT_YEAR = @equipment_year,
            EQUIPMENT_CAPACITY = @equipment_capacity,
            EQUIPMENT_STATUS = @equipment_status,
            EQUIPMENT_LOCATION = @equipment_location,
            EQUIPMENT_PURCHASE_DATE = @equipment_purchase_date,
            EQUIPMENT_PURCHASE_PRICE = @equipment_purchase_price,
            EQUIPMENT_CURRENT_VALUE = @equipment_current_value,
            EQUIPMENT_MAINTENANCE_SCHEDULE = @equipment_maintenance_schedule,
            EQUIPMENT_LAST_MAINTENANCE_DATE = @equipment_last_maintenance_date,
            EQUIPMENT_NEXT_MAINTENANCE_DATE = @equipment_next_maintenance_date,
            EQUIPMENT_NOTES = @equipment_notes
          WHERE EQUIPMENT_ID = @equipment_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Update fleet equipment error:", error);
      throw error;
    }
  }

  // Delete fleet equipment
  static async delete(equipmentId) {
    try {
      await pool
        .request()
        .input("equipment_id", sql.Numeric(18, 0), equipmentId)
        .query(`
          DELETE FROM FLEET_EQUIPMENT_MASTER WHERE EQUIPMENT_ID = @equipment_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Delete fleet equipment error:", error);
      throw error;
    }
  }
}

module.exports = FleetEquipmentModel;