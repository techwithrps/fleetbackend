-- CLEANUP SCRIPT: Drop all old IAM tables

IF OBJECT_ID('dbo.iam_user_terminals', 'U') IS NOT NULL DROP TABLE dbo.iam_user_terminals;
IF OBJECT_ID('dbo.iam_user_roles', 'U') IS NOT NULL DROP TABLE dbo.iam_user_roles;
IF OBJECT_ID('dbo.iam_role_permissions', 'U') IS NOT NULL DROP TABLE dbo.iam_role_permissions;
IF OBJECT_ID('dbo.iam_permissions', 'U') IS NOT NULL DROP TABLE dbo.iam_permissions;
IF OBJECT_ID('dbo.iam_roles', 'U') IS NOT NULL DROP TABLE dbo.iam_roles;
IF OBJECT_ID('dbo.iam_terminals', 'U') IS NOT NULL DROP TABLE dbo.iam_terminals;

-- Drop foreign keys linking users to iam_tenants if it exists
IF EXISTS (
  SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_users_iam_tenants'
)
BEGIN
  ALTER TABLE dbo.users DROP CONSTRAINT FK_users_iam_tenants;
END

IF OBJECT_ID('dbo.iam_tenants', 'U') IS NOT NULL DROP TABLE dbo.iam_tenants;

-- (We leave dbo.users exactly as is, it's safe)
