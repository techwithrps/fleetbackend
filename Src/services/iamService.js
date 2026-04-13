const { pool, sql } = require("../config/dbconfig");

const hasIamTables = async () => {
  try {
    const result = await pool.request().query(`
      SELECT
        CASE WHEN OBJECT_ID('dbo.iam_tenants', 'U') IS NULL THEN 0 ELSE 1 END AS has_tenants,
        CASE WHEN OBJECT_ID('dbo.iam_roles', 'U') IS NULL THEN 0 ELSE 1 END AS has_roles,
        CASE WHEN OBJECT_ID('dbo.iam_permissions', 'U') IS NULL THEN 0 ELSE 1 END AS has_permissions,
        CASE WHEN OBJECT_ID('dbo.iam_user_roles', 'U') IS NULL THEN 0 ELSE 1 END AS has_user_roles,
        CASE WHEN OBJECT_ID('dbo.iam_user_terminals', 'U') IS NULL THEN 0 ELSE 1 END AS has_user_terminals
    `);

    const flags = result.recordset[0] || {};
    return (
      !!flags.has_tenants &&
      !!flags.has_roles &&
      !!flags.has_permissions &&
      !!flags.has_user_roles &&
      !!flags.has_user_terminals
    );
  } catch (error) {
    return false;
  }
};

const getUserColumnFlags = async () => {
  try {
    const result = await pool.request().query(`
      SELECT
        CASE WHEN COL_LENGTH('dbo.users', 'tenant_id') IS NULL THEN 0 ELSE 1 END AS has_tenant_id,
        CASE WHEN COL_LENGTH('dbo.users', 'default_terminal_id') IS NULL THEN 0 ELSE 1 END AS has_default_terminal_id
    `);

    return {
      hasTenantId: !!result.recordset[0]?.has_tenant_id,
      hasDefaultTerminalId: !!result.recordset[0]?.has_default_terminal_id,
    };
  } catch (error) {
    return {
      hasTenantId: false,
      hasDefaultTerminalId: false,
    };
  }
};

