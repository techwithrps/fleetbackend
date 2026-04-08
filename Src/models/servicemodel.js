const { pool, sql } = require("../config/dbconfig");

class ServiceMasterModal {
  // Create a new service
  static async create(data) {
    try {
      const {
        TERMINAL_ID,
        SERVICE_ID,
        SERVICE_CODE,
        SERVICE_NAME,
        SERVICE_TYPE_CODE,
        TAX_GROUP_ID,
        UNIT,
        MAP_CODE,
        TAX_ON_PERCENTAGE,
        UOM_ID,
        SAP_MAP_CODE,
        SERVICE_TYPE,
        SERVICE_GROUP,
        EXEMPTED,
        SERVICE_MAP_CODE,
        CREATED_BY,
        TPT_MODE,
        LCL_TYPE,
        LCL_PER,
        HAZ_PER,
        IWB_FLAG,
        SERVICE_GROUP_MAP,
        SERVICE,
        TALLY_SERVICE_NAME,
        TALLY_SERVICE_AGRO,
        PERIODIC,
        ADD_IMP_SERVICE_TYPE,
        COMPANY_ID,
        RRJ_SERVICE_NAME,
      } = data;

      await pool
        .request()
        .input("TERMINAL_ID", sql.Numeric(18, 0), TERMINAL_ID)
        .input("SERVICE_ID", sql.Numeric(18, 0), SERVICE_ID)
        .input("SERVICE_CODE", sql.NVarChar(20), SERVICE_CODE)
        .input("SERVICE_NAME", sql.NVarChar(100), SERVICE_NAME)
        .input("SERVICE_TYPE_CODE", sql.NVarChar(1), SERVICE_TYPE_CODE)
        .input("TAX_GROUP_ID", sql.Numeric(18, 0), TAX_GROUP_ID)
        .input("UNIT", sql.NVarChar(100), UNIT)
        .input("MAP_CODE", sql.NVarChar(100), MAP_CODE)
        .input("TAX_ON_PERCENTAGE", sql.Numeric(18, 4), TAX_ON_PERCENTAGE)
        .input("UOM_ID", sql.Numeric(18, 0), UOM_ID)
        .input("SAP_MAP_CODE", sql.NVarChar(100), SAP_MAP_CODE)
        .input("SERVICE_TYPE", sql.NVarChar(1), SERVICE_TYPE)
        .input("SERVICE_GROUP", sql.NVarChar(1), SERVICE_GROUP)
        .input("EXEMPTED", sql.NVarChar(1), EXEMPTED)
        .input("SERVICE_MAP_CODE", sql.NVarChar(1), SERVICE_MAP_CODE)
        .input("CREATED_BY", sql.NVarChar(50), CREATED_BY)
        .input("TPT_MODE", sql.NVarChar(1), TPT_MODE)
        .input("LCL_TYPE", sql.NVarChar(1), LCL_TYPE)
        .input("LCL_PER", sql.Numeric(18, 4), LCL_PER)
        .input("HAZ_PER", sql.Numeric(18, 4), HAZ_PER)
        .input("IWB_FLAG", sql.NVarChar(1), IWB_FLAG)
        .input("SERVICE_GROUP_MAP", sql.NVarChar(5), SERVICE_GROUP_MAP)
        .input("SERVICE", sql.NVarChar(1), SERVICE)
        .input("TALLY_SERVICE_NAME", sql.NVarChar(200), TALLY_SERVICE_NAME)
        .input("TALLY_SERVICE_AGRO", sql.NVarChar(200), TALLY_SERVICE_AGRO)
        .input("PERIODIC", sql.NVarChar(1), PERIODIC)
        .input("ADD_IMP_SERVICE_TYPE", sql.NVarChar(1), ADD_IMP_SERVICE_TYPE)
        .input("COMPANY_ID", sql.Numeric(18, 0), COMPANY_ID)
        .input("RRJ_SERVICE_NAME", sql.NVarChar(200), RRJ_SERVICE_NAME).query(`
          INSERT INTO SERVICE_MASTER (
            TERMINAL_ID, SERVICE_ID, SERVICE_CODE, SERVICE_NAME, SERVICE_TYPE_CODE,
            TAX_GROUP_ID, UNIT, MAP_CODE, TAX_ON_PERCENTAGE, UOM_ID, SAP_MAP_CODE,
            SERVICE_TYPE, SERVICE_GROUP, EXEMPTED, SERVICE_MAP_CODE, CREATED_BY, CREATED_ON,
            TPT_MODE, LCL_TYPE, LCL_PER, HAZ_PER, IWB_FLAG, SERVICE_GROUP_MAP, SERVICE,
            TALLY_SERVICE_NAME, TALLY_SERVICE_AGRO, PERIODIC, ADD_IMP_SERVICE_TYPE,
            COMPANY_ID, RRJ_SERVICE_NAME
          )
          VALUES (
            @TERMINAL_ID, @SERVICE_ID, @SERVICE_CODE, @SERVICE_NAME, @SERVICE_TYPE_CODE,
            @TAX_GROUP_ID, @UNIT, @MAP_CODE, @TAX_ON_PERCENTAGE, @UOM_ID, @SAP_MAP_CODE,
            @SERVICE_TYPE, @SERVICE_GROUP, @EXEMPTED, @SERVICE_MAP_CODE, @CREATED_BY, GETDATE(),
            @TPT_MODE, @LCL_TYPE, @LCL_PER, @HAZ_PER, @IWB_FLAG, @SERVICE_GROUP_MAP, @SERVICE,
            @TALLY_SERVICE_NAME, @TALLY_SERVICE_AGRO, @PERIODIC, @ADD_IMP_SERVICE_TYPE,
            @COMPANY_ID, @RRJ_SERVICE_NAME
          )
        `);

      return { success: true };
    } catch (error) {
      console.error("Create service error:", error);
      throw error;
    }
  }

