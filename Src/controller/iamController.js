const { pool, sql } = require("../config/dbconfig");
const {
  hasIamTables,
  getUserColumnFlags,
  listRoles,
  listPermissions,
  seedDefaultPermissions,
  listUserAssignments,
  createRole,
  replaceRolePermissions,
  replaceUserAssignments,
} = require("../services/iamService");

const getCurrentTenantId = async (req) => {
  if (req.user?.tenantId) {
    return Number(req.user.tenantId);
  }

  const flags = await getUserColumnFlags();
  if (!flags.hasTenantId) {
    const fallback = await pool
      .request()
      .query("SELECT TOP 1 id FROM dbo.iam_tenants ORDER BY id");
    return Number(fallback.recordset[0]?.id || 0);
  }

  const result = await pool
    .request()
    .input("user_id", sql.Int, req.user.id)
    .query("SELECT tenant_id FROM dbo.users WHERE id = @user_id");

  return Number(result.recordset[0]?.tenant_id || 0);
};

exports.getBootstrap = async (req, res) => {
  try {
    const enabled = await hasIamTables();
    if (!enabled) {
      return res.status(200).json({
        success: true,
        enabled: false,
        message: "IAM tables are not available yet. Run migration 012_iam_core.sql first.",
      });
    }

    const tenantId = await getCurrentTenantId(req);
    const [roles, permissions, users] = await Promise.all([
      listRoles(tenantId),
      listPermissions(),
      listUserAssignments(tenantId),
    ]);

    return res.status(200).json({
      success: true,
      enabled: true,
      tenantId,
      data: {
        roles,
        permissions,
        users,
      },
    });
  } catch (error) {
    console.error("IAM bootstrap error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load IAM data",
    });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { roleCode, roleName, description } = req.body;
    if (!roleCode || !roleName) {
      return res.status(400).json({
        success: false,
        message: "roleCode and roleName are required",
      });
    }

    const tenantId = await getCurrentTenantId(req);
    const role = await createRole({
      tenantId,
      roleCode: String(roleCode).trim().toUpperCase(),
      roleName: String(roleName).trim(),
      description: description ? String(description).trim() : null,
    });

    return res.status(201).json({
      success: true,
      message: "IAM role created successfully",
      data: role,
    });
  } catch (error) {
    console.error("IAM create role error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create IAM role",
    });
  }
};

exports.updateRolePermissions = async (req, res) => {
  try {
    const roleId = Number(req.params.id);
    const permissionIds = Array.isArray(req.body.permissionIds)
      ? req.body.permissionIds.map((id) => Number(id)).filter(Boolean)
      : [];
    const tenantId = await getCurrentTenantId(req);

    await replaceRolePermissions({
      tenantId,
      roleId,
      permissionIds,
    });

    return res.status(200).json({
      success: true,
      message: "Role permissions updated successfully",
    });
  } catch (error) {
    console.error("IAM role permission error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update role permissions",
    });
  }
};

exports.updateUserAccess = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const roleIds = Array.isArray(req.body.roleIds)
      ? req.body.roleIds.map((id) => Number(id)).filter(Boolean)
      : [];
    const terminalIds = Array.isArray(req.body.terminalIds)
      ? req.body.terminalIds.map((id) => Number(id)).filter(Boolean)
      : [];
    const tenantId = await getCurrentTenantId(req);

    await replaceUserAssignments({
      tenantId,
      userId,
      roleIds,
      terminalIds,
    });

    return res.status(200).json({
      success: true,
      message: "User IAM access updated successfully",
    });
  } catch (error) {
    console.error("IAM user access error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update user access",
    });
  }
};

exports.seedDefaults = async (req, res) => {
  try {
    const permissions = await seedDefaultPermissions();
    return res.status(200).json({
      success: true,
      message: "Default IAM permissions seeded successfully",
      data: permissions,
    });
  } catch (error) {
    console.error("IAM seed defaults error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to seed default permissions",
    });
  }
};

