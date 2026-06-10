-- Simplified Page & Location Access Framework

-- 1. Create a Master Table for All Pages in the App
IF OBJECT_ID('dbo.PAGE_MASTER', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PAGE_MASTER (
        PAGE_ID INT IDENTITY(1,1) PRIMARY KEY,
        PAGE_NAME VARCHAR(100) NOT NULL UNIQUE,
        PAGE_URL VARCHAR(255) NULL, 
        MODULE_GROUP VARCHAR(50) NULL, -- To group pages logically (e.g. Master, Transaction, Report)
        STATUS VARCHAR(20) DEFAULT 'ACTIVE',
        CREATED_AT DATETIME DEFAULT GETDATE()
    );
    
    -- Insert the basic existing pages
    INSERT INTO dbo.PAGE_MASTER (PAGE_NAME, PAGE_URL, MODULE_GROUP) VALUES
    ('Admin Dashboard', '/admin/dashboard', 'Dashboard'),
    ('Vendor Master', '/masters/vendors', 'Masters'),
    ('Driver Master', '/masters/drivers', 'Masters'),
    ('Fleet Equipment Master', '/masters/fleet-equipment', 'Masters'),
    ('Tire Master', '/masters/tires', 'Masters'),
    ('Tire Position Master', '/masters/tire-positions', 'Masters'),
    ('Bed Master', '/masters/beds', 'Masters'),
    ('Job Order', '/jobs', 'Transactions'),
    ('User Management', '/users', 'Admin');
END

-- 2. Create the Single Mapping Table that binds everything 
IF OBJECT_ID('dbo.USER_PAGE_ACCESS_MAPPING', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.USER_PAGE_ACCESS_MAPPING (
        USER_ID INT NOT NULL,               -- Points to [EFleet].[dbo].[users].id
        LOCATION_ID NUMERIC(18,0) NOT NULL, -- Points to [EFleet].[dbo].[LOCATION_MASTER].LOCATION_ID
        PAGE_ID INT NOT NULL,               -- Points to dbo.PAGE_MASTER.PAGE_ID
        ASSIGNED_BY INT NULL,               -- Admin ID who assigned this access
        CREATED_AT DATETIME DEFAULT GETDATE(),
        PRIMARY KEY (USER_ID, LOCATION_ID, PAGE_ID),
        CONSTRAINT FK_UPAM_PAGE FOREIGN KEY (PAGE_ID) REFERENCES dbo.PAGE_MASTER(PAGE_ID)
    );
END
