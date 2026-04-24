-- Core IAM schema for role-based permissions with tenant + terminal scoping.
-- This migration is additive and can run alongside the current users.role_id flow.

IF OBJECT_ID('dbo.iam_tenants', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.iam_tenants (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(150) NOT NULL,
    code NVARCHAR(50) NOT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_iam_tenants_is_active DEFAULT (1),
    created_at DATETIME NOT NULL CONSTRAINT DF_iam_tenants_created_at DEFAULT (GETDATE()),
    updated_at DATETIME NULL
  );

  CREATE UNIQUE INDEX UX_iam_tenants_code ON dbo.iam_tenants(code);
END

IF OBJECT_ID('dbo.iam_terminals', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.iam_terminals (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tenant_id INT NOT NULL,
    terminal_id NUMERIC(18, 0) NOT NULL,
    terminal_name NVARCHAR(150) NOT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_iam_terminals_is_active DEFAULT (1),
    created_at DATETIME NOT NULL CONSTRAINT DF_iam_terminals_created_at DEFAULT (GETDATE()),
    updated_at DATETIME NULL,
    CONSTRAINT FK_iam_terminals_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.iam_tenants(id)
  );

  CREATE UNIQUE INDEX UX_iam_terminals_tenant_terminal_id ON dbo.iam_terminals(tenant_id, terminal_id);
END

IF OBJECT_ID('dbo.iam_roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.iam_roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tenant_id INT NOT NULL,
    role_code NVARCHAR(80) NOT NULL,
    role_name NVARCHAR(150) NOT NULL,
    description NVARCHAR(255) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_iam_roles_is_active DEFAULT (1),
    created_at DATETIME NOT NULL CONSTRAINT DF_iam_roles_created_at DEFAULT (GETDATE()),
    updated_at DATETIME NULL,
    CONSTRAINT FK_iam_roles_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.iam_tenants(id)
  );

  CREATE UNIQUE INDEX UX_iam_roles_tenant_code ON dbo.iam_roles(tenant_id, role_code);
END

IF OBJECT_ID('dbo.iam_permissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.iam_permissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    perm_code NVARCHAR(100) NOT NULL,
    perm_name NVARCHAR(150) NOT NULL,
    module_name NVARCHAR(80) NOT NULL,
    description NVARCHAR(255) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_iam_permissions_is_active DEFAULT (1),
    created_at DATETIME NOT NULL CONSTRAINT DF_iam_permissions_created_at DEFAULT (GETDATE())
  );

  CREATE UNIQUE INDEX UX_iam_permissions_code ON dbo.iam_permissions(perm_code);
END

IF OBJECT_ID('dbo.iam_role_permissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.iam_role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at DATETIME NOT NULL CONSTRAINT DF_iam_role_permissions_created_at DEFAULT (GETDATE()),
    CONSTRAINT PK_iam_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT FK_iam_role_permissions_role FOREIGN KEY (role_id) REFERENCES dbo.iam_roles(id) ON DELETE CASCADE,
    CONSTRAINT FK_iam_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES dbo.iam_permissions(id) ON DELETE CASCADE
  );
END

IF OBJECT_ID('dbo.iam_user_roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.iam_user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    created_at DATETIME NOT NULL CONSTRAINT DF_iam_user_roles_created_at DEFAULT (GETDATE()),
    CONSTRAINT PK_iam_user_roles PRIMARY KEY (user_id, role_id),
    CONSTRAINT FK_iam_user_roles_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT FK_iam_user_roles_role FOREIGN KEY (role_id) REFERENCES dbo.iam_roles(id) ON DELETE CASCADE
  );
END

IF OBJECT_ID('dbo.iam_user_terminals', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.iam_user_terminals (
    user_id INT NOT NULL,
    tenant_id INT NOT NULL,
    terminal_id NUMERIC(18, 0) NOT NULL,
    created_at DATETIME NOT NULL CONSTRAINT DF_iam_user_terminals_created_at DEFAULT (GETDATE()),
    CONSTRAINT PK_iam_user_terminals PRIMARY KEY (user_id, tenant_id, terminal_id),
    CONSTRAINT FK_iam_user_terminals_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT FK_iam_user_terminals_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.iam_tenants(id)
  );

  CREATE INDEX IX_iam_user_terminals_user ON dbo.iam_user_terminals(user_id);
  CREATE INDEX IX_iam_user_terminals_tenant_terminal ON dbo.iam_user_terminals(tenant_id, terminal_id);
END

IF COL_LENGTH('dbo.users', 'tenant_id') IS NULL
BEGIN
  ALTER TABLE dbo.users
  ADD tenant_id INT NULL;
END

IF COL_LENGTH('dbo.users', 'default_terminal_id') IS NULL
BEGIN
  ALTER TABLE dbo.users
  ADD default_terminal_id NUMERIC(18, 0) NULL;
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_users_iam_tenants'
)
BEGIN
  ALTER TABLE dbo.users
  ADD CONSTRAINT FK_users_iam_tenants
    FOREIGN KEY (tenant_id) REFERENCES dbo.iam_tenants(id);
END

IF NOT EXISTS (SELECT 1 FROM dbo.iam_tenants WHERE code = 'DEFAULT')
BEGIN
  INSERT INTO dbo.iam_tenants (name, code)
  VALUES ('Default Tenant', 'DEFAULT');
END

DECLARE @defaultTenantId INT;
SELECT @defaultTenantId = id FROM dbo.iam_tenants WHERE code = 'DEFAULT';

IF COL_LENGTH('dbo.users', 'tenant_id') IS NOT NULL
BEGIN
  EXEC sp_executesql
    N'
      UPDATE dbo.users
      SET tenant_id = @defaultTenantId
      WHERE tenant_id IS NULL
    ',
    N'@defaultTenantId INT',
    @defaultTenantId = @defaultTenantId;
END

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.users')
    AND name = 'terminal_id'
)
BEGIN
  EXEC('
    UPDATE dbo.users
    SET default_terminal_id = terminal_id
    WHERE default_terminal_id IS NULL AND terminal_id IS NOT NULL
  ');
END

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
