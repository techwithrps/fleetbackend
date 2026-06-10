const { pool, sql } = require("../config/dbconfig");

class ItemGroupModel {
  static async getAllGroups() {
    try {
      const result = await pool.request().query(
        "SELECT * FROM ITEM_GROUP_MASTER ORDER BY GROUP_ID DESC"
      );
      return result.recordset;
    } catch (error) {
      throw error;
    }
  }

  static async createGroup(data) {
    try {
      // Generate Group Code e.g. GRP-001
      const countResult = await pool.request().query(
        "SELECT COUNT(*) AS count FROM ITEM_GROUP_MASTER"
      );
      const count = countResult.recordset[0].count;
      const groupCode = `GRP-${String(count + 1).padStart(3, '0')}`;

      // Get next GROUP_ID
      const idResult = await pool.request().query(
        "SELECT ISNULL(MAX(GROUP_ID), 0) + 1 AS nextId FROM ITEM_GROUP_MASTER"
      );
      const nextId = idResult.recordset[0].nextId;

      const result = await pool.request()
        .input('groupId', sql.Numeric, nextId)
        .input('groupCode', sql.VarChar, groupCode)
        .input('groupName', sql.VarChar, data.groupName)
        .input('createdBy', sql.VarChar, data.createdBy || 'System')
        .query(`
          INSERT INTO ITEM_GROUP_MASTER (GROUP_ID, GROUP_CODE, GROUP_NAME, CREATED_BY)
          VALUES (@groupId, @groupCode, @groupName, @createdBy);
          
          SELECT * FROM ITEM_GROUP_MASTER WHERE GROUP_ID = @groupId;
        `);

      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ItemGroupModel;
