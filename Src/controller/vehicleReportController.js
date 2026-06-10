const { pool } = require("../config/dbconfig");

exports.getVehicleMasterReport = async (req, res) => {
  try {
    const query = `
      WITH VehicleExpenses AS (
        SELECT 
          eb.EQUIPMENT_NO,
          SUM(ebd.TOTAL_AMOUNT) as TOTAL_EXPENSE,
          MAX(eb.ODOMETER) as MAX_ODOMETER,
          MIN(eb.ODOMETER) as MIN_ODOMETER
        FROM EXPENSE_BOOKING eb
        LEFT JOIN EXPENSE_BOOKING_DETAILS ebd ON eb.EXPENSE_ID = ebd.EXPENSE_ID
        WHERE eb.EQUIPMENT_NO IS NOT NULL
        GROUP BY eb.EQUIPMENT_NO
      )
      SELECT 
        v.EQUIPMENT_ID,
        v.EQUIPMENT_NO as VEHICLE_NO,
        v.EQUIPMENT_TYPE as VEHICLE_TYPE,
        v.MANUFACTURER as MAKE,
        v.MODEL as MODEL,
        v.MANUFACTURING_YEAR as YEAR,
        v.TERMINAL_ID,
        v.PURCHAGE_DATE,
        v.INSURANCE_NO,
        v.ENG_NO,
        v.ENG_TYPE,
        v.VIN_NO,
        v.CONDITION,
        v.TARE_WT,
        v.GROSS_WT,
        v.STATUS,
        v.BED_CHANGEABLE,
        v.REGISTRATION_DATE,
        v.INS_VENDOR,
        v.INS_VALIDITY,
        v.PERMIT_FROM,
        v.PERMIT_TO,
        v.POLLUTION_VALIDITY,
        v.RTO,
        v.VALIDITY,
        v.HP_BY,
        v.XL_TYPE,
        v.COMPANY_ID,
        v.DRIVER_ATTACH_ID,
        v.DRIVER_ATTCAH_STATUS,
        v.STATE_PERMIT_FROM,
        v.STATE_PERMIT_TO,
        v.ROAD_TAX_VALIDITY,
        v.REMARK_NOTE,
        v.VENDER_ID,
        CASE WHEN v.IMAGE IS NOT NULL THEN 1 ELSE 0 END AS HAS_IMAGE,
        CASE WHEN v.FITNESS_DOC IS NOT NULL THEN 1 ELSE 0 END AS HAS_FITNESS_DOC,
        CASE WHEN v.RC_DOC IS NOT NULL THEN 1 ELSE 0 END AS HAS_RC_DOC,
        CASE WHEN v.INSURANCE_DOC IS NOT NULL THEN 1 ELSE 0 END AS HAS_INSURANCE_DOC,
        CASE WHEN v.PERMIT_A IS NOT NULL THEN 1 ELSE 0 END AS HAS_PERMIT_A,
        CASE WHEN v.PERMIT_B IS NOT NULL THEN 1 ELSE 0 END AS HAS_PERMIT_B,
        ISNULL(ve.MAX_ODOMETER - ve.MIN_ODOMETER, 0) AS TOTAL_KM_RUN,
        ISNULL(ve.TOTAL_EXPENSE, 0) AS TOTAL_EXPENSE
      FROM FLEET_EQUIPMENT_MASTER v
      LEFT JOIN VehicleExpenses ve ON v.EQUIPMENT_NO = ve.EQUIPMENT_NO
      ORDER BY v.EQUIPMENT_NO
    `;

    const result = await pool.request().query(query);
    
    // Process results to add Cost per KM and document URLs
    const reportData = result.recordset.map(row => {
      const costPerKm = row.TOTAL_KM_RUN > 0 ? (row.TOTAL_EXPENSE / row.TOTAL_KM_RUN).toFixed(2) : 0;
      
      const mapDoc = (hasDoc, docName) => {
        return hasDoc ? `api/equipment/${row.EQUIPMENT_ID}/document/${docName}` : null;
      };

      return {
        ...row,
        COST_PER_KM: costPerKm,
        IMAGE: mapDoc(row.HAS_IMAGE, "IMAGE"),
        FITNESS_DOC: mapDoc(row.HAS_FITNESS_DOC, "FITNESS_DOC"),
        RC_DOC: mapDoc(row.HAS_RC_DOC, "RC_DOC"),
        INSURANCE_DOC: mapDoc(row.HAS_INSURANCE_DOC, "INSURANCE_DOC"),
        PERMIT_A: mapDoc(row.HAS_PERMIT_A, "PERMIT_A"),
        PERMIT_B: mapDoc(row.HAS_PERMIT_B, "PERMIT_B")
      };
    });

    res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error("Error fetching vehicle master report:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