exports.getTerminals = async (req, res) => {
  try {
    const terminals = new Map();
    const debug = {
      locationMaster: { exists: false, distinctTerminalIds: 0 },
      iamUserTerminals: { exists: false, distinctTerminalIds: 0 },
      users: {
        has_terminal_id: false,
        distinct_terminal_id: 0,
        has_default_terminal_id: false,
        distinct_default_terminal_id: 0,
      },
    };

    const addTerminal = (terminalId, sampleLabel) => {
      const id = Number(terminalId);
      if (!Number.isFinite(id) || id <= 0) return;
      if (!terminals.has(id)) {
        terminals.set(id, new Set());
      }
      const label = String(sampleLabel || "").trim();
      if (label) {
        terminals.get(id).add(label);
      }
    };

    // 1) LOCATION_MASTER (best label source)
    const hasLocationMaster = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID('dbo.LOCATION_MASTER', 'U') IS NULL THEN 0 ELSE 1 END AS has_table
    `);
    if (hasLocationMaster.recordset?.[0]?.has_table) {
      debug.locationMaster.exists = true;
      const result = await pool.request().query(`
        SELECT
          CAST(TERMINAL_ID AS NUMERIC(18,0)) AS terminal_id,
          MIN(CAST(LOCATION_NAME AS NVARCHAR(200))) AS sample_location
        FROM dbo.LOCATION_MASTER
        WHERE TERMINAL_ID IS NOT NULL
        GROUP BY TERMINAL_ID
      `);
      result.recordset.forEach((row) => addTerminal(row.terminal_id, row.sample_location));
      debug.locationMaster.distinctTerminalIds = result.recordset.length;
    }

    // 2) IAM user terminals mapping (if populated)
    const hasUserTerminals = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID('dbo.iam_user_terminals', 'U') IS NULL THEN 0 ELSE 1 END AS has_table
    `);
    if (hasUserTerminals.recordset?.[0]?.has_table) {
      debug.iamUserTerminals.exists = true;
      const result = await pool.request().query(`
        SELECT DISTINCT CAST(terminal_id AS NUMERIC(18,0)) AS terminal_id
        FROM dbo.iam_user_terminals
        WHERE terminal_id IS NOT NULL
      `);
      result.recordset.forEach((row) => addTerminal(row.terminal_id, null));
      debug.iamUserTerminals.distinctTerminalIds = result.recordset.length;
    }

    // 3) users table columns (legacy: terminal_id / new: default_terminal_id)
    const userCols = await pool.request().query(`
      SELECT
        CASE WHEN COL_LENGTH('dbo.users', 'terminal_id') IS NULL THEN 0 ELSE 1 END AS has_terminal_id,
        CASE WHEN COL_LENGTH('dbo.users', 'default_terminal_id') IS NULL THEN 0 ELSE 1 END AS has_default_terminal_id
    `);
    const hasTerminalId = !!userCols.recordset?.[0]?.has_terminal_id;
    const hasDefaultTerminalId = !!userCols.recordset?.[0]?.has_default_terminal_id;
    debug.users.has_terminal_id = hasTerminalId;
    debug.users.has_default_terminal_id = hasDefaultTerminalId;

    if (hasTerminalId) {
      const result = await pool.request().query(`
        SELECT DISTINCT CAST(terminal_id AS NUMERIC(18,0)) AS terminal_id
        FROM dbo.users
        WHERE terminal_id IS NOT NULL
      `);
      result.recordset.forEach((row) => addTerminal(row.terminal_id, null));
      debug.users.distinct_terminal_id = result.recordset.length;
    }

    if (hasDefaultTerminalId) {
      const result = await pool.request().query(`
        SELECT DISTINCT CAST(default_terminal_id AS NUMERIC(18,0)) AS terminal_id
        FROM dbo.users
        WHERE default_terminal_id IS NOT NULL
      `);
      result.recordset.forEach((row) => addTerminal(row.terminal_id, null));
      debug.users.distinct_default_terminal_id = result.recordset.length;
    }

    const data = Array.from(terminals.entries())
      .map(([terminalId, labels]) => {
        const labelList = Array.from(labels).slice(0, 2);
        return {
          terminalId,
          label:
            labelList.length > 0
              ? `Terminal ${terminalId} - ${labelList.join(", ")}`
              : `Terminal ${terminalId}`,
        };
      })
      .sort((a, b) => a.terminalId - b.terminalId);

    return res.status(200).json({ success: true, data, debug });
  } catch (error) {
    console.error("IAM terminals error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load terminals",
    });
  }
};
