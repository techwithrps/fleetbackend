const { pool, sql, connectDB } = require("./Src/config/dbconfig");

async function createTables() {
    try {
        await connectDB();
        console.log("Creating tables...");

        const query = `
            IF OBJECT_ID('dbo.ITEM_MASTER', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ITEM_MASTER] (
                    [ITEM_ID]          NUMERIC (18)    NOT NULL,
                    [ITEM_CODE]        VARCHAR (50)    NOT NULL,
                    [ITEM_NAME]        VARCHAR (100)   NOT NULL,
                    [ITEM_GROUP]       VARCHAR (50)    NULL,
                    [UNIT]             VARCHAR (20)    NULL,
                    [UNIT_PRICE]       NUMERIC (18, 2) CONSTRAINT [DF_ITEM_MASTER_PRICE] DEFAULT ((0)) NULL,
                    [STATUS]           VARCHAR (20)    CONSTRAINT [DF_ITEM_MASTER_STATUS] DEFAULT ('ACTIVE') NULL,
                    [REMARKS]          VARCHAR (500)   NULL,
                    [CREATED_BY]       VARCHAR (30)    NULL,
                    [CREATED_ON]       DATETIME        CONSTRAINT [DF_ITEM_MASTER_CREATED_ON] DEFAULT (GETDATE()) NULL,
                    [UPDATED_BY]       VARCHAR (30)    NULL,
                    [UPDATED_ON]       DATETIME        NULL,
                    [TERMINAL_ID]      NUMERIC (18)    NULL,
                    PRIMARY KEY CLUSTERED ([ITEM_ID] ASC),
                    CONSTRAINT [UQ_ITEM_MASTER_CODE] UNIQUE NONCLUSTERED ([ITEM_CODE] ASC)
                );
                PRINT 'Created ITEM_MASTER table';
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('JOB_ORDER_CLOSE') AND name = 'VENDOR_ID')
            BEGIN
                ALTER TABLE JOB_ORDER_CLOSE ADD VENDOR_ID NUMERIC(18,0);
                PRINT 'Added VENDOR_ID to JOB_ORDER_CLOSE';
            END

            IF OBJECT_ID('dbo.JOB_ORDER_CLOSE_ITEMS', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[JOB_ORDER_CLOSE_ITEMS] (
                    [JO_CLOSE_ITEM_ID] NUMERIC (18)    NOT NULL,
                    [JO_CLOSE_ID]      NUMERIC (18)    NOT NULL,
                    [ITEM_ID]          NUMERIC (18)    NOT NULL,
                    [ITEM_NAME]        VARCHAR (100)   NULL,
                    [QUANTITY]         NUMERIC (18, 2) DEFAULT ((1)) NULL,
                    [UNIT_PRICE]       NUMERIC (18, 2) DEFAULT ((0)) NULL,
                    [TOTAL_PRICE]      NUMERIC (18, 2) DEFAULT ((0)) NULL,
                    PRIMARY KEY CLUSTERED ([JO_CLOSE_ITEM_ID] ASC),
                    FOREIGN KEY ([JO_CLOSE_ID]) REFERENCES [JOB_ORDER_CLOSE] ([JO_CLOSE_ID])
                );
                PRINT 'Created JOB_ORDER_CLOSE_ITEMS table';
            END
        `;

        await pool.request().query(query);
        console.log("Tables creation/update successful!");
        process.exit(0);
    } catch (err) {
        console.error("Error creating tables:", err);
        process.exit(1);
    }
}

createTables();
