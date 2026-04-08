/*
  Fleet management schema additions

  New modules covered:
  - BED_MASTER
  - BED_ATTACHMENT_HISTORY
  - TIRE_POSITION_MASTER
  - TIRE_ATTACHMENT_HISTORY
  - JOB_ORDER
  - JOB_ORDER_CLOSE

  Notes:
  - This script follows the existing legacy fleet-table style in the database:
    uppercase table/column names, CREATED_BY/CREATED_ON fields, NUMERIC IDs.
  - Existing tables reused by these modules:
    FLEET_EQUIPMENT_MASTER, TIRE_MASTER, DRIVER_MASTER, VENDOR_MASTER, COMPANY_MASTER.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/* -------------------------------------------------------------------------- */
/* BED MASTER                                                                 */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.BED_MASTER', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BED_MASTER] (
        [BED_ID]          NUMERIC (18)    NOT NULL,
        [BED_NO]          VARCHAR (50)    NOT NULL,
        [BED_TYPE]        VARCHAR (20)    NULL,
        [BED_SIZE]        VARCHAR (20)    NULL,
        [PURCHASE_DATE]   DATE            NULL,
        [COMPANY_NAME]    VARCHAR (100)   NULL,
        [STATUS]          VARCHAR (20)    CONSTRAINT [DF_BED_MASTER_STATUS] DEFAULT ('ACTIVE') NULL,
        [REMARKS]         VARCHAR (500)   NULL,
        [CREATED_BY]      VARCHAR (30)    NULL,
        [CREATED_ON]      DATETIME        CONSTRAINT [DF_BED_MASTER_CREATED_ON] DEFAULT (GETDATE()) NULL,
        [UPDATED_BY]      VARCHAR (30)    NULL,
        [UPDATED_ON]      DATETIME        NULL,
        PRIMARY KEY CLUSTERED ([BED_ID] ASC),
        CONSTRAINT [UQ_BED_MASTER_BED_NO] UNIQUE NONCLUSTERED ([BED_NO] ASC)
    );
END;

/* -------------------------------------------------------------------------- */
/* BED ATTACHMENT / DETACHMENT HISTORY                                        */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.BED_ATTACHMENT_HISTORY', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BED_ATTACHMENT_HISTORY] (
        [BED_ATTACH_ID]   NUMERIC (18)    NOT NULL,
        [EQUIPMENT_ID]    NUMERIC (18)    NOT NULL,
        [BED_ID]          NUMERIC (18)    NOT NULL,
        [ATTACH_DATE]     DATETIME        CONSTRAINT [DF_BED_ATTACH_DATE] DEFAULT (GETDATE()) NULL,
        [DETACH_DATE]     DATETIME        NULL,
        [ATTACH_STATUS]   VARCHAR (20)    CONSTRAINT [DF_BED_ATTACH_STATUS] DEFAULT ('ATTACHED') NULL,
        [REMARKS]         VARCHAR (500)   NULL,
        [CREATED_BY]      VARCHAR (30)    NULL,
        [CREATED_ON]      DATETIME        CONSTRAINT [DF_BED_ATTACHMENT_CREATED_ON] DEFAULT (GETDATE()) NULL,
        [UPDATED_BY]      VARCHAR (30)    NULL,
        [UPDATED_ON]      DATETIME        NULL,
        PRIMARY KEY CLUSTERED ([BED_ATTACH_ID] ASC),
        CONSTRAINT [FK_BED_ATTACHMENT_HISTORY_BED]
            FOREIGN KEY ([BED_ID]) REFERENCES [dbo].[BED_MASTER] ([BED_ID])
    );

    CREATE NONCLUSTERED INDEX [IX_BED_ATTACHMENT_HISTORY_EQUIPMENT_ID]
        ON [dbo].[BED_ATTACHMENT_HISTORY]([EQUIPMENT_ID] ASC);

    CREATE NONCLUSTERED INDEX [IX_BED_ATTACHMENT_HISTORY_BED_ID]
        ON [dbo].[BED_ATTACHMENT_HISTORY]([BED_ID] ASC);
END;

/* -------------------------------------------------------------------------- */
/* TIRE POSITION MASTER                                                       */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.TIRE_POSITION_MASTER', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TIRE_POSITION_MASTER] (
        [POSITION_ID]     NUMERIC (18)    NOT NULL,
        [POSITION_CODE]   VARCHAR (20)    NOT NULL,
        [POSITION_NAME]   VARCHAR (100)   NOT NULL,
        [POSITION_GROUP]  VARCHAR (20)    NULL,
        [STATUS]          VARCHAR (20)    CONSTRAINT [DF_TIRE_POSITION_STATUS] DEFAULT ('ACTIVE') NULL,
        [REMARKS]         VARCHAR (500)   NULL,
        [CREATED_BY]      VARCHAR (30)    NULL,
        [CREATED_ON]      DATETIME        CONSTRAINT [DF_TIRE_POSITION_CREATED_ON] DEFAULT (GETDATE()) NULL,
        [UPDATED_BY]      VARCHAR (30)    NULL,
        [UPDATED_ON]      DATETIME        NULL,
        PRIMARY KEY CLUSTERED ([POSITION_ID] ASC),
        CONSTRAINT [UQ_TIRE_POSITION_MASTER_CODE] UNIQUE NONCLUSTERED ([POSITION_CODE] ASC)
    );
