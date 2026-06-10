/*
  Item Group Master and Item Purchase Master schemas
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/* -------------------------------------------------------------------------- */
/* ITEM GROUP MASTER                                                          */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.ITEM_GROUP_MASTER', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ITEM_GROUP_MASTER] (
        [GROUP_ID]        NUMERIC (18)    NOT NULL,
        [GROUP_CODE]      VARCHAR (50)    NOT NULL,
        [GROUP_NAME]      VARCHAR (100)   NOT NULL,
        [STATUS]          VARCHAR (20)    CONSTRAINT [DF_ITEM_GROUP_STATUS] DEFAULT ('ACTIVE') NULL,
        [CREATED_BY]      VARCHAR (30)    NULL,
        [CREATED_ON]      DATETIME        CONSTRAINT [DF_ITEM_GROUP_CREATED_ON] DEFAULT (GETDATE()) NULL,
        [UPDATED_BY]      VARCHAR (30)    NULL,
        [UPDATED_ON]      DATETIME        NULL,
        PRIMARY KEY CLUSTERED ([GROUP_ID] ASC),
        CONSTRAINT [UQ_ITEM_GROUP_CODE] UNIQUE NONCLUSTERED ([GROUP_CODE] ASC)
    );
END;

/* -------------------------------------------------------------------------- */
/* ITEM PURCHASE MASTER                                                       */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.ITEM_PURCHASE_MASTER', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ITEM_PURCHASE_MASTER] (
        [PURCHASE_ID]     NUMERIC (18)    NOT NULL,
        [PURCHASE_NO]     VARCHAR (50)    NOT NULL,
        [ITEM_ID]         NUMERIC (18)    NOT NULL,
        [PURCHASE_PRICE]  NUMERIC (18, 2) CONSTRAINT [DF_ITEM_PURCHASE_PRICE] DEFAULT ((0)) NULL,
        [QUANTITY]        NUMERIC (18, 2) CONSTRAINT [DF_ITEM_PURCHASE_QNTY] DEFAULT ((0)) NULL,
        [PURCHASE_DATE]   DATE            NULL,
        [PURCHASED_BY]    VARCHAR (100)   NULL,
        [CREATED_BY]      VARCHAR (30)    NULL,
        [CREATED_ON]      DATETIME        CONSTRAINT [DF_ITEM_PURCHASE_CREATED_ON] DEFAULT (GETDATE()) NULL,
        [UPDATED_BY]      VARCHAR (30)    NULL,
        [UPDATED_ON]      DATETIME        NULL,
        PRIMARY KEY CLUSTERED ([PURCHASE_ID] ASC),
        CONSTRAINT [UQ_ITEM_PURCHASE_NO] UNIQUE NONCLUSTERED ([PURCHASE_NO] ASC)
    );
END;
