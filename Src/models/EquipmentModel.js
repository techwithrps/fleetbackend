const { pool, sql } = require("../config/dbconfig");

class EquipmentModel {
  // Get all equipment with vendor information
  static async getAll() {
    try {
      const result = await pool.request().query(`
        SELECT 
          e.*,
          v.VENDOR_NAME,
          v.VENDOR_CODE
        FROM FLEET_EQUIPMENT_MASTER e
        LEFT JOIN VENDOR_MASTER v ON e.VENDER_ID = v.VENDOR_ID
        ORDER BY e.EQUIPMENT_NO
      `);
      return result.recordset;
    } catch (error) {
      console.error("Get all equipment error:", error);
      throw error;
    }
  }

  // Get equipment by ID with vendor information
  static async getById(equipmentId) {
    try {
      const result = await pool
        .request()
        .input("equipment_id", sql.Numeric(18, 0), equipmentId)
        .query(`
          SELECT 
            e.*,
            v.VENDOR_NAME,
            v.VENDOR_CODE
          FROM FLEET_EQUIPMENT_MASTER e
          LEFT JOIN VENDOR_MASTER v ON e.VENDER_ID = v.VENDOR_ID
          WHERE e.EQUIPMENT_ID = @equipment_id
        `);
      return result.recordset[0];
    } catch (error) {
      console.error("Get equipment by ID error:", error);
      throw error;
    }
  }

