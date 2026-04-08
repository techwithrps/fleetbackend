-- Create the database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'fleet2')
BEGIN
    CREATE DATABASE fleet2;
END
GO

USE fleet2;
GO

-- Create users table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[users] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [name] NVARCHAR(255) NOT NULL,
        [email] NVARCHAR(255) NOT NULL UNIQUE,
        [phone] NVARCHAR(20),
        [password] NVARCHAR(255) NOT NULL,
        [role] NVARCHAR(20) NOT NULL DEFAULT 'customer',
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE()
    );
END
GO

-- Create transport_requests table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[transport_requests]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[transport_requests] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [customer_id] INT NOT NULL,
        [consignee] NVARCHAR(255),
        [consigner] NVARCHAR(255),
        [vehicle_type] NVARCHAR(100),
        [vehicle_size] NVARCHAR(100),
        [pickup_location] NVARCHAR(255),
        [stuffing_location] NVARCHAR(255),
        [delivery_location] NVARCHAR(255),
        [commodity] NVARCHAR(255),
        [cargo_type] NVARCHAR(100),
        [cargo_weight] DECIMAL(10, 2),
        [service_type] NVARCHAR(MAX),
        [service_prices] NVARCHAR(MAX),
        [containers_20ft] INT DEFAULT 0,
        [containers_40ft] INT DEFAULT 0,
        [total_containers] INT,
        [expected_pickup_date] DATE,
        [expected_delivery_date] DATE,
        [requested_price] DECIMAL(10, 2),
        [status] NVARCHAR(20) DEFAULT 'pending',
        [admin_comment] NVARCHAR(500),
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE(),
        FOREIGN KEY ([customer_id]) REFERENCES [users]([id])
    );
END
GO

-- Create transporter_details table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[transporter_details]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[transporter_details] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [request_id] INT NOT NULL,
        [transporter_name] NVARCHAR(255),
        [vehicle_number] NVARCHAR(50),
        [driver_name] NVARCHAR(255),
        [driver_contact] NVARCHAR(20),
        [license_number] NVARCHAR(50),
        [license_expiry] DATE,
        [service_charges] NVARCHAR(MAX),
        [total_charge] DECIMAL(12, 2),
        [container_no] NVARCHAR(100),
        [line] NVARCHAR(100),
        [seal_no] NVARCHAR(100),
        [number_of_containers] INT,
        [vehicle_sequence] INT DEFAULT 1,
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE(),
        FOREIGN KEY ([request_id]) REFERENCES [transport_requests]([id])
    );
END
GO

-- Create Transporter_list_Master table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Transporter_list_Master]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Transporter_list_Master] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [transporter_name] NVARCHAR(255) NOT NULL,
        [email] NVARCHAR(255),
        [contact_number] NVARCHAR(20),
        [address] NVARCHAR(500),
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE()
    );
END
GO

-- Create SERVICE_MASTER table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SERVICE_MASTER]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SERVICE_MASTER] (
        [SERVICE_ID] NUMERIC(18, 0) IDENTITY(1,1) PRIMARY KEY,
        [TERMINAL_ID] NUMERIC(18, 0),
        [SERVICE_CODE] NVARCHAR(20),
        [SERVICE_NAME] NVARCHAR(100),
        [SERVICE_TYPE_CODE] NVARCHAR(1),
        [TAX_GROUP_ID] NUMERIC(18, 0),
        [UNIT] NVARCHAR(100),
        [MAP_CODE] NVARCHAR(100),
        [TAX_ON_PERCENTAGE] NUMERIC(18, 4),
        [UOM_ID] NUMERIC(18, 0),
        [SAP_MAP_CODE] NVARCHAR(100),
        [SERVICE_TYPE] NVARCHAR(1),
        [SERVICE_GROUP] NVARCHAR(1),
        [EXEMPTED] NVARCHAR(1),
        [SERVICE_MAP_CODE] NVARCHAR(1),
        [CREATED_BY] NVARCHAR(50),
        [CREATED_ON] DATETIME DEFAULT GETDATE(),
        [TPT_MODE] NVARCHAR(1),
        [LCL_TYPE] NVARCHAR(1),
        [LCL_PER] NUMERIC(18, 4),
        [HAZ_PER] NUMERIC(18, 4),
        [IWB_FLAG] NVARCHAR(1),
        [SERVICE_GROUP_MAP] NVARCHAR(5),
        [SERVICE] NVARCHAR(1),
        [TALLY_SERVICE_NAME] NVARCHAR(200),
        [TALLY_SERVICE_AGRO] NVARCHAR(200),
        [PERIODIC] NVARCHAR(1),
        [ADD_IMP_SERVICE_TYPE] NVARCHAR(1),
        [COMPANY_ID] NUMERIC(18, 0),
        [RRJ_SERVICE_NAME] NVARCHAR(200)
    );
