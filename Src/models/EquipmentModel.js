const { pool, sql } = require("../config/dbconfig");

class EquipmentModel {
  static mapEquipmentTypeForDb(value) {
    const normalized = String(value || "").trim().toUpperCase();
    const map = {
      "TRAILER 20": "TR20",
      "TRAILER 40": "TR40",
      TRUCK: "TRUCK",
      DUMPER: "DUMP",
      TR20: "TR20",
      TR40: "TR40",
      DUMP: "DUMP",
    };
    return map[normalized] || (normalized ? normalized.slice(0, 5) : null);
  }

  static mapEquipmentTypeForUi(value) {
    const normalized = String(value || "").trim().toUpperCase();
    const map = {
      TR20: "TRAILER 20",
      TR40: "TRAILER 40",
      TRUCK: "TRUCK",
      DUMP: "DUMPER",
    };
    return map[normalized] || value || "";
  }

  static toNumericOrNull(value) {
    if (value === undefined || value === null || String(value).trim() === "") {
      return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  static async detectSchema() {
    const res = await pool.request().query(`
      SELECT
        CASE WHEN OBJECT_ID('dbo.FLEET_EQUIPMENT_MASTER', 'U') IS NOT NULL THEN 1 ELSE 0 END AS has_fleet,
        CASE WHEN OBJECT_ID('dbo.VEHICLE_MASTER', 'U') IS NOT NULL THEN 1 ELSE 0 END AS has_vehicle
    `);
    const row = res.recordset?.[0] || {};
    // Prefer fleet schema because it matches the UI payload (EQUIPMENT_NO etc.)
    if (row.has_fleet === 1) return "fleet";
    if (row.has_vehicle === 1) return "vehicle_legacy";
    return "none";
  }

  static async getNextFleetEquipmentId() {
    const result = await pool.request().query(`
      SELECT ISNULL(MAX(EQUIPMENT_ID), 0) + 1 AS next_id FROM FLEET_EQUIPMENT_MASTER
    `);
    return Number(result.recordset?.[0]?.next_id || 1);
  }

  static async existsByEquipmentNo(equipmentNo, excludeId = null) {
    const schema = await this.detectSchema();
    const cleaned = String(equipmentNo || "").trim();
    if (!cleaned) return false;

    if (schema === "fleet") {
      const request = pool.request().input("equipment_no", sql.VarChar(50), cleaned);
      let excludeClause = "";
      if (excludeId) {
        request.input("exclude_id", sql.Numeric(18, 0), excludeId);
        excludeClause = "AND EQUIPMENT_ID <> @exclude_id";
      }
      const res = await request.query(`
        SELECT TOP 1 EQUIPMENT_ID
        FROM FLEET_EQUIPMENT_MASTER
        WHERE UPPER(LTRIM(RTRIM(EQUIPMENT_NO))) = UPPER(LTRIM(RTRIM(@equipment_no)))
        ${excludeClause}
      `);
      return res.recordset.length > 0;
    }

    if (schema === "vehicle_legacy") {
      const request = pool.request().input("vehicle_number", sql.VarChar(20), cleaned);
      let excludeClause = "";
      if (excludeId) {
        request.input("exclude_id", sql.Int, excludeId);
        excludeClause = "AND VEHICLE_ID <> @exclude_id";
      }
      const res = await request.query(`
        SELECT TOP 1 VEHICLE_ID
        FROM VEHICLE_MASTER
        WHERE UPPER(LTRIM(RTRIM(VEHICLE_NUMBER))) = UPPER(LTRIM(RTRIM(@vehicle_number)))
        ${excludeClause}
      `);
      return res.recordset.length > 0;
    }

    return false;
  }

  static async getAll() {
    const schema = await this.detectSchema();
    if (schema === "fleet") {
      const result = await pool.request().query(`
        SELECT 
          e.*,
          v.VENDOR_NAME,
          v.VENDOR_CODE
        FROM FLEET_EQUIPMENT_MASTER e
        LEFT JOIN VENDOR_MASTER v ON e.VENDER_ID = v.VENDOR_ID
        ORDER BY e.EQUIPMENT_NO
      `);
      return result.recordset.map((row) => ({
        ...row,
        EQUIPMENT_TYPE: this.mapEquipmentTypeForUi(row.EQUIPMENT_TYPE),
      }));
    }

    if (schema === "vehicle_legacy") {
      // Map legacy columns to the UI shape expected by the frontend
      const result = await pool.request().query(`
        SELECT
          VEHICLE_ID AS EQUIPMENT_ID,
          VEHICLE_NUMBER AS EQUIPMENT_NO,
          VEHICLE_TYPE AS EQUIPMENT_TYPE,
          MAKE AS MANUFACTURER,
          MODEL,
          CAST([YEAR] AS INT) AS MANUFACTURING_YEAR,
          CHASSIS_NUMBER AS VIN_NO,
          ENGINE_NUMBER AS ENG_NO,
          REGISTRATION_DATE,
          INSURANCE_EXPIRY_DATE AS INS_VALIDITY,
          FITNESS_EXPIRY_DATE AS VALIDITY,
          'A' AS STATUS,
          NULL AS VENDER_ID,
          NULL AS VENDOR_NAME,
          NULL AS VENDOR_CODE
        FROM VEHICLE_MASTER
        ORDER BY VEHICLE_NUMBER
      `);
      return result.recordset;
    }

    return [];
  }

  static async getById(equipmentId) {
    const schema = await this.detectSchema();

    if (schema === "fleet") {
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
      const row = result.recordset[0];
      return row
        ? {
            ...row,
            EQUIPMENT_TYPE: this.mapEquipmentTypeForUi(row.EQUIPMENT_TYPE),
          }
        : null;
    }

    if (schema === "vehicle_legacy") {
      const result = await pool
        .request()
        .input("vehicle_id", sql.Int, equipmentId)
        .query(`
          SELECT
            VEHICLE_ID AS EQUIPMENT_ID,
            VEHICLE_NUMBER AS EQUIPMENT_NO,
            VEHICLE_TYPE AS EQUIPMENT_TYPE,
            MAKE AS MANUFACTURER,
            MODEL,
            CAST([YEAR] AS INT) AS MANUFACTURING_YEAR,
            CHASSIS_NUMBER AS VIN_NO,
            ENGINE_NUMBER AS ENG_NO,
            REGISTRATION_DATE,
            INSURANCE_EXPIRY_DATE AS INS_VALIDITY,
            FITNESS_EXPIRY_DATE AS VALIDITY,
            'A' AS STATUS,
            NULL AS VENDER_ID,
            NULL AS VENDOR_NAME,
            NULL AS VENDOR_CODE
          FROM VEHICLE_MASTER
          WHERE VEHICLE_ID = @vehicle_id
        `);
      return result.recordset[0];
    }

    return null;
  }

  static async create(data) {
    const schema = await this.detectSchema();

    const equipmentNo = String(data?.EQUIPMENT_NO || "").trim();
    if (!equipmentNo) throw new Error("Vehicle number is required.");

    const isDuplicate = await this.existsByEquipmentNo(equipmentNo);
    if (isDuplicate) throw new Error("Vehicle number already exists.");

    if (schema === "fleet") {
      const equipmentId = await this.getNextFleetEquipmentId();

      const request = pool.request();
      request
        .input("terminal_id", sql.Numeric(18, 0), data.TERMINAL_ID ? Number(data.TERMINAL_ID) : null)
        .input("equipment_id", sql.Numeric(18, 0), equipmentId)
        .input("equipment_no", sql.VarChar(20), equipmentNo)
        .input("equipment_type", sql.VarChar(5), this.mapEquipmentTypeForDb(data.EQUIPMENT_TYPE))
        .input("purchase_date", sql.Date, data.PURCHAGE_DATE ? new Date(data.PURCHAGE_DATE) : null)
        .input("insurance_no", sql.VarChar(100), data.INSURANCE_NO || null)
        .input("eng_no", sql.VarChar(100), data.ENG_NO || null)
        .input("eng_type", sql.VarChar(50), data.ENG_TYPE || null)
        .input("vin_no", sql.VarChar(100), data.VIN_NO || null)
        .input("manufacturing_year", sql.Int, data.MANUFACTURING_YEAR ? parseInt(data.MANUFACTURING_YEAR, 10) : null)
        .input("model", sql.VarChar(50), data.MODEL || null)
        .input("condition", sql.Char(1), data.CONDITION || null)
        .input("tare_wt", sql.Numeric(18, 0), this.toNumericOrNull(data.TARE_WT))
        .input("gross_wt", sql.Numeric(18, 0), this.toNumericOrNull(data.GROSS_WT))
        .input("status", sql.Char(1), data.STATUS || null)
        .input("bed_changeable", sql.Char(1), data.BED_CHANGEABLE || null)
        .input("image", sql.VarChar(100), data.IMAGE || null)
        .input("registration_date", sql.Date, data.REGISTRATION_DATE ? new Date(data.REGISTRATION_DATE) : null)
        .input("manufacturer", sql.Numeric(18, 0), this.toNumericOrNull(data.MANUFACTURER))
        .input("bed_no", sql.VarChar(50), data.BED_NO || null)
        .input("ins_vendor", sql.Numeric(18, 0), this.toNumericOrNull(data.INS_VENDOR))
        .input("ins_validity", sql.Date, data.INS_VALIDITY ? new Date(data.INS_VALIDITY) : null)
        .input("permit_from", sql.Date, data.PERMIT_FROM ? new Date(data.PERMIT_FROM) : null)
        .input("permit_to", sql.Date, data.PERMIT_TO ? new Date(data.PERMIT_TO) : null)
        .input("pollution_validity", sql.Date, data.POLLUTION_VALIDITY ? new Date(data.POLLUTION_VALIDITY) : null)
        .input("rto", sql.VarChar(100), data.RTO || null)
        .input("fitness_doc", sql.VarChar(200), data.FITNESS_DOC || null)
        .input("validity", sql.Date, data.VALIDITY ? new Date(data.VALIDITY) : null)
        .input("rc_doc", sql.VarChar(200), data.RC_DOC || null)
        .input("insurance_doc", sql.VarChar(200), data.INSURANCE_DOC || null)
        .input("permit_a", sql.VarChar(200), data.PERMIT_A || null)
        .input("permit_b", sql.VarChar(200), data.PERMIT_B || null)
        .input("hp_by", sql.Numeric(18, 0), this.toNumericOrNull(data.HP_BY))
        .input("xl_type", sql.VarChar(20), data.XL_TYPE || null)
        .input("company_id", sql.Numeric(18, 0), this.toNumericOrNull(data.COMPANY_ID))
        .input("driver_attach_id", sql.Numeric(10, 0), this.toNumericOrNull(data.DRIVER_ATTACH_ID))
        .input("driver_attach_status", sql.VarChar(10), data.DRIVER_ATTCAH_STATUS || null)
        .input("state_permit_from", sql.Date, data.STATE_PERMIT_FROM ? new Date(data.STATE_PERMIT_FROM) : null)
        .input("state_permit_to", sql.Date, data.STATE_PERMIT_TO ? new Date(data.STATE_PERMIT_TO) : null)
        .input("road_tax_validity", sql.Date, data.ROAD_TAX_VALIDITY ? new Date(data.ROAD_TAX_VALIDITY) : null)
        .input("remark_note", sql.VarChar(500), data.REMARK_NOTE || null)
        .input("vender_id", sql.Numeric(18, 0), this.toNumericOrNull(data.VENDER_ID));

      await request.query(`
        INSERT INTO FLEET_EQUIPMENT_MASTER (
          TERMINAL_ID, EQUIPMENT_ID, EQUIPMENT_NO, EQUIPMENT_TYPE, PURCHAGE_DATE,
          INSURANCE_NO, ENG_NO, ENG_TYPE, VIN_NO, MANUFACTURING_YEAR, MODEL, CONDITION,
          TARE_WT, GROSS_WT, STATUS, BED_CHANGEABLE, IMAGE, REGISTRATION_DATE, MANUFACTURER,
          BED_NO, INS_VENDOR, INS_VALIDITY, PERMIT_FROM, PERMIT_TO, POLLUTION_VALIDITY,
          RTO, FITNESS_DOC, VALIDITY, RC_DOC, INSURANCE_DOC, PERMIT_A, PERMIT_B, HP_BY,
          XL_TYPE, COMPANY_ID, DRIVER_ATTACH_ID, DRIVER_ATTCAH_STATUS, STATE_PERMIT_FROM,
          STATE_PERMIT_TO, ROAD_TAX_VALIDITY, REMARK_NOTE, VENDER_ID
        ) VALUES (
          @terminal_id, @equipment_id, @equipment_no, @equipment_type, @purchase_date,
          @insurance_no, @eng_no, @eng_type, @vin_no, @manufacturing_year, @model, @condition,
          @tare_wt, @gross_wt, @status, @bed_changeable, @image, @registration_date, @manufacturer,
          @bed_no, @ins_vendor, @ins_validity, @permit_from, @permit_to, @pollution_validity,
          @rto, @fitness_doc, @validity, @rc_doc, @insurance_doc, @permit_a, @permit_b, @hp_by,
          @xl_type, @company_id, @driver_attach_id, @driver_attach_status, @state_permit_from,
          @state_permit_to, @road_tax_validity, @remark_note, @vender_id
        )
      `);

      return { success: true, id: equipmentId };
    }

    if (schema === "vehicle_legacy") {
      const request = pool.request();
      request
        .input("vehicle_number", sql.VarChar(20), equipmentNo)
        .input("vehicle_type", sql.VarChar(50), data.EQUIPMENT_TYPE || null)
        .input("make", sql.VarChar(50), data.MANUFACTURER || null)
        .input("model", sql.VarChar(50), data.MODEL || null)
        .input("year", sql.Int, data.MANUFACTURING_YEAR ? parseInt(data.MANUFACTURING_YEAR, 10) : null)
        .input("chassis_number", sql.VarChar(50), data.VIN_NO || null)
        .input("engine_number", sql.VarChar(50), data.ENG_NO || null)
        .input("registration_date", sql.Date, data.REGISTRATION_DATE ? new Date(data.REGISTRATION_DATE) : null)
        .input("insurance_expiry_date", sql.Date, data.INS_VALIDITY ? new Date(data.INS_VALIDITY) : null)
        .input("fitness_expiry_date", sql.Date, data.VALIDITY ? new Date(data.VALIDITY) : null);

      const res = await request.query(`
        INSERT INTO VEHICLE_MASTER (
          VEHICLE_NUMBER, VEHICLE_TYPE, MAKE, MODEL, [YEAR], CHASSIS_NUMBER, ENGINE_NUMBER,
          REGISTRATION_DATE, INSURANCE_EXPIRY_DATE, FITNESS_EXPIRY_DATE
        ) VALUES (
          @vehicle_number, @vehicle_type, @make, @model, @year, @chassis_number, @engine_number,
          @registration_date, @insurance_expiry_date, @fitness_expiry_date
        );
        SELECT SCOPE_IDENTITY() AS id;
      `);

      return { success: true, id: res.recordset?.[0]?.id || null };
    }

    throw new Error("Vehicle storage table not found.");
  }

  static async update(equipmentId, data) {
    const schema = await this.detectSchema();
    const equipmentNo = String(data?.EQUIPMENT_NO || "").trim();

    const isDuplicate = await this.existsByEquipmentNo(equipmentNo, equipmentId);
    if (isDuplicate) throw new Error("Vehicle number already exists.");

    if (schema === "fleet") {
      await pool
        .request()
        .input("equipment_id", sql.Numeric(18, 0), equipmentId)
        .input("terminal_id", sql.Numeric(18, 0), data.TERMINAL_ID ? Number(data.TERMINAL_ID) : null)
        .input("equipment_no", sql.VarChar(20), equipmentNo)
        .input("equipment_type", sql.VarChar(5), this.mapEquipmentTypeForDb(data.EQUIPMENT_TYPE))
        .input("purchase_date", sql.Date, data.PURCHAGE_DATE ? new Date(data.PURCHAGE_DATE) : null)
        .input("insurance_no", sql.VarChar(100), data.INSURANCE_NO || null)
        .input("eng_no", sql.VarChar(100), data.ENG_NO || null)
        .input("eng_type", sql.VarChar(50), data.ENG_TYPE || null)
        .input("vin_no", sql.VarChar(100), data.VIN_NO || null)
        .input("manufacturing_year", sql.Int, data.MANUFACTURING_YEAR ? parseInt(data.MANUFACTURING_YEAR, 10) : null)
        .input("model", sql.VarChar(50), data.MODEL || null)
        .input("condition", sql.Char(1), data.CONDITION || null)
        .input("tare_wt", sql.Numeric(18, 0), this.toNumericOrNull(data.TARE_WT))
        .input("gross_wt", sql.Numeric(18, 0), this.toNumericOrNull(data.GROSS_WT))
        .input("status", sql.Char(1), data.STATUS || null)
        .input("bed_changeable", sql.Char(1), data.BED_CHANGEABLE || null)
        .input("image", sql.VarChar(100), data.IMAGE || null)
        .input("registration_date", sql.Date, data.REGISTRATION_DATE ? new Date(data.REGISTRATION_DATE) : null)
        .input("manufacturer", sql.Numeric(18, 0), this.toNumericOrNull(data.MANUFACTURER))
        .input("bed_no", sql.VarChar(50), data.BED_NO || null)
        .input("ins_vendor", sql.Numeric(18, 0), this.toNumericOrNull(data.INS_VENDOR))
        .input("ins_validity", sql.Date, data.INS_VALIDITY ? new Date(data.INS_VALIDITY) : null)
        .input("permit_from", sql.Date, data.PERMIT_FROM ? new Date(data.PERMIT_FROM) : null)
        .input("permit_to", sql.Date, data.PERMIT_TO ? new Date(data.PERMIT_TO) : null)
        .input("pollution_validity", sql.Date, data.POLLUTION_VALIDITY ? new Date(data.POLLUTION_VALIDITY) : null)
        .input("rto", sql.VarChar(100), data.RTO || null)
        .input("fitness_doc", sql.VarChar(200), data.FITNESS_DOC || null)
        .input("validity", sql.Date, data.VALIDITY ? new Date(data.VALIDITY) : null)
        .input("rc_doc", sql.VarChar(200), data.RC_DOC || null)
        .input("insurance_doc", sql.VarChar(200), data.INSURANCE_DOC || null)
        .input("permit_a", sql.VarChar(200), data.PERMIT_A || null)
        .input("permit_b", sql.VarChar(200), data.PERMIT_B || null)
        .input("hp_by", sql.Numeric(18, 0), this.toNumericOrNull(data.HP_BY))
        .input("xl_type", sql.VarChar(20), data.XL_TYPE || null)
        .input("company_id", sql.Numeric(18, 0), this.toNumericOrNull(data.COMPANY_ID))
        .input("driver_attach_id", sql.Numeric(10, 0), this.toNumericOrNull(data.DRIVER_ATTACH_ID))
        .input("driver_attach_status", sql.VarChar(10), data.DRIVER_ATTCAH_STATUS || null)
        .input("state_permit_from", sql.Date, data.STATE_PERMIT_FROM ? new Date(data.STATE_PERMIT_FROM) : null)
        .input("state_permit_to", sql.Date, data.STATE_PERMIT_TO ? new Date(data.STATE_PERMIT_TO) : null)
        .input("road_tax_validity", sql.Date, data.ROAD_TAX_VALIDITY ? new Date(data.ROAD_TAX_VALIDITY) : null)
        .input("remark_note", sql.VarChar(500), data.REMARK_NOTE || null)
        .input("vender_id", sql.Numeric(18, 0), this.toNumericOrNull(data.VENDER_ID))
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
    }

    if (schema === "vehicle_legacy") {
      await pool
        .request()
        .input("vehicle_id", sql.Int, equipmentId)
        .input("vehicle_number", sql.VarChar(20), equipmentNo)
        .input("vehicle_type", sql.VarChar(50), data.EQUIPMENT_TYPE || null)
        .input("make", sql.VarChar(50), data.MANUFACTURER || null)
        .input("model", sql.VarChar(50), data.MODEL || null)
        .input("year", sql.Int, data.MANUFACTURING_YEAR ? parseInt(data.MANUFACTURING_YEAR, 10) : null)
        .input("chassis_number", sql.VarChar(50), data.VIN_NO || null)
        .input("engine_number", sql.VarChar(50), data.ENG_NO || null)
        .input("registration_date", sql.Date, data.REGISTRATION_DATE ? new Date(data.REGISTRATION_DATE) : null)
        .input("insurance_expiry_date", sql.Date, data.INS_VALIDITY ? new Date(data.INS_VALIDITY) : null)
        .input("fitness_expiry_date", sql.Date, data.VALIDITY ? new Date(data.VALIDITY) : null)
        .query(`
          UPDATE VEHICLE_MASTER SET
            VEHICLE_NUMBER = @vehicle_number,
            VEHICLE_TYPE = @vehicle_type,
            MAKE = @make,
            MODEL = @model,
            [YEAR] = @year,
            CHASSIS_NUMBER = @chassis_number,
            ENGINE_NUMBER = @engine_number,
            REGISTRATION_DATE = @registration_date,
            INSURANCE_EXPIRY_DATE = @insurance_expiry_date,
            FITNESS_EXPIRY_DATE = @fitness_expiry_date
          WHERE VEHICLE_ID = @vehicle_id
        `);

      return { success: true };
    }

    throw new Error("Vehicle storage table not found.");
  }

  static async delete(equipmentId) {
    const schema = await this.detectSchema();
    if (schema === "fleet") {
      await pool
        .request()
        .input("equipment_id", sql.Numeric(18, 0), equipmentId)
        .query(`DELETE FROM FLEET_EQUIPMENT_MASTER WHERE EQUIPMENT_ID = @equipment_id`);
      return { success: true };
    }

    if (schema === "vehicle_legacy") {
      await pool
        .request()
        .input("vehicle_id", sql.Int, equipmentId)
        .query(`DELETE FROM VEHICLE_MASTER WHERE VEHICLE_ID = @vehicle_id`);
      return { success: true };
    }

    throw new Error("Vehicle storage table not found.");
  }
}

module.exports = EquipmentModel;