END;

/* -------------------------------------------------------------------------- */
/* TIRE ATTACHMENT / DETACHMENT HISTORY                                       */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.TIRE_ATTACHMENT_HISTORY', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TIRE_ATTACHMENT_HISTORY] (
        [TIRE_ATTACH_ID]   NUMERIC (18)    NOT NULL,
        [ATTACH_FOR]       VARCHAR (20)    NOT NULL,
        [EQUIPMENT_ID]     NUMERIC (18)    NULL,
        [BED_ID]           NUMERIC (18)    NULL,
        [TIRE_ID]          NUMERIC (18)    NOT NULL,
        [POSITION_ID]      NUMERIC (18)    NOT NULL,
        [ATTACH_DATE]      DATETIME        CONSTRAINT [DF_TIRE_ATTACH_DATE] DEFAULT (GETDATE()) NULL,
        [DETACH_DATE]      DATETIME        NULL,
        [KM_RUN]           NUMERIC (18, 2) NULL,
        [ATTACH_STATUS]    VARCHAR (20)    CONSTRAINT [DF_TIRE_ATTACH_STATUS] DEFAULT ('ATTACHED') NULL,
        [REMARKS]          VARCHAR (500)   NULL,
        [CREATED_BY]       VARCHAR (30)    NULL,
        [CREATED_ON]       DATETIME        CONSTRAINT [DF_TIRE_ATTACHMENT_CREATED_ON] DEFAULT (GETDATE()) NULL,
        [UPDATED_BY]       VARCHAR (30)    NULL,
        [UPDATED_ON]       DATETIME        NULL,
        PRIMARY KEY CLUSTERED ([TIRE_ATTACH_ID] ASC),
        CONSTRAINT [FK_TIRE_ATTACHMENT_HISTORY_TIRE]
            FOREIGN KEY ([TIRE_ID]) REFERENCES [dbo].[TIRE_MASTER] ([TIRE_ID]),
        CONSTRAINT [FK_TIRE_ATTACHMENT_HISTORY_POSITION]
            FOREIGN KEY ([POSITION_ID]) REFERENCES [dbo].[TIRE_POSITION_MASTER] ([POSITION_ID]),
        CONSTRAINT [FK_TIRE_ATTACHMENT_HISTORY_BED]
            FOREIGN KEY ([BED_ID]) REFERENCES [dbo].[BED_MASTER] ([BED_ID]),
        CONSTRAINT [CK_TIRE_ATTACHMENT_ATTACH_FOR]
            CHECK ([ATTACH_FOR] IN ('VEHICLE', 'BED')),
        CONSTRAINT [CK_TIRE_ATTACHMENT_TARGET]
            CHECK (
                ([ATTACH_FOR] = 'VEHICLE' AND [EQUIPMENT_ID] IS NOT NULL)
                OR
                ([ATTACH_FOR] = 'BED' AND [BED_ID] IS NOT NULL)
            )
    );

    CREATE NONCLUSTERED INDEX [IX_TIRE_ATTACHMENT_HISTORY_TIRE_ID]
        ON [dbo].[TIRE_ATTACHMENT_HISTORY]([TIRE_ID] ASC);

    CREATE NONCLUSTERED INDEX [IX_TIRE_ATTACHMENT_HISTORY_POSITION_ID]
        ON [dbo].[TIRE_ATTACHMENT_HISTORY]([POSITION_ID] ASC);

    CREATE NONCLUSTERED INDEX [IX_TIRE_ATTACHMENT_HISTORY_EQUIPMENT_ID]
        ON [dbo].[TIRE_ATTACHMENT_HISTORY]([EQUIPMENT_ID] ASC);

    CREATE NONCLUSTERED INDEX [IX_TIRE_ATTACHMENT_HISTORY_BED_ID]
        ON [dbo].[TIRE_ATTACHMENT_HISTORY]([BED_ID] ASC);
END;