  // Get next equipment ID
  static async getNextEquipmentId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(EQUIPMENT_ID), 0) + 1 AS next_id FROM FLEET_EQUIPMENT_MASTER
      `);
      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next equipment ID error:", error);
      throw error;
    }
  }

  // Create new equipment
  static async create(data) {
    try {
      const nextId = await this.getNextEquipmentId();
      
      await pool
        .request()
        .input("equipment_id", sql.Numeric(18, 0), nextId)
        .input("terminal_id", sql.VarChar(50), data.TERMINAL_ID || null)
        .input("equipment_no", sql.VarChar(50), data.EQUIPMENT_NO)
        .input("equipment_type", sql.VarChar(50), data.EQUIPMENT_TYPE || null)
        .input("purchase_date", sql.Date, data.PURCHAGE_DATE ? new Date(data.PURCHAGE_DATE) : null)
        .input("insurance_no", sql.VarChar(50), data.INSURANCE_NO || null)
        .input("eng_no", sql.VarChar(50), data.ENG_NO || null)
        .input("eng_type", sql.VarChar(50), data.ENG_TYPE || null)
        .input("vin_no", sql.VarChar(50), data.VIN_NO || null)
        .input("manufacturing_year", sql.VarChar(10), data.MANUFACTURING_YEAR || null)
        .input("model", sql.VarChar(50), data.MODEL || null)
        .input("condition", sql.Char(1), data.CONDITION || 'N')
        .input("tare_wt", sql.Decimal(18, 2), data.TARE_WT || null)
        .input("gross_wt", sql.Decimal(18, 2), data.GROSS_WT || null)
        .input("status", sql.Char(1), data.STATUS || 'A')
        .input("bed_changeable", sql.Char(1), data.BED_CHANGEABLE || 'N')
        .input("image", sql.VarChar(255), data.IMAGE || null)
        .input("registration_date", sql.Date, data.REGISTRATION_DATE ? new Date(data.REGISTRATION_DATE) : null)
        .input("manufacturer", sql.VarChar(100), data.MANUFACTURER || null)
        .input("bed_no", sql.VarChar(50), data.BED_NO || null)
        .input("ins_vendor", sql.VarChar(100), data.INS_VENDOR || null)
        .input("ins_validity", sql.Date, data.INS_VALIDITY ? new Date(data.INS_VALIDITY) : null)
        .input("permit_from", sql.Date, data.PERMIT_FROM ? new Date(data.PERMIT_FROM) : null)
        .input("permit_to", sql.Date, data.PERMIT_TO ? new Date(data.PERMIT_TO) : null)
        .input("pollution_validity", sql.Date, data.POLLUTION_VALIDITY ? new Date(data.POLLUTION_VALIDITY) : null)
        .input("rto", sql.VarChar(100), data.RTO || null)
        .input("fitness_doc", sql.VarChar(255), data.FITNESS_DOC || null)
        .input("validity", sql.Date, data.VALIDITY ? new Date(data.VALIDITY) : null)
        .input("rc_doc", sql.VarChar(255), data.RC_DOC || null)
        .input("insurance_doc", sql.VarChar(255), data.INSURANCE_DOC || null)
        .input("permit_a", sql.VarChar(255), data.PERMIT_A || null)
        .input("permit_b", sql.VarChar(255), data.PERMIT_B || null)
        .input("hp_by", sql.VarChar(100), data.HP_BY || null)
        .input("xl_type", sql.VarChar(50), data.XL_TYPE || null)
        .input("company_id", sql.VarChar(50), data.COMPANY_ID || null)
        .input("driver_attach_id", sql.VarChar(50), data.DRIVER_ATTACH_ID || null)
        .input("driver_attach_status", sql.VarChar(50), data.DRIVER_ATTCAH_STATUS || null)
        .input("state_permit_from", sql.Date, data.STATE_PERMIT_FROM ? new Date(data.STATE_PERMIT_FROM) : null)
        .input("state_permit_to", sql.Date, data.STATE_PERMIT_TO ? new Date(data.STATE_PERMIT_TO) : null)
        .input("road_tax_validity", sql.Date, data.ROAD_TAX_VALIDITY ? new Date(data.ROAD_TAX_VALIDITY) : null)
        .input("remark_note", sql.VarChar(500), data.REMARK_NOTE || null)
        .input("vender_id", sql.Numeric(18, 0), data.VENDER_ID || null)
        .query(`
          INSERT INTO FLEET_EQUIPMENT_MASTER (
            EQUIPMENT_ID, TERMINAL_ID, EQUIPMENT_NO, EQUIPMENT_TYPE, PURCHAGE_DATE, 
            INSURANCE_NO, ENG_NO, ENG_TYPE, VIN_NO, MANUFACTURING_YEAR, MODEL, CONDITION, 
            TARE_WT, GROSS_WT, STATUS, BED_CHANGEABLE, IMAGE, REGISTRATION_DATE, MANUFACTURER, 
            BED_NO, INS_VENDOR, INS_VALIDITY, PERMIT_FROM, PERMIT_TO, POLLUTION_VALIDITY, 
            RTO, FITNESS_DOC, VALIDITY, RC_DOC, INSURANCE_DOC, PERMIT_A, PERMIT_B, HP_BY, 
            XL_TYPE, COMPANY_ID, DRIVER_ATTACH_ID, DRIVER_ATTCAH_STATUS, STATE_PERMIT_FROM, 
            STATE_PERMIT_TO, ROAD_TAX_VALIDITY, REMARK_NOTE, VENDER_ID
          ) VALUES (
            @equipment_id, @terminal_id, @equipment_no, @equipment_type, @purchase_date, 
            @insurance_no, @eng_no, @eng_type, @vin_no, @manufacturing_year, @model, @condition, 
            @tare_wt, @gross_wt, @status, @bed_changeable, @image, @registration_date, @manufacturer, 
            @bed_no, @ins_vendor, @ins_validity, @permit_from, @permit_to, @pollution_validity, 
            @rto, @fitness_doc, @validity, @rc_doc, @insurance_doc, @permit_a, @permit_b, @hp_by, 
            @xl_type, @company_id, @driver_attach_id, @driver_attach_status, @state_permit_from, 
            @state_permit_to, @road_tax_validity, @remark_note, @vender_id
          )
        `);

      return { success: true, id: nextId };
    } catch (error) {
      console.error("Create equipment error:", error);
      throw error;
    }
  }

  // Update equipment
  static async update(equipmentId, data) {
    try {
      await pool
        .request()
        .input("equipment_id", sql.Numeric(18, 0), equipmentId)
        .input("terminal_id", sql.VarChar(50), data.TERMINAL_ID || null)
        .input("equipment_no", sql.VarChar(50), data.EQUIPMENT_NO)
        .input("equipment_type", sql.VarChar(50), data.EQUIPMENT_TYPE || null)
        .input("purchase_date", sql.Date, data.PURCHAGE_DATE ? new Date(data.PURCHAGE_DATE) : null)
        .input("insurance_no", sql.VarChar(50), data.INSURANCE_NO || null)
        .input("eng_no", sql.VarChar(50), data.ENG_NO || null)
        .input("eng_type", sql.VarChar(50), data.ENG_TYPE || null)
        .input("vin_no", sql.VarChar(50), data.VIN_NO || null)
        .input("manufacturing_year", sql.VarChar(10), data.MANUFACTURING_YEAR || null)
        .input("model", sql.VarChar(50), data.MODEL || null)
        .input("condition", sql.Char(1), data.CONDITION || 'N')
        .input("tare_wt", sql.Decimal(18, 2), data.TARE_WT || null)
        .input("gross_wt", sql.Decimal(18, 2), data.GROSS_WT || null)
        .input("status", sql.Char(1), data.STATUS || 'A')
        .input("bed_changeable", sql.Char(1), data.BED_CHANGEABLE || 'N')
        .input("image", sql.VarChar(255), data.IMAGE || null)
        .input("registration_date", sql.Date, data.REGISTRATION_DATE ? new Date(data.REGISTRATION_DATE) : null)
        .input("manufacturer", sql.VarChar(100), data.MANUFACTURER || null)
        .input("bed_no", sql.VarChar(50), data.BED_NO || null)
        .input("ins_vendor", sql.VarChar(100), data.INS_VENDOR || null)
        .input("ins_validity", sql.Date, data.INS_VALIDITY ? new Date(data.INS_VALIDITY) : null)
        .input("permit_from", sql.Date, data.PERMIT_FROM ? new Date(data.PERMIT_FROM) : null)
        .input("permit_to", sql.Date, data.PERMIT_TO ? new Date(data.PERMIT_TO) : null)
        .input("pollution_validity", sql.Date, data.POLLUTION_VALIDITY ? new Date(data.POLLUTION_VALIDITY) : null)
        .input("rto", sql.VarChar(100), data.RTO || null)
        .input("fitness_doc", sql.VarChar(255), data.FITNESS_DOC || null)
        .input("validity", sql.Date, data.VALIDITY ? new Date(data.VALIDITY) : null)
        .input("rc_doc", sql.VarChar(255), data.RC_DOC || null)
        .input("insurance_doc", sql.VarChar(255), data.INSURANCE_DOC || null)
        .input("permit_a", sql.VarChar(255), data.PERMIT_A || null)
        .input("permit_b", sql.VarChar(255), data.PERMIT_B || null)
        .input("hp_by", sql.VarChar(100), data.HP_BY || null)
        .input("xl_type", sql.VarChar(50), data.XL_TYPE || null)
        .input("company_id", sql.VarChar(50), data.COMPANY_ID || null)
        .input("driver_attach_id", sql.VarChar(50), data.DRIVER_ATTACH_ID || null)
        .input("driver_attach_status", sql.VarChar(50), data.DRIVER_ATTCAH_STATUS || null)
        .input("state_permit_from", sql.Date, data.STATE_PERMIT_FROM ? new Date(data.STATE_PERMIT_FROM) : null)
        .input("state_permit_to", sql.Date, data.STATE_PERMIT_TO ? new Date(data.STATE_PERMIT_TO) : null)
        .input("road_tax_validity", sql.Date, data.ROAD_TAX_VALIDITY ? new Date(data.ROAD_TAX_VALIDITY) : null)
        .input("remark_note", sql.VarChar(500), data.REMARK_NOTE || null)
        .input("vender_id", sql.Numeric(18, 0), data.VENDER_ID || null)
        .query(`
          UPDATE FLEET_EQUIPMENT_MASTER SET
            TERMINAL_ID = @terminal_id,
            EQUIPMENT_NO = @equipment_no,
            EQUIPMENT_TYPE = @equipment_type,
            PURCHAGE_DATE = @purchase_date,
            INSURANCE_NO = @insurance_no,
            ENG_NO = @eng_no,
            ENG_TYPE = @eng_type,
            VIN_NO = @vin_no,
            MANUFACTURING_YEAR = @manufacturing_year,
            MODEL = @model,
            CONDITION = @condition,
            TARE_WT = @tare_wt,
            GROSS_WT = @gross_wt,
            STATUS = @status,
            BED_CHANGEABLE = @bed_changeable,
            IMAGE = @image,
            REGISTRATION_DATE = @registration_date,
            MANUFACTURER = @manufacturer,
            BED_NO = @bed_no,
            INS_VENDOR = @ins_vendor,
            INS_VALIDITY = @ins_validity,
            PERMIT_FROM = @permit_from,
            PERMIT_TO = @permit_to,
            POLLUTION_VALIDITY = @pollution_validity,
            RTO = @rto,
            FITNESS_DOC = @fitness_doc,
            VALIDITY = @validity,
            RC_DOC = @rc_doc,
            INSURANCE_DOC = @insurance_doc,
            PERMIT_A = @permit_a,
            PERMIT_B = @permit_b,
            HP_BY = @hp_by,
            XL_TYPE = @xl_type,
            COMPANY_ID = @company_id,
            DRIVER_ATTACH_ID = @driver_attach_id,
            DRIVER_ATTCAH_STATUS = @driver_attach_status,
            STATE_PERMIT_FROM = @state_permit_from,
            STATE_PERMIT_TO = @state_permit_to,
            ROAD_TAX_VALIDITY = @road_tax_validity,
            REMARK_NOTE = @remark_note,
            VENDER_ID = @vender_id
          WHERE EQUIPMENT_ID = @equipment_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Update equipment error:", error);
      throw error;
    }
  }

  // Delete equipment
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
      console.error("Delete equipment error:", error);
      throw error;
    }
  }
}

module.exports = EquipmentModel;