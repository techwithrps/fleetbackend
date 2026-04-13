-- Add soft-delete support for users so linked business data does not block deactivation.

IF COL_LENGTH('dbo.users', 'is_active') IS NULL
BEGIN
  ALTER TABLE dbo.users
  ADD is_active BIT NOT NULL
      CONSTRAINT DF_users_is_active DEFAULT (1);
END

IF COL_LENGTH('dbo.users', 'deleted_at') IS NULL
BEGIN
  ALTER TABLE dbo.users
  ADD deleted_at DATETIME NULL;
END

IF COL_LENGTH('dbo.users', 'is_active') IS NOT NULL
BEGIN
  EXEC('
    UPDATE dbo.users
    SET is_active = 1
    WHERE is_active IS NULL
  ');
END
