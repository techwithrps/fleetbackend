const { pool, sql } = require("../config/dbconfig");
const { applyLocationFilter } = require("../utils/queryHelper");

class AlertModel {
  static async getVehicleExpiryAlerts(days, user = null) {
    try {
      const request = pool.request()
        .input("days", sql.Int, days);
      
      const filter = applyLocationFilter(request, user);

      const result = await request.query(`
          DECLARE @today DATE = CAST(GETDATE() AS DATE);
          DECLARE @endDate DATE = DATEADD(DAY, @days, @today);

          SELECT * FROM (
            SELECT
              EQUIPMENT_ID,
              EQUIPMENT_NO,
              'INSURANCE_VALIDITY' AS EXPIRY_TYPE,
              INS_VALIDITY AS EXPIRY_DATE,
              TERMINAL_ID
            FROM FLEET_EQUIPMENT_MASTER
            WHERE INS_VALIDITY IS NOT NULL
              AND INS_VALIDITY BETWEEN @today AND @endDate

            UNION ALL
            SELECT
              EQUIPMENT_ID,
              EQUIPMENT_NO,
              'PERMIT_VALIDITY' AS EXPIRY_TYPE,
              PERMIT_TO AS EXPIRY_DATE,
              TERMINAL_ID
            FROM FLEET_EQUIPMENT_MASTER
            WHERE PERMIT_TO IS NOT NULL
              AND PERMIT_TO BETWEEN @today AND @endDate

            UNION ALL
            SELECT
              EQUIPMENT_ID,
              EQUIPMENT_NO,
              'STATE_PERMIT_VALIDITY' AS EXPIRY_TYPE,
              STATE_PERMIT_TO AS EXPIRY_DATE,
              TERMINAL_ID
            FROM FLEET_EQUIPMENT_MASTER
            WHERE STATE_PERMIT_TO IS NOT NULL
              AND STATE_PERMIT_TO BETWEEN @today AND @endDate

            UNION ALL
            SELECT
              EQUIPMENT_ID,
              EQUIPMENT_NO,
              'POLLUTION_VALIDITY' AS EXPIRY_TYPE,
              POLLUTION_VALIDITY AS EXPIRY_DATE,
              TERMINAL_ID
            FROM FLEET_EQUIPMENT_MASTER
            WHERE POLLUTION_VALIDITY IS NOT NULL
              AND POLLUTION_VALIDITY BETWEEN @today AND @endDate

            UNION ALL
            SELECT
              EQUIPMENT_ID,
              EQUIPMENT_NO,
              'ROAD_TAX_VALIDITY' AS EXPIRY_TYPE,
              ROAD_TAX_VALIDITY AS EXPIRY_DATE,
              TERMINAL_ID
            FROM FLEET_EQUIPMENT_MASTER
            WHERE ROAD_TAX_VALIDITY IS NOT NULL
              AND ROAD_TAX_VALIDITY BETWEEN @today AND @endDate

            UNION ALL
            SELECT
              EQUIPMENT_ID,
              EQUIPMENT_NO,
              'FITNESS_VALIDITY' AS EXPIRY_TYPE,
              VALIDITY AS EXPIRY_DATE,
              TERMINAL_ID
            FROM FLEET_EQUIPMENT_MASTER
            WHERE VALIDITY IS NOT NULL
              AND VALIDITY BETWEEN @today AND @endDate
          ) AS Alerts
          WHERE 1=1 ${filter}
          ORDER BY EXPIRY_DATE ASC;
        `);
      return result.recordset || [];
    } catch (error) {
      console.error("Get vehicle expiry alerts error:", error);
      throw error;
    }
  }

  static async getDriverExpiryAlerts(days, user = null) {
    try {
      const request = pool.request()
        .input("days", sql.Int, days);
      
      const filter = applyLocationFilter(request, user);

      const result = await request.query(`
          DECLARE @today DATE = CAST(GETDATE() AS DATE);
          DECLARE @endDate DATE = DATEADD(DAY, @days, @today);

          SELECT
            DRIVER_ID,
            DRIVER_NAME,
            CONTACT_NO,
            MOBILE_NO,
            DL_NO,
            DL_RENEWABLE_DATE AS EXPIRY_DATE
          FROM DRIVER_MASTER
          WHERE DL_RENEWABLE_DATE IS NOT NULL
            AND DL_RENEWABLE_DATE BETWEEN @today AND @endDate ${filter}
          ORDER BY DL_RENEWABLE_DATE ASC;
        `);
      return result.recordset || [];
    } catch (error) {
      console.error("Get driver expiry alerts error:", error);
      throw error;
    }
  }
}

module.exports = AlertModel;
