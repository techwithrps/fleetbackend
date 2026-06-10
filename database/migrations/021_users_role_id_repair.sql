-- Repair users role storage after moving from users.role to users.role_id.
-- Safe to rerun: creates missing roles/role_id, migrates values, and leaves old role column untouched.

IF OBJECT_ID('dbo.roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        role_name NVARCHAR(100) NOT NULL UNIQUE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name = 'admin')
BEGIN
    INSERT INTO dbo.roles (role_name)
    VALUES ('admin'), ('accounts'), ('finance'), ('customer'), ('driver'), ('reports & mis');
END
GO

IF COL_LENGTH('dbo.users', 'role_id') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD role_id INT NULL;
END
GO

IF COL_LENGTH('dbo.users', 'role') IS NOT NULL
BEGIN
    EXEC('
        UPDATE u
        SET role_id = r.id
        FROM dbo.users u
        JOIN dbo.roles r ON LOWER(r.role_name) = LOWER(CONVERT(NVARCHAR(100), u.role))
        WHERE u.role_id IS NULL
    ');
END
GO

UPDATE dbo.users
SET role_id = (SELECT TOP 1 id FROM dbo.roles WHERE role_name = 'customer')
WHERE role_id IS NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_users_roles'
)
BEGIN
    ALTER TABLE dbo.users
    ADD CONSTRAINT FK_users_roles FOREIGN KEY (role_id) REFERENCES dbo.roles(id);
END
GO
