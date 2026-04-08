-- Add is_half_trip and current_location columns to transport_requests table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[transport_requests]') AND name = 'is_half_trip')
BEGIN
    ALTER TABLE [dbo].[transport_requests] ADD [is_half_trip] BIT DEFAULT 0 NOT NULL;
    PRINT 'Added is_half_trip column to transport_requests table';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[transport_requests]') AND name = 'current_location')
BEGIN
    ALTER TABLE [dbo].[transport_requests] ADD [current_location] NVARCHAR(255);
    PRINT 'Added current_location column to transport_requests table';
END