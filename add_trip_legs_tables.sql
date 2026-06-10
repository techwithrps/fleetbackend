-- Create transport_requests table if it doesn't exist
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
        [expected_pickup_time] NVARCHAR(5),
        [expected_delivery_date] DATE,
        [expected_delivery_time] NVARCHAR(5),
        [requested_price] DECIMAL(10, 2),
        [status] NVARCHAR(20) DEFAULT 'pending',
        [no_of_vehicles] INT DEFAULT 1,
        [vehicle_status] NVARCHAR(20) DEFAULT 'Empty',
        [SHIPA_NO] NVARCHAR(100),
        [is_half_trip] BIT DEFAULT 0,
        [current_location] NVARCHAR(255),
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE(),
        FOREIGN KEY ([customer_id]) REFERENCES [users]([id])
    );
    PRINT 'Created transport_requests table';
END
GO

-- Create trip_legs table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[trip_legs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[trip_legs] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [request_id] INT NOT NULL,
        [start_location] NVARCHAR(255) NOT NULL,
        [end_location] NVARCHAR(255) NOT NULL,
        [gr_number] NVARCHAR(100) UNIQUE NOT NULL,
        [price] DECIMAL(10,2) NOT NULL,
        [created_at] DATETIME DEFAULT GETDATE(),
        FOREIGN KEY ([request_id]) REFERENCES [transport_requests]([id])
    );
    PRINT 'Created trip_legs table';
END
GO

-- Create trip_leg_vehicles table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[trip_leg_vehicles]') AND type in (N'U'))
BEGIN
    -- First create VEHICLE_MASTER table if it doesn't exist
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VEHICLE_MASTER]') AND type in (N'U'))
    BEGIN
        CREATE TABLE [dbo].[VEHICLE_MASTER] (
            [VEHICLE_ID] NUMERIC(18,0) IDENTITY(1,1) PRIMARY KEY,
            [VEHICLE_NUMBER] NVARCHAR(50) NOT NULL,
            [VEHICLE_TYPE] NVARCHAR(100),
            [OWNER_NAME] NVARCHAR(255),
            [OWNER_CONTACT] NVARCHAR(20),
            [CREATED_AT] DATETIME DEFAULT GETDATE()
        );
        PRINT 'Created VEHICLE_MASTER table';
    END

    CREATE TABLE [dbo].[trip_leg_vehicles] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [trip_leg_id] INT NOT NULL,
        [vehicle_id] NUMERIC(18,0) NOT NULL,
        FOREIGN KEY ([trip_leg_id]) REFERENCES [trip_legs]([id]),
        FOREIGN KEY ([vehicle_id]) REFERENCES [VEHICLE_MASTER]([VEHICLE_ID])
    );
    PRINT 'Created trip_leg_vehicles table';
END
GO