const { pool, sql } = require("../config/dbconfig");

// Get all Pages from PAGE_MASTER
exports.getAllPages = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT PAGE_ID, PAGE_NAME, MODULE_GROUP 
      FROM dbo.PAGE_MASTER 
      WHERE STATUS = 'ACTIVE'
      ORDER BY MODULE_GROUP, PAGE_ID
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get Pages Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch pages" });
  }
};

// Get all Locations from LOCATION_MASTER
exports.getAllLocations = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT CAST(LOCATION_ID AS NUMERIC(18,0)) as location_id, LOCATION_NAME 
      FROM dbo.LOCATION_MASTER
      WHERE LOCATION_ID IS NOT NULL
      ORDER BY LOCATION_NAME
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get Locations Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch locations" });
  }
};

// Get specific User's Access (which pages in which locations)
exports.getUserAccess = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, error: "Invalid user ID" });

    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          CAST(LOCATION_ID AS NUMERIC(18,0)) as location_id, 
          PAGE_ID as page_id,
          ISNULL(CAN_VIEW, 0) as can_view,
          ISNULL(CAN_CREATE, 0) as can_create,
          ISNULL(CAN_EDIT, 0) as can_edit
        FROM dbo.USER_PAGE_ACCESS_MAPPING
        WHERE USER_ID = @user_id
      `);
      
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get User Access Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user access" });
  }
};

// Save Admin's checkboxes assignments for a User
exports.saveUserAccess = async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    const userId = Number(req.params.userId);
    const { assignments } = req.body; // Expecting Array of objects: [{ location_id: 1, page_id: 3 }, ...]

    if (!userId || !Array.isArray(assignments)) {
      return res.status(400).json({ success: false, error: "Invalid data format" });
    }

    await transaction.begin();
    const request = new sql.Request(transaction);

    // 1. Delete old access map for this user totally
    await request
      .input("user_id", sql.Int, userId)
      .query(`DELETE FROM dbo.USER_PAGE_ACCESS_MAPPING WHERE USER_ID = @user_id`);

    // 2. Insert the newly selected checkboxes 
    // We will do bulk insert or loop through them
    for (const item of assignments) {
      if (item.location_id && item.page_id) {
        await new sql.Request(transaction)
          .input("user_id", sql.Int, userId)
          .input("location_id", sql.Numeric(18,0), item.location_id)
          .input("page_id", sql.Int, item.page_id)
          .input("can_view", sql.Bit, item.can_view ? 1 : 0)
          .input("can_create", sql.Bit, item.can_create ? 1 : 0)
          .input("can_edit", sql.Bit, item.can_edit ? 1 : 0)
          .input("assigned_by", sql.Int, req.user?.id || null)
          .query(`
            INSERT INTO dbo.USER_PAGE_ACCESS_MAPPING (USER_ID, LOCATION_ID, PAGE_ID, CAN_VIEW, CAN_CREATE, CAN_EDIT, ASSIGNED_BY)
            VALUES (@user_id, @location_id, @page_id, @can_view, @can_create, @can_edit, @assigned_by)
          `);
      }
    }

    await transaction.commit();
    res.json({ success: true, message: "User access updated successfully!" });
  } catch (error) {
    console.error("Save User Access Error:", error);
    await transaction.rollback();
    res.status(500).json({ success: false, error: "Failed to save user access" });
  }
};