END
GO

-- Create transactions table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[transactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[transactions] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [request_id] INT NOT NULL,
        [customer_id] INT NOT NULL,
        [amount] DECIMAL(12, 2) NOT NULL,
        [payment_method] NVARCHAR(50),
        [payment_status] NVARCHAR(20) DEFAULT 'pending',
        [transaction_reference] NVARCHAR(100),
        [notes] NVARCHAR(500),
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE(),
        FOREIGN KEY ([request_id]) REFERENCES [transport_requests]([id]),
        FOREIGN KEY ([customer_id]) REFERENCES [users]([id])
    );
END
GO

-- Create customer_master table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_master]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[customer_master] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [user_id] INT NOT NULL,
        [company_name] NVARCHAR(255),
        [gstin] NVARCHAR(20),
        [address] NVARCHAR(500),
        [city] NVARCHAR(100),
        [state] NVARCHAR(100),
        [pincode] NVARCHAR(10),
        [contact_person] NVARCHAR(255),
        [contact_email] NVARCHAR(255),
        [contact_phone] NVARCHAR(20),
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE(),
        FOREIGN KEY ([user_id]) REFERENCES [users]([id])
    );
END
GO

-- Create Transporter_Details_Master table (if different from transporter_details)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Transporter_Details_Master]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Transporter_Details_Master] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [transporter_id] INT NOT NULL,
        [vehicle_type] NVARCHAR(100),
        [vehicle_capacity] NVARCHAR(100),
        [registration_number] NVARCHAR(50),
        [insurance_number] NVARCHAR(50),
        [insurance_expiry] DATE,
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE(),
        FOREIGN KEY ([transporter_id]) REFERENCES [Transporter_list_Master]([id])
    );
END
GO

-- Insert dummy data into users table with specified accounts
IF NOT EXISTS (SELECT TOP 1 * FROM [users] WHERE email = 'adityathakur6199@gmail.com')
BEGIN
    -- Password is 'aditya@123' hashed with bcrypt
    INSERT INTO [users] ([name], [email], [phone], [password], [role])
    VALUES 
    ('Admin User', 'adityathakur6199@gmail.com', '9876543210', '$2a$10$6Bnv6xUyEX6WyIHVpKR3h.c97uucQJ.RpxmYkHe/slTzPz9.QEFwi', 'admin'),
    ('Customer User', 'adityathakur2199@gmail.com', '9876543211', '$2a$10$6Bnv6xUyEX6WyIHVpKR3h.c97uucQJ.RpxmYkHe/slTzPz9.QEFwi', 'customer');
END
GO

-- Insert dummy data into Transporter_list_Master table
IF NOT EXISTS (SELECT TOP 1 * FROM [Transporter_list_Master])
BEGIN
    INSERT INTO [Transporter_list_Master] ([transporter_name], [email], [contact_number], [address])
    VALUES 
    ('ABC Logistics', 'abc@logistics.com', '9876543213', '123 Transport Lane, Mumbai'),
    ('XYZ Transport', 'xyz@transport.com', '9876543214', '456 Shipping Road, Delhi'),
    ('Fast Movers', 'info@fastmovers.com', '9876543215', '789 Delivery Street, Bangalore');
END
GO