  // Get service by ID
  static async getById(serviceId) {
    try {
      const result = await pool
        .request()
        .input("SERVICE_ID", sql.Numeric(18, 0), serviceId).query(`
          SELECT * FROM SERVICE_MASTER WHERE SERVICE_ID = @SERVICE_ID
        `);
      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get service by ID error:", error);
      throw error;
    }
  }

  // Get all services
  static async getAll() {
    try {
      const result = await pool
        .request()
        .query(`SELECT * FROM SERVICE_MASTER ORDER BY CREATED_ON DESC`);
      return result.recordset;
    } catch (error) {
      console.error("Get all services error:", error);
      throw error;
    }
  }

  // Update a service by ID
  static async update(serviceId, data) {
    try {
      const {
        SERVICE_CODE,
        SERVICE_NAME,
        SERVICE_TYPE_CODE,
        TAX_GROUP_ID,
        UNIT,
        MAP_CODE,
        TAX_ON_PERCENTAGE,
        UOM_ID,
        SAP_MAP_CODE,
        SERVICE_TYPE,
        SERVICE_GROUP,
        EXEMPTED,
        SERVICE_MAP_CODE,
        CREATED_BY,
        TPT_MODE,
        LCL_TYPE,
        LCL_PER,
        HAZ_PER,
        IWB_FLAG,
        SERVICE_GROUP_MAP,
        SERVICE,
        TALLY_SERVICE_NAME,
        TALLY_SERVICE_AGRO,
        PERIODIC,
        ADD_IMP_SERVICE_TYPE,
        COMPANY_ID,
        RRJ_SERVICE_NAME,
      } = data;

      await pool
        .request()
        .input("SERVICE_ID", sql.Numeric(18, 0), serviceId)
        .input("SERVICE_CODE", sql.NVarChar(20), SERVICE_CODE)
        .input("SERVICE_NAME", sql.NVarChar(100), SERVICE_NAME)
        .input("SERVICE_TYPE_CODE", sql.NVarChar(1), SERVICE_TYPE_CODE)
        .input("TAX_GROUP_ID", sql.Numeric(18, 0), TAX_GROUP_ID)
        .input("UNIT", sql.NVarChar(100), UNIT)
        .input("MAP_CODE", sql.NVarChar(100), MAP_CODE)
        .input("TAX_ON_PERCENTAGE", sql.Numeric(18, 4), TAX_ON_PERCENTAGE)
        .input("UOM_ID", sql.Numeric(18, 0), UOM_ID)
        .input("SAP_MAP_CODE", sql.NVarChar(100), SAP_MAP_CODE)
        .input("SERVICE_TYPE", sql.NVarChar(1), SERVICE_TYPE)
        .input("SERVICE_GROUP", sql.NVarChar(1), SERVICE_GROUP)
        .input("EXEMPTED", sql.NVarChar(1), EXEMPTED)
        .input("SERVICE_MAP_CODE", sql.NVarChar(1), SERVICE_MAP_CODE)
        .input("CREATED_BY", sql.NVarChar(50), CREATED_BY)
        .input("TPT_MODE", sql.NVarChar(1), TPT_MODE)
        .input("LCL_TYPE", sql.NVarChar(1), LCL_TYPE)
        .input("LCL_PER", sql.Numeric(18, 4), LCL_PER)
        .input("HAZ_PER", sql.Numeric(18, 4), HAZ_PER)
        .input("IWB_FLAG", sql.NVarChar(1), IWB_FLAG)
        .input("SERVICE_GROUP_MAP", sql.NVarChar(5), SERVICE_GROUP_MAP)
        .input("SERVICE", sql.NVarChar(1), SERVICE)
        .input("TALLY_SERVICE_NAME", sql.NVarChar(200), TALLY_SERVICE_NAME)
        .input("TALLY_SERVICE_AGRO", sql.NVarChar(200), TALLY_SERVICE_AGRO)
        .input("PERIODIC", sql.NVarChar(1), PERIODIC)
        .input("ADD_IMP_SERVICE_TYPE", sql.NVarChar(1), ADD_IMP_SERVICE_TYPE)
        .input("COMPANY_ID", sql.Numeric(18, 0), COMPANY_ID)
        .input("RRJ_SERVICE_NAME", sql.NVarChar(200), RRJ_SERVICE_NAME).query(`
          UPDATE SERVICE_MASTER
          SET SERVICE_CODE = @SERVICE_CODE,
              SERVICE_NAME = @SERVICE_NAME,
              SERVICE_TYPE_CODE = @SERVICE_TYPE_CODE,
              TAX_GROUP_ID = @TAX_GROUP_ID,
              UNIT = @UNIT,
              MAP_CODE = @MAP_CODE,
              TAX_ON_PERCENTAGE = @TAX_ON_PERCENTAGE,
              UOM_ID = @UOM_ID,
              SAP_MAP_CODE = @SAP_MAP_CODE,
              SERVICE_TYPE = @SERVICE_TYPE,
              SERVICE_GROUP = @SERVICE_GROUP,
              EXEMPTED = @EXEMPTED,
              SERVICE_MAP_CODE = @SERVICE_MAP_CODE,
              CREATED_BY = @CREATED_BY,
              TPT_MODE = @TPT_MODE,
              LCL_TYPE = @LCL_TYPE,
              LCL_PER = @LCL_PER,
              HAZ_PER = @HAZ_PER,
              IWB_FLAG = @IWB_FLAG,
              SERVICE_GROUP_MAP = @SERVICE_GROUP_MAP,
              SERVICE = @SERVICE,
              TALLY_SERVICE_NAME = @TALLY_SERVICE_NAME,
              TALLY_SERVICE_AGRO = @TALLY_SERVICE_AGRO,
              PERIODIC = @PERIODIC,
              ADD_IMP_SERVICE_TYPE = @ADD_IMP_SERVICE_TYPE,
              COMPANY_ID = @COMPANY_ID,
              RRJ_SERVICE_NAME = @RRJ_SERVICE_NAME
          WHERE SERVICE_ID = @SERVICE_ID
        `);

      return { success: true };
    } catch (error) {
      console.error("Update service error:", error);
      throw error;
    }
  }

  // Delete a service by ID
  static async delete(serviceId) {
    try {
      await pool
        .request()
        .input("SERVICE_ID", sql.Numeric(18, 0), serviceId)
        .query(`DELETE FROM SERVICE_MASTER WHERE SERVICE_ID = @SERVICE_ID`);

      return { success: true };
    } catch (error) {
      console.error("Delete service error:", error);
      throw error;
    }
  }
}

module.exports = ServiceMasterModal;