/* -------------------------------------------------------------------------- */
/* JOB ORDER                                                                  */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.JOB_ORDER', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[JOB_ORDER] (
        [JO_ID]              NUMERIC (18)    NOT NULL,
        [JO_NO]              VARCHAR (50)    NOT NULL,
        [JO_DATE]            DATE            CONSTRAINT [DF_JOB_ORDER_JO_DATE] DEFAULT (GETDATE()) NOT NULL,
        [JO_TYPE]            VARCHAR (50)    NULL,
        [JO_FOR]             VARCHAR (20)    NULL,
        [JO_VALIDITY]        DATE            NULL,
        [EQUIPMENT_ID]       NUMERIC (18)    NULL,
        [BED_ID]             NUMERIC (18)    NULL,
        [VEHICLE_NO]         VARCHAR (50)    NULL,
        [DRIVER_ID]          NUMERIC (18)    NULL,
        [DRIVER_NAME]        VARCHAR (100)   NULL,
        [DRIVER_CONTACT_NO]  VARCHAR (50)    NULL,
        [WORKSHOP_LOCATION]  VARCHAR (100)   NULL,
        [SURVEY_BY]          VARCHAR (100)   NULL,
        [LICENSE_VALIDITY]   DATE            NULL,
        [VEHICLE_TYPE]       VARCHAR (50)    NULL,
        [PREVIOUS_BALANCE]   NUMERIC (18, 2) CONSTRAINT [DF_JOB_ORDER_PREV_BAL] DEFAULT ((0)) NULL,
        [REMARKS]            VARCHAR (500)   NULL,
        [ADVANCE_CASH]       NUMERIC (18, 2) CONSTRAINT [DF_JOB_ORDER_ADV_CASH] DEFAULT ((0)) NULL,
        [ADVANCE_OIL]        NUMERIC (18, 2) CONSTRAINT [DF_JOB_ORDER_ADV_OIL] DEFAULT ((0)) NULL,
        [ADVANCE_TOTAL]      AS (ISNULL([ADVANCE_CASH], (0)) + ISNULL([ADVANCE_OIL], (0))),
        [STATUS]             VARCHAR (20)    CONSTRAINT [DF_JOB_ORDER_STATUS] DEFAULT ('OPEN') NULL,
        [CREATED_BY]         VARCHAR (30)    NULL,
        [CREATED_ON]         DATETIME        CONSTRAINT [DF_JOB_ORDER_CREATED_ON] DEFAULT (GETDATE()) NULL,
        [UPDATED_BY]         VARCHAR (30)    NULL,
        [UPDATED_ON]         DATETIME        NULL,
        PRIMARY KEY CLUSTERED ([JO_ID] ASC),
        CONSTRAINT [UQ_JOB_ORDER_JO_NO] UNIQUE NONCLUSTERED ([JO_NO] ASC),
        CONSTRAINT [FK_JOB_ORDER_BED]
            FOREIGN KEY ([BED_ID]) REFERENCES [dbo].[BED_MASTER] ([BED_ID]),
        CONSTRAINT [FK_JOB_ORDER_DRIVER]
            FOREIGN KEY ([DRIVER_ID]) REFERENCES [dbo].[DRIVER_MASTER] ([DRIVER_ID])
    );

    CREATE NONCLUSTERED INDEX [IX_JOB_ORDER_EQUIPMENT_ID]
        ON [dbo].[JOB_ORDER]([EQUIPMENT_ID] ASC);

    CREATE NONCLUSTERED INDEX [IX_JOB_ORDER_DRIVER_ID]
        ON [dbo].[JOB_ORDER]([DRIVER_ID] ASC);
END;

/* -------------------------------------------------------------------------- */
/* JOB ORDER CLOSE                                                            */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.JOB_ORDER_CLOSE', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[JOB_ORDER_CLOSE] (
        [JO_CLOSE_ID]        NUMERIC (18)    NOT NULL,
        [JO_ID]              NUMERIC (18)    NOT NULL,
        [JO_NO]              VARCHAR (50)    NULL,
        [TRIP_CLOSE_DATE]    DATE            NULL,
        [TOTAL_ADVANCE]      NUMERIC (18, 2) CONSTRAINT [DF_JOB_CLOSE_TOTAL_ADV] DEFAULT ((0)) NULL,
        [BALANCE_ADVANCE]    NUMERIC (18, 2) CONSTRAINT [DF_JOB_CLOSE_BAL_ADV] DEFAULT ((0)) NULL,
        [JO_CLOSE_AMOUNT]    NUMERIC (18, 2) CONSTRAINT [DF_JOB_CLOSE_AMOUNT] DEFAULT ((0)) NULL,
        [ADVANCE_REFUND]     VARCHAR (10)    NULL,
        [CLOSE_REMARKS]      VARCHAR (500)   NULL,
        [STATUS]             VARCHAR (20)    CONSTRAINT [DF_JOB_CLOSE_STATUS] DEFAULT ('CLOSED') NULL,
        [CREATED_BY]         VARCHAR (30)    NULL,
        [CREATED_ON]         DATETIME        CONSTRAINT [DF_JOB_CLOSE_CREATED_ON] DEFAULT (GETDATE()) NULL,
        PRIMARY KEY CLUSTERED ([JO_CLOSE_ID] ASC),
        CONSTRAINT [FK_JOB_ORDER_CLOSE_JOB_ORDER]
            FOREIGN KEY ([JO_ID]) REFERENCES [dbo].[JOB_ORDER] ([JO_ID]),
        CONSTRAINT [CK_JOB_ORDER_CLOSE_ADVANCE_REFUND]
            CHECK ([ADVANCE_REFUND] IN ('YES', 'NO') OR [ADVANCE_REFUND] IS NULL)
    );

    CREATE NONCLUSTERED INDEX [IX_JOB_ORDER_CLOSE_JO_ID]
        ON [dbo].[JOB_ORDER_CLOSE]([JO_ID] ASC);
END;