-- Insert dummy data into SERVICE_MASTER table
IF NOT EXISTS (SELECT TOP 1 * FROM [SERVICE_MASTER])
BEGIN
    INSERT INTO [SERVICE_MASTER] (
        [TERMINAL_ID], [SERVICE_CODE], [SERVICE_NAME], [SERVICE_TYPE_CODE], 
        [TAX_GROUP_ID], [UNIT], [MAP_CODE], [TAX_ON_PERCENTAGE], 
        [UOM_ID], [SERVICE_TYPE], [SERVICE_GROUP], [CREATED_BY]
    )
    VALUES 
    (1, 'TRN001', 'Transportation', 'T', 1, 'Trip', 'TRN', 18.0, 1, 'S', 'T', 'System'),
    (1, 'LOD001', 'Loading', 'L', 1, 'Container', 'LOD', 18.0, 2, 'S', 'L', 'System'),
    (1, 'UNL001', 'Unloading', 'U', 1, 'Container', 'UNL', 18.0, 2, 'S', 'U', 'System'),
    (1, 'STF001', 'Stuffing', 'S', 1, 'Container', 'STF', 18.0, 2, 'S', 'S', 'System'),
    (1, 'DST001', 'De-stuffing', 'D', 1, 'Container', 'DST', 18.0, 2, 'S', 'D', 'System');
END
GO

-- Insert dummy data into transport_requests table
IF NOT EXISTS (SELECT TOP 1 * FROM [transport_requests])
BEGIN
    -- Get customer ID
    DECLARE @customerId INT;
    
    SELECT @customerId = id FROM [users] WHERE email = 'adityathakur2199@gmail.com';
    
    IF @customerId IS NOT NULL
    BEGIN
        INSERT INTO [transport_requests] (
            [customer_id], [consignee], [consigner], [vehicle_type], [vehicle_size],
            [pickup_location], [stuffing_location], [delivery_location], [commodity],
            [cargo_type], [cargo_weight], [service_type], [service_prices],
            [containers_20ft], [containers_40ft], [total_containers],
            [expected_pickup_date], [expected_delivery_date], [status]
        )
        VALUES 
        (
            @customerId, 'ABC Imports', 'XYZ Exports', 'Container', '20ft',
            'Mumbai Port', 'Mumbai Warehouse', 'Delhi Warehouse', 'Electronics',
            'General', 1500.00, '{"services":["Transportation","Loading","Unloading"]}', '{"Transportation":5000,"Loading":2000,"Unloading":2000}',
            2, 0, 2, DATEADD(DAY, 5, GETDATE()), DATEADD(DAY, 10, GETDATE()), 'approved'
        ),
        (
            @customerId, 'PQR Trading', 'LMN Exports', 'Container', '40ft',
            'Delhi Port', 'Delhi Warehouse', 'Mumbai Warehouse', 'Textiles',
            'General', 2500.00, '{"services":["Transportation","Stuffing","De-stuffing"]}', '{"Transportation":8000,"Stuffing":3000,"De-stuffing":3000}',
            0, 1, 1, DATEADD(DAY, 7, GETDATE()), DATEADD(DAY, 15, GETDATE()), 'pending'
        ),
        (
            @customerId, 'DEF Industries', 'GHI Manufacturing', 'Truck', 'Medium',
            'Bangalore Warehouse', 'N/A', 'Chennai Warehouse', 'Machinery',
            'Heavy', 3500.00, '{"services":["Transportation"]}', '{"Transportation":12000}',
            0, 0, 0, DATEADD(DAY, 3, GETDATE()), DATEADD(DAY, 6, GETDATE()), 'completed'
        );
    END
END
GO

-- Insert dummy data into transporter_details table
IF NOT EXISTS (SELECT TOP 1 * FROM [transporter_details])
BEGIN
    -- Get request IDs
    DECLARE @request1Id INT;
    DECLARE @request3Id INT;
    
    SELECT TOP 1 @request1Id = id FROM [transport_requests] WHERE status = 'approved';
    SELECT TOP 1 @request3Id = id FROM [transport_requests] WHERE status = 'completed';
    
    IF @request1Id IS NOT NULL AND @request3Id IS NOT NULL
    BEGIN
        INSERT INTO [transporter_details] (
            [request_id], [transporter_name], [vehicle_number], [driver_name],
            [driver_contact], [license_number], [license_expiry], [service_charges],
            [total_charge], [container_no], [line], [seal_no], [number_of_containers]
        )
        VALUES 
        (
            @request1Id, 'ABC Logistics', 'MH01AB1234', 'Rajesh Kumar',
            '9876543216', 'DL123456789', DATEADD(YEAR, 2, GETDATE()), '{"Transportation":5000,"Loading":2000,"Unloading":2000}',
            9000.00, 'CONT123456, CONT123457', 'Shipping Line A', 'SEAL123456, SEAL123457', 2
        ),
        (
            @request3Id, 'Fast Movers', 'KA01CD5678', 'Suresh Singh',
            '9876543217', 'DL987654321', DATEADD(YEAR, 1, GETDATE()), '{"Transportation":12000}',
            12000.00, NULL, NULL, NULL, 0
        );
    END