const getTenantScopedUser = async (userId) => {
  const flags = await getUserColumnFlags();
  const result = await pool.request().input("user_id", sql.Int, userId).query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      ${flags.hasTenantId ? "u.tenant_id" : "NULL AS tenant_id"},
      ${flags.hasDefaultTerminalId ? "u.default_terminal_id" : "NULL AS default_terminal_id"},
      ${flags.hasTenantId ? "t.name" : "NULL"} AS tenant_name
    FROM dbo.users u
    ${flags.hasTenantId ? "LEFT JOIN dbo.iam_tenants t ON t.id = u.tenant_id" : ""}
    WHERE u.id = @user_id
  `);

  return result.recordset[0] || null;
};

const getUserRoleAssignments = async (userId) => {
  const result = await pool.request().input("user_id", sql.Int, userId).query(`
    SELECT
      r.id,
      r.role_code,
      r.role_name
    FROM dbo.iam_user_roles ur
    INNER JOIN dbo.iam_roles r ON r.id = ur.role_id
    WHERE ur.user_id = @user_id
      AND r.is_active = 1
    ORDER BY r.role_name
  `);

  return result.recordset;
};

const getUserPermissions = async (userId) => {
  const result = await pool.request().input("user_id", sql.Int, userId).query(`
    SELECT DISTINCT
      p.id,
      p.perm_code,
      p.perm_name,
      p.module_name
    FROM dbo.iam_user_roles ur
    INNER JOIN dbo.iam_roles r ON r.id = ur.role_id AND r.is_active = 1
    INNER JOIN dbo.iam_role_permissions rp ON rp.role_id = r.id
    INNER JOIN dbo.iam_permissions p ON p.id = rp.permission_id AND p.is_active = 1
    WHERE ur.user_id = @user_id
    ORDER BY p.module_name, p.perm_code
  `);

  return result.recordset;
};

const getUserTerminals = async (userId, fallbackTerminalId = null) => {
  const result = await pool.request().input("user_id", sql.Int, userId).query(`
    SELECT DISTINCT terminal_id
    FROM dbo.iam_user_terminals
    WHERE user_id = @user_id
    ORDER BY terminal_id
  `);

  if (result.recordset.length > 0) {
    return result.recordset.map((row) => Number(row.terminal_id));
  }

  if (fallbackTerminalId !== null && fallbackTerminalId !== undefined) {
    return [Number(fallbackTerminalId)];
  }

  return [];
};

const getUserIamContext = async (userId) => {
  const enabled = await hasIamTables();
  if (!enabled) {
    return {
      enabled: false,
      tenantId: null,
      terminalIds: [],
      roles: [],
      permissions: [],
    };
  }

  const user = await getTenantScopedUser(userId);
  if (!user) {
    return null;
  }

  const [roles, permissions, terminalIds] = await Promise.all([
    getUserRoleAssignments(userId),
    getUserPermissions(userId),
    getUserTerminals(userId, user.default_terminal_id),
  ]);

  return {
    enabled: true,
    tenantId: user.tenant_id || null,
    tenantName: user.tenant_name || null,
    terminalIds,
    roles,
    permissions: permissions.map((permission) => permission.perm_code),
    permissionDetails: permissions,
  };
};

const ensureTenantRoleAccess = async (tenantId, roleIds) => {
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    return true;
  }

  const request = pool.request().input("tenant_id", sql.Int, tenantId);
  const placeholders = roleIds.map((roleId, index) => {
    request.input(`role_${index}`, sql.Int, roleId);
    return `@role_${index}`;
  });

  const result = await request.query(`
    SELECT COUNT(*) AS matched_count
    FROM dbo.iam_roles
    WHERE tenant_id = @tenant_id
      AND id IN (${placeholders.join(", ")})
  `);

  return Number(result.recordset[0]?.matched_count || 0) === roleIds.length;
};

const listRoles = async (tenantId) => {
  const result = await pool.request().input("tenant_id", sql.Int, tenantId).query(`
    SELECT
      r.id,
      r.role_code,
      r.role_name,
      r.description,
      r.is_active,
      COUNT(rp.permission_id) AS permission_count,
      STUFF((
        SELECT ',' + CAST(rp2.permission_id AS NVARCHAR(20))
        FROM dbo.iam_role_permissions rp2
        WHERE rp2.role_id = r.id
        FOR XML PATH(''), TYPE
      ).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS permission_ids
    FROM dbo.iam_roles r
    LEFT JOIN dbo.iam_role_permissions rp ON rp.role_id = r.id
    WHERE r.tenant_id = @tenant_id
    GROUP BY r.id, r.role_code, r.role_name, r.description, r.is_active
    ORDER BY r.role_name
  `);

  return result.recordset;
};

const listPermissions = async () => {
  const result = await pool.request().query(`
    SELECT id, perm_code, perm_name, module_name, description, is_active
    FROM dbo.iam_permissions
    WHERE is_active = 1
    ORDER BY module_name, perm_name
  `);

  return result.recordset;
};

const seedDefaultPermissions = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM dbo.iam_permissions WHERE perm_code = 'USER_VIEW')
    BEGIN
      INSERT INTO dbo.iam_permissions (perm_code, perm_name, module_name, description)
      VALUES
        ('USER_VIEW', 'View users', 'users', 'Allows viewing user records'),
        ('USER_CREATE', 'Create users', 'users', 'Allows creating users'),
        ('USER_EDIT', 'Edit users', 'users', 'Allows editing user records'),
        ('USER_ROLE_UPDATE', 'Update user roles', 'users', 'Allows changing user role assignments'),
        ('USER_DELETE', 'Deactivate users', 'users', 'Allows deactivating users'),
        ('IAM_ROLE_VIEW', 'View IAM roles', 'iam', 'Allows viewing IAM roles and permissions'),
        ('IAM_ROLE_MANAGE', 'Manage IAM roles', 'iam', 'Allows creating roles and changing permissions'),
        ('IAM_USER_ASSIGN', 'Assign IAM access', 'iam', 'Allows assigning roles and terminals to users'),
        ('MASTER_VIEW', 'View master data', 'masters', 'Allows viewing terminal-scoped master data'),
        ('MASTER_EDIT', 'Edit master data', 'masters', 'Allows editing terminal-scoped master data');
    END
  `);

  return listPermissions();
};

const listUserAssignments = async (tenantId) => {
  const flags = await getUserColumnFlags();
  const result = await pool.request().input("tenant_id", sql.Int, tenantId).query(`
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      ${flags.hasDefaultTerminalId ? "u.default_terminal_id" : "NULL AS default_terminal_id"},
      ${flags.hasTenantId ? "u.tenant_id" : "NULL AS tenant_id"},
      STUFF((
        SELECT ',' + CAST(r2.id AS NVARCHAR(20))
        FROM dbo.iam_user_roles ur2
        INNER JOIN dbo.iam_roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = u.id
        FOR XML PATH(''), TYPE
      ).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS role_ids,
      STUFF((
        SELECT ', ' + r2.role_name
        FROM dbo.iam_user_roles ur2
        INNER JOIN dbo.iam_roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = u.id
        FOR XML PATH(''), TYPE
      ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS roles,
      STUFF((
        SELECT ', ' + CAST(ut2.terminal_id AS NVARCHAR(50))
        FROM dbo.iam_user_terminals ut2
        WHERE ut2.user_id = u.id
          AND ut2.tenant_id = u.tenant_id
        FOR XML PATH(''), TYPE
      ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS terminal_ids
    FROM dbo.users u
      LEFT JOIN dbo.iam_user_roles ur ON ur.user_id = u.id
      LEFT JOIN dbo.iam_roles r ON r.id = ur.role_id
      ${flags.hasTenantId ? "LEFT JOIN dbo.iam_user_terminals ut ON ut.user_id = u.id AND ut.tenant_id = u.tenant_id" : "LEFT JOIN dbo.iam_user_terminals ut ON 1 = 0"}
    WHERE ${flags.hasTenantId ? "u.tenant_id = @tenant_id" : "1 = 1"}
    GROUP BY u.id, u.name, u.email, ${flags.hasDefaultTerminalId ? "u.default_terminal_id" : "u.id"}, ${flags.hasTenantId ? "u.tenant_id" : "u.id"}
    ORDER BY u.name
  `);

  return result.recordset;
};

