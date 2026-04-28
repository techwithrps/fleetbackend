const { pool } = require("../config/dbconfig");

const toInt = (value) => Number(value) || 0;
const normalizeColumns = (recordset = []) =>
  new Set((recordset || []).map((row) => String(row.COLUMN_NAME || "").toUpperCase()));

class ReportMasterController {
  static async getAllSummary(req, res) {
    try {
      const [tire, vehicle, driver, bed] = await Promise.all([
        this.getTyreSummary(req.user),
        this.getVehicleSummary(req.user),
        this.getDriverSummary(req.user),
        this.getBedSummary(req.user),
      ]);

      res.json({
        success: true,
        data: { tyre: tire, vehicle, driver, bed },
      });
    } catch (error) {
      console.error("Report master summary error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch report summary." });
    }
  }

  static async getEntitySummary(req, res) {
    try {
      const entity = String(req.params.entity || "").toLowerCase();
      const mapping = {
        tyre: this.getTyreSummary,
        vehicle: this.getVehicleSummary,
        driver: this.getDriverSummary,
        bed: this.getBedSummary,
      };

      const fn = mapping[entity];
      if (!fn) {
        return res.status(400).json({ success: false, error: "Unsupported entity." });
      }

      const data = await fn.call(this, req.user);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Report entity summary error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch entity summary." });
    }
  }

  static async getTyreSummary(user = null) {
    const request = pool.request();
    const filter = await applyLocationFilterByTable(request, user, {
      tableName: "TIRE_MASTER",
    });
    const historyFilter = await applyLocationFilterByTable(pool.request(), user, {
      tableName: "TIRE_ATTACHMENT_HISTORY",
    });

    const [totals, attached, columnsResult] = await Promise.all([
      request.query(`SELECT COUNT(1) AS total FROM dbo.TIRE_MASTER WHERE 1=1 ${filter}`),
      pool.request().query(`
        SELECT COUNT(DISTINCT TIRE_ID) AS attached
        FROM dbo.TIRE_ATTACHMENT_HISTORY
        WHERE ISNULL(ATTACH_STATUS, 'ATTACHED') <> 'DETACHED' ${historyFilter}
      `),
      pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'TIRE_MASTER'
      `),
    ]);
    const columns = normalizeColumns(columnsResult.recordset);
    const statusRows = columns.has("STATUS")
      ? await pool.request().query(`
          SELECT UPPER(ISNULL(STATUS, 'UNKNOWN')) AS status, COUNT(1) AS count
          FROM dbo.TIRE_MASTER
          GROUP BY UPPER(ISNULL(STATUS, 'UNKNOWN'))
        `)
      : { recordset: [] };

    const total = toInt(totals.recordset[0]?.total);
    const inUse = toInt(attached.recordset[0]?.attached);
    const available = Math.max(total - inUse, 0);

    return {
      entity: "tyre",
      total,
      in_use: inUse,
      available,
      breakdown: statusRows.recordset || [],
    };
  }

  static async getVehicleSummary(user = null) {
    const request = pool.request();
    const filter = await applyLocationFilterByTable(request, user, {
      tableName: "FLEET_EQUIPMENT_MASTER",
    });

    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'FLEET_EQUIPMENT_MASTER'
    `);
    const columns = normalizeColumns(columnsResult.recordset);
    const statusExpr = columns.has("STATUS")
      ? "UPPER(ISNULL(STATUS, ''))"
      : "'ACTIVE'";

    const totals = await request.query(`
      SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN ${statusExpr} IN ('A', 'ACTIVE') THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN ${statusExpr} IN ('I', 'INACTIVE') THEN 1 ELSE 0 END) AS inactive
      FROM dbo.FLEET_EQUIPMENT_MASTER
      WHERE 1=1 ${filter}
    `);

    const row = totals.recordset[0] || {};
    return {
      entity: "vehicle",
      total: toInt(row.total),
      active: toInt(row.active),
      inactive: toInt(row.inactive),
      available: toInt(row.active),
    };
  }

  static async getDriverSummary(user = null) {
    const request = pool.request();
    const filter = await applyLocationFilterByTable(request, user, {
      tableName: "DRIVER_MASTER",
    });

    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'DRIVER_MASTER'
    `);
    const columns = normalizeColumns(columnsResult.recordset);
    const activeExpr = columns.has("ACTIVE_FLAGE")
      ? "UPPER(ISNULL(ACTIVE_FLAGE, 'N'))"
      : columns.has("ACTIVE_FLAG")
        ? "UPPER(ISNULL(ACTIVE_FLAG, 'N'))"
        : columns.has("STATUS")
          ? "UPPER(ISNULL(STATUS, 'N'))"
          : "'N'";
    const attachedExpr = columns.has("ATTACH_STATUS")
      ? "SUM(CASE WHEN UPPER(ISNULL(ATTACH_STATUS, 'DETACHED')) = 'ATTACHED' THEN 1 ELSE 0 END)"
      : "0";

    const totals = await request.query(`
      SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN ${activeExpr} IN ('Y', 'A', 'ACTIVE') THEN 1 ELSE 0 END) AS active,
        ${attachedExpr} AS attached
      FROM dbo.DRIVER_MASTER
      WHERE 1=1 ${filter}
    `);

    const row = totals.recordset[0] || {};
    const total = toInt(row.total);
    const attached = toInt(row.attached);
    return {
      entity: "driver",
      total,
      active: toInt(row.active),
      attached,
      available: Math.max(total - attached, 0),
    };
  }

  static async getBedSummary(user = null) {
    const request = pool.request();
    const filter = await applyLocationFilterByTable(request, user, {
      tableName: "BED_MASTER",
    });
    const historyFilter = await applyLocationFilterByTable(pool.request(), user, {
      tableName: "BED_ATTACHMENT_HISTORY",
    });

    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'BED_MASTER'
    `);
    const columns = normalizeColumns(columnsResult.recordset);
    const statusExpr = columns.has("STATUS")
      ? "UPPER(ISNULL(STATUS, ''))"
      : "'ACTIVE'";

    const [totals, attached] = await Promise.all([
      request.query(`
        SELECT
          COUNT(1) AS total,
          SUM(CASE WHEN ${statusExpr} = 'ACTIVE' THEN 1 ELSE 0 END) AS active
        FROM dbo.BED_MASTER
        WHERE 1=1 ${filter}
      `),
      pool.request().query(`
        SELECT COUNT(DISTINCT BED_ID) AS attached
        FROM dbo.BED_ATTACHMENT_HISTORY
        WHERE ISNULL(ATTACH_STATUS, 'ATTACHED') <> 'DETACHED' ${historyFilter}
      `),
    ]);

    const total = toInt(totals.recordset[0]?.total);
    const attachedCount = toInt(attached.recordset[0]?.attached);
    return {
      entity: "bed",
      total,
      active: toInt(totals.recordset[0]?.active),
      attached: attachedCount,
      available: Math.max(total - attachedCount, 0),
    };
  }
}

for (const method of ["getTyreSummary", "getVehicleSummary", "getDriverSummary", "getBedSummary"]) {
  const original = ReportMasterController[method];
  ReportMasterController[method] = async function safeSummary(...args) {
    try {
      return await original.call(this, ...args);
    } catch (error) {
      console.error(`Report summary fallback for ${method}:`, error.message);
      const entity = method.replace("get", "").replace("Summary", "").toLowerCase();
      return { entity, total: 0, available: 0, active: 0, inactive: 0, attached: 0, in_use: 0, breakdown: [] };
    }
  };
}

module.exports = ReportMasterController;
