/*
  Expense Booking and Inventory modifications schema additions

  New modules covered:
  - EXPENSE_BOOKING
  - EXPENSE_BOOKING_DETAILS
  - ITEM_MASTER (ALTER)

  Notes:
  - This script follows the existing legacy fleet-table style in the database.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/* -------------------------------------------------------------------------- */
/* EXPENSE BOOKING                                                            */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.EXPENSE_BOOKING', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EXPENSE_BOOKING] (
        [EXPENSE_ID]            NUMERIC (18)    NOT NULL,
        [VOUCHER_NO]            VARCHAR (50)    NOT NULL,
        [VOUCHER_DATE]          DATE            CONSTRAINT [DF_EXPENSE_BOOKING_DATE] DEFAULT (GETDATE()) NULL,
        [EQUIPMENT_NO]          VARCHAR (50)    NULL,
        [LAST_ODOMETER]         NUMERIC (18, 2) NULL,
        [ODOMETER]              NUMERIC (18, 2) NULL,
        [VENDOR_TYPE]           VARCHAR (20)    NULL,
        [VENDOR_ID]             NUMERIC (18)    NULL,
        [REMARKS]               VARCHAR (500)   NULL,
        [BILL_NO]               VARCHAR (50)    NULL,
        [BILL_DATE]             DATE            NULL,
        [DOCUMENT_DATA]         VARBINARY(MAX)  NULL,
        [DOCUMENT_NAME]         VARCHAR (255)   NULL,
        [DOCUMENT_TYPE]         VARCHAR (100)   NULL,
        [CREATED_BY]            VARCHAR (30)    NULL,
        [CREATED_ON]            DATETIME        CONSTRAINT [DF_EXPENSE_BOOKING_CREATED_ON] DEFAULT (GETDATE()) NULL,
        [UPDATED_BY]            VARCHAR (30)    NULL,
        [UPDATED_ON]            DATETIME        NULL,
        PRIMARY KEY CLUSTERED ([EXPENSE_ID] ASC),
        CONSTRAINT [UQ_EXPENSE_BOOKING_VOUCHER_NO] UNIQUE NONCLUSTERED ([VOUCHER_NO] ASC)
    );
END;

/* -------------------------------------------------------------------------- */
/* EXPENSE BOOKING DETAILS                                                    */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.EXPENSE_BOOKING_DETAILS', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EXPENSE_BOOKING_DETAILS] (
        [DETAIL_ID]      NUMERIC (18)    NOT NULL,
        [EXPENSE_ID]     NUMERIC (18)    NOT NULL,
        [EXPENSE_HEAD]   VARCHAR (100)   NULL,
        [EXPENSE_DATE]   DATE            NULL,
        [UOM]            VARCHAR (20)    NULL,
        [QNTY]           NUMERIC (18, 2) NULL,
        [BASE_AMOUNT]    NUMERIC (18, 2) NULL,
        [GST_AMOUNT]     NUMERIC (18, 2) NULL,
        [TOTAL_AMOUNT]   NUMERIC (18, 2) NULL,
        PRIMARY KEY CLUSTERED ([DETAIL_ID] ASC),
        CONSTRAINT [FK_EXPENSE_BOOKING_DETAILS_EXPENSE]
            FOREIGN KEY ([EXPENSE_ID]) REFERENCES [dbo].[EXPENSE_BOOKING] ([EXPENSE_ID])
            ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX [IX_EXPENSE_BOOKING_DETAILS_EXPENSE_ID]
        ON [dbo].[EXPENSE_BOOKING_DETAILS]([EXPENSE_ID] ASC);
END;

/* -------------------------------------------------------------------------- */
/* ITEM MASTER (ALTER)                                                        */
/* -------------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE Name = N'QNTY' 
    AND Object_ID = Object_ID(N'dbo.ITEM_MASTER')
)
BEGIN
    ALTER TABLE [dbo].[ITEM_MASTER] ADD [QNTY] NUMERIC(18, 2) CONSTRAINT [DF_ITEM_MASTER_QNTY] DEFAULT ((0)) NULL;
END;