const createRole = async ({ tenantId, roleCode, roleName, description }) => {
  const result = await pool
    .request()
    .input("tenant_id", sql.Int, tenantId)
    .input("role_code", sql.NVarChar(80), roleCode)
    .input("role_name", sql.NVarChar(150), roleName)
    .input("description", sql.NVarChar(255), description || null)
    .query(`
      INSERT INTO dbo.iam_roles (tenant_id, role_code, role_name, description)
      OUTPUT INSERTED.id, INSERTED.role_code, INSERTED.role_name, INSERTED.description, INSERTED.is_active
      VALUES (@tenant_id, @role_code, @role_name, @description)
    `);

  return result.recordset[0];
};

const replaceRolePermissions = async ({ tenantId, roleId, permissionIds }) => {
  const roleAccessOk = await ensureTenantRoleAccess(tenantId, [roleId]);
  if (!roleAccessOk) {
    throw new Error("Role does not belong to the current tenant");
  }

  const transaction = pool.transaction();
  await transaction.begin();
  try {
    await new sql.Request(transaction)
      .input("role_id", sql.Int, roleId)
      .query("DELETE FROM dbo.iam_role_permissions WHERE role_id = @role_id");

    for (const permissionId of permissionIds) {
      await new sql.Request(transaction)
        .input("role_id", sql.Int, roleId)
        .input("permission_id", sql.Int, permissionId)
        .query(`
          INSERT INTO dbo.iam_role_permissions (role_id, permission_id)
          VALUES (@role_id, @permission_id)
        `);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const replaceUserAssignments = async ({ tenantId, userId, roleIds, terminalIds }) => {
  const roleAccessOk = await ensureTenantRoleAccess(tenantId, roleIds);
  if (!roleAccessOk) {
    throw new Error("One or more roles do not belong to the current tenant");
  }

  const transaction = pool.transaction();
  await transaction.begin();
  try {
    await new sql.Request(transaction)
      .input("user_id", sql.Int, userId)
      .query("DELETE FROM dbo.iam_user_roles WHERE user_id = @user_id");

    for (const roleId of roleIds) {
      await new sql.Request(transaction)
        .input("user_id", sql.Int, userId)
        .input("role_id", sql.Int, roleId)
        .query(`
          INSERT INTO dbo.iam_user_roles (user_id, role_id)
          VALUES (@user_id, @role_id)
        `);
    }

    await new sql.Request(transaction)
      .input("user_id", sql.Int, userId)
      .input("tenant_id", sql.Int, tenantId)
      .query(`
        DELETE FROM dbo.iam_user_terminals
        WHERE user_id = @user_id AND tenant_id = @tenant_id
      `);

    for (const terminalId of terminalIds) {
      await new sql.Request(transaction)
        .input("user_id", sql.Int, userId)
        .input("tenant_id", sql.Int, tenantId)
        .input("terminal_id", sql.Numeric(18, 0), terminalId)
        .query(`
          INSERT INTO dbo.iam_user_terminals (user_id, tenant_id, terminal_id)
          VALUES (@user_id, @tenant_id, @terminal_id)
        `);
    }

    await new sql.Request(transaction)
      .input("user_id", sql.Int, userId)
      .input("tenant_id", sql.Int, tenantId)
      .input("default_terminal_id", sql.Numeric(18, 0), terminalIds[0] || null)
      .query(`
        UPDATE dbo.users
        SET tenant_id = @tenant_id,
            default_terminal_id = @default_terminal_id
        WHERE id = @user_id
      `);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  hasIamTables,
  getUserColumnFlags,
  getUserIamContext,
  listRoles,
  listPermissions,
  seedDefaultPermissions,
  listUserAssignments,
  createRole,
  replaceRolePermissions,
  replaceUserAssignments,
};
