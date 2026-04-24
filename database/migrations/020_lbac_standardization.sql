
-- 1. Create user_locations table to map users to multiple terminals (Jaipur, Kanpur etc)
IF OBJECT_ID('dbo.user_locations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_locations (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        user_id     INT NOT NULL,
        terminal_id NUMERIC(18,0) NOT NULL,
        assigned_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_user_locations_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
        CONSTRAINT FK_user_locations_terminal FOREIGN KEY (terminal_id) REFERENCES dbo.LOCATION_MASTER(LOCATION_ID),
        CONSTRAINT UQ_user_location UNIQUE (user_id, terminal_id)
    );
END
GO

-- 2. Add TERMINAL_ID to remaining operational tables if missing
IF COL_LENGTH('dbo.ASN_MASTER', 'TERMINAL_ID') IS NULL
BEGIN
    ALTER TABLE dbo.ASN_MASTER ADD TERMINAL_ID NUMERIC(18,0) NULL;
END
GO

IF COL_LENGTH('dbo.COMPANY_MASTER', 'TERMINAL_ID') IS NULL
BEGIN
    ALTER TABLE dbo.COMPANY_MASTER ADD TERMINAL_ID NUMERIC(18,0) NULL;
END
GO

IF COL_LENGTH('dbo.rate_cards', 'TERMINAL_ID') IS NULL
BEGIN
    ALTER TABLE dbo.rate_cards ADD TERMINAL_ID NUMERIC(18,0) NULL;
END
GO

-- 3. Ensure all other tables from design doc have TERMINAL_ID (standardized name)
-- (Many were already covered in terminalid.sql but we ensure here)

IF COL_LENGTH('dbo.BED_MASTER', 'TERMINAL_ID') IS NULL
    ALTER TABLE dbo.BED_MASTER ADD TERMINAL_ID NUMERIC(18,0) NULL;
GO

IF COL_LENGTH('dbo.JOB_ORDER', 'TERMINAL_ID') IS NULL
    ALTER TABLE dbo.JOB_ORDER ADD TERMINAL_ID NUMERIC(18,0) NULL;
GO

IF COL_LENGTH('dbo.VENDOR_MASTER', 'TERMINAL_ID') IS NULL
    ALTER TABLE dbo.VENDOR_MASTER ADD TERMINAL_ID NUMERIC(18,0) NULL;
GO

PRINT 'LBAC Standardization migration completed.';
