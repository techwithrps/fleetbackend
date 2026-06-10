-- Add parent_request_id column to transport_requests table to establish parent-child relationship
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[transport_requests]') AND name = 'parent_request_id')
BEGIN
    ALTER TABLE [dbo].[transport_requests] ADD [parent_request_id] INT NULL;
    ALTER TABLE [dbo].[transport_requests] ADD CONSTRAINT [FK_transport_requests_parent] FOREIGN KEY ([parent_request_id]) REFERENCES [transport_requests]([id]);
    PRINT 'Added parent_request_id column to transport_requests table with foreign key constraint';
END
GO

-- Add is_parent column to transport_requests table to easily identify parent trips
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[transport_requests]') AND name = 'is_parent')
BEGIN
    ALTER TABLE [dbo].[transport_requests] ADD [is_parent] BIT DEFAULT 0 NOT NULL;
    PRINT 'Added is_parent column to transport_requests table';
END
GO

-- Add combined_invoice_id column to group related trips for invoicing
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[transport_requests]') AND name = 'combined_invoice_id')
BEGIN
    ALTER TABLE [dbo].[transport_requests] ADD [combined_invoice_id] NVARCHAR(100) NULL;
    PRINT 'Added combined_invoice_id column to transport_requests table';
END
GO