END
GO

-- Insert dummy data into transactions table
IF NOT EXISTS (SELECT TOP 1 * FROM [transactions])
BEGIN
    -- Get request IDs and customer ID
    DECLARE @request1Id INT;
    DECLARE @request3Id INT;
    DECLARE @customerId INT;
    
    SELECT TOP 1 @request1Id = id FROM [transport_requests] WHERE status = 'approved';
    SELECT TOP 1 @request3Id = id FROM [transport_requests] WHERE status = 'completed';
    SELECT @customerId = id FROM [users] WHERE email = 'adityathakur2199@gmail.com';
    
    IF @request1Id IS NOT NULL AND @request3Id IS NOT NULL AND @customerId IS NOT NULL
    BEGIN
        INSERT INTO [transactions] (
            [request_id], [customer_id], [amount], [payment_method], [payment_status],
            [transaction_reference], [notes]
        )
        VALUES 
        (
            @request1Id, @customerId, 9000.00, 'Bank Transfer', 'completed',
            'TXN123456', 'Payment for approved transport request'
        ),
        (
            @request3Id, @customerId, 12000.00, 'Credit Card', 'completed',
            'TXN789012', 'Payment for completed transport request'
        );
    END
END
GO

-- Insert dummy data into customer_master table
IF NOT EXISTS (SELECT TOP 1 * FROM [customer_master])
BEGIN
    -- Get customer ID
    DECLARE @customerId INT;
    
    SELECT @customerId = id FROM [users] WHERE email = 'adityathakur2199@gmail.com';
    
    IF @customerId IS NOT NULL
    BEGIN
        INSERT INTO [customer_master] (
            [user_id], [company_name], [gstin], [address], [city], [state],
            [pincode], [contact_person], [contact_email], [contact_phone]
        )
        VALUES 
        (
            @customerId, 'ABC Enterprises', 'GSTIN123456789', '123 Business Park, Sector 5',
            'Mumbai', 'Maharashtra', '400001', 'Aditya Thakur', 'adityathakur2199@gmail.com',
            '9876543211'
        );
    END
END
GO

-- Insert dummy data into Transporter_Details_Master table
IF NOT EXISTS (SELECT TOP 1 * FROM [Transporter_Details_Master])
BEGIN
    -- Get transporter IDs
    DECLARE @transporter1Id INT;
    DECLARE @transporter2Id INT;
    
    SELECT TOP 1 @transporter1Id = id FROM [Transporter_list_Master] WHERE transporter_name = 'ABC Logistics';
    SELECT TOP 1 @transporter2Id = id FROM [Transporter_list_Master] WHERE transporter_name = 'XYZ Transport';
    
    IF @transporter1Id IS NOT NULL AND @transporter2Id IS NOT NULL
    BEGIN
        INSERT INTO [Transporter_Details_Master] (
            [transporter_id], [vehicle_type], [vehicle_capacity], [registration_number],
            [insurance_number], [insurance_expiry]
        )
        VALUES 
        (
            @transporter1Id, 'Container Truck', '20ft', 'MH01AB1234',
            'INS123456', DATEADD(YEAR, 1, GETDATE())
        ),
        (
            @transporter1Id, 'Container Truck', '40ft', 'MH01AB5678',
            'INS123457', DATEADD(YEAR, 1, GETDATE())
        ),
        (
            @transporter2Id, 'Flatbed Truck', '10 Ton', 'DL01CD9012',
            'INS789012', DATEADD(YEAR, 1, GETDATE())
        );
    END
END
GO

PRINT 'Database setup completed successfully!';