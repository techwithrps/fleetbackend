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

    const permissionResult = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          up.page_id as page_id,
          ISNULL(up.can_view, 0) as can_view,
          ISNULL(up.can_create, 0) as can_create,
          ISNULL(up.can_edit, 0) as can_edit,
          ISNULL(up.can_delete, 0) as can_delete
        FROM dbo.USER_PERMISSIONS up
        JOIN dbo.PAGE_MASTER p ON up.page_id = p.PAGE_ID
        WHERE up.user_id = @user_id
      `);

    const locationResult = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT CAST(terminal_id AS NUMERIC(18,0)) AS location_id
        FROM dbo.user_locations
        WHERE user_id = @user_id
        ORDER BY terminal_id
      `);

    const permissions = permissionResult.recordset;
    const locations = locationResult.recordset;

    // The UI still expects rows keyed by location_id + page_id.
    // Persist pages globally in USER_PERMISSIONS and selected terminals in user_locations,
    // then expand them back here so the modal can render existing assignments.
    const data =
      locations.length > 0
        ? locations.flatMap((location) =>
            permissions.map((permission) => ({
              location_id: Number(location.location_id),
              ...permission,
            }))
          )
        : permissions;

    res.json({ success: true, data });
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
    const { assignments } = req.body; // Expecting Array of objects: [{ page_id: 3, can_view: true, ... }, ...]

    if (!userId || !Array.isArray(assignments)) {
      return res.status(400).json({ success: false, error: "Invalid data format" });
    }

    await transaction.begin();
    const request = new sql.Request(transaction);

    const distinctLocationIds = [
      ...new Set(
        assignments
          .map((item) => Number(item.location_id))
          .filter((locationId) => Number.isFinite(locationId) && locationId > 0)
      ),
    ];

    const permissionByPage = new Map();
    assignments.forEach((item) => {
      const pageId = Number(item.page_id);
      if (!Number.isFinite(pageId) || pageId <= 0) return;

      const previous = permissionByPage.get(pageId) || {
        page_id: pageId,
        can_view: 0,
        can_create: 0,
        can_edit: 0,
        can_delete: 0,
      };

      permissionByPage.set(pageId, {
        page_id: pageId,
        can_view: previous.can_view || (item.can_view ? 1 : 0),
        can_create: previous.can_create || (item.can_create ? 1 : 0),
        can_edit: previous.can_edit || (item.can_edit ? 1 : 0),
        can_delete: previous.can_delete || (item.can_delete ? 1 : 0),
      });
    });

    // 1. Delete old access map for this user totally
    await request
      .input("user_id", sql.Int, userId)
      .query(`DELETE FROM dbo.USER_PERMISSIONS WHERE user_id = @user_id`);

    await new sql.Request(transaction)
      .input("user_id", sql.Int, userId)
      .query(`DELETE FROM dbo.user_locations WHERE user_id = @user_id`);

    for (const locationId of distinctLocationIds) {
      await new sql.Request(transaction)
        .input("user_id", sql.Int, userId)
        .input("terminal_id", sql.Numeric(18, 0), locationId)
        .query(`
          INSERT INTO dbo.user_locations (user_id, terminal_id)
          VALUES (@user_id, @terminal_id)
        `);
    }

    // USER_PERMISSIONS is unique on (user_id, page_id), so merge duplicate page
    // selections coming from multiple chosen locations into one permission row.
    for (const item of permissionByPage.values()) {
      if (item.page_id) {
        await new sql.Request(transaction)
          .input("user_id", sql.Int, userId)
          .input("page_id", sql.Int, item.page_id)
          .input("can_view", sql.Bit, item.can_view ? 1 : 0)
          .input("can_create", sql.Bit, item.can_create ? 1 : 0)
          .input("can_edit", sql.Bit, item.can_edit ? 1 : 0)
          .input("can_delete", sql.Bit, item.can_delete ? 1 : 0)
          .query(`
            INSERT INTO dbo.USER_PERMISSIONS (user_id, page_id, can_view, can_create, can_edit, can_delete)
            VALUES (@user_id, @page_id, @can_view, @can_create, @can_edit, @can_delete)
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
