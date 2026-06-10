IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[rate_cards]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[rate_cards] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [customer_id] INT NOT NULL,
        [contract_name] NVARCHAR(255),
        [valid_from] DATE NOT NULL,
        [valid_to] DATE NOT NULL,
        
        -- Operational Parameters
        [container_size] NVARCHAR(50),
        [vehicle_type] NVARCHAR(100),
        
        -- Service Rates
        [pickup_rate] DECIMAL(12, 2) DEFAULT 0,
        [stuffing_rate] DECIMAL(12, 2) DEFAULT 0,
        [handover_rate] DECIMAL(12, 2) DEFAULT 0,
        [variable_rate_factor] DECIMAL(10, 4) DEFAULT 0,
        [rate_type] NVARCHAR(20) DEFAULT 'fixed',
        
        -- Workflow Status
        [status] NVARCHAR(20) DEFAULT 'pending',
        [admin_comment] NVARCHAR(500),
        
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE(),
        FOREIGN KEY ([customer_id]) REFERENCES [users]([id])
    );
    PRINT 'Created rate_cards table';
END
GO
