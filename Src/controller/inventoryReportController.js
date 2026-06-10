const { pool, sql } = require("../config/dbconfig");

exports.getInventoryReport = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        ROW_NUMBER() OVER(ORDER BY ITEM_NAME) AS srNo,
        ITEM_ID as id,
        ITEM_NAME as itemName,
        ITEM_GROUP as itemGroup,
        ITEM_CODE as itemCode,
        UNIT as uomCode,
        QNTY as qnty,
        UNIT_PRICE as rate
      FROM ITEM_MASTER
    `);

    // Format the response slightly if needed to match the frontend,
    // e.g., mapping UNIT to uomCode, etc.
    const data = result.recordset.map(row => ({
      ...row,
      uomCode: row.uomCode || 'not mapped'
    }));

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error("Get inventory report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Inventory Report",
      error: error.message
    });
  }
};
