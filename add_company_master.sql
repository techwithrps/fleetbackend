-- Create COMPANY_MASTER table
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[COMPANY_MASTER]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[COMPANY_MASTER] (
        [COMPANY_ID]            NUMERIC(18, 0) IDENTITY(1,1) NOT NULL,
        [COMPANY_NAME]          VARCHAR(255)   NOT NULL,
        [CIN_NO]                VARCHAR(50)    NULL,
        [PAN_NO]                VARCHAR(50)    NULL,
        [GST_NO]                VARCHAR(50)    NULL,
        [CONTACT_PERSON]        VARCHAR(100)   NULL,
        [CONTACT_NO]            VARCHAR(50)    NULL,
        [EMAIL_ID]              VARCHAR(100)   NULL,
        [STATE]                 VARCHAR(100)   NULL,
        [CITY]                  VARCHAR(100)   NULL,
        [PINCODE]               VARCHAR(20)    NULL,
        [REGISTRATION_ADDRESS]  VARCHAR(500)   NULL,
        [WEBSITE]               VARCHAR(255)   NULL,
        [LOGO_BLOB]             VARBINARY(MAX) NULL,
        [LOGO_MIME_TYPE]        VARCHAR(100)   NULL,
        [CREATED_BY]            VARCHAR(50)    NULL,
        [CREATED_ON]            DATETIME       CONSTRAINT [DF_COMPANY_MASTER_CREATED_ON] DEFAULT (GETDATE()) NULL,
        [UPDATED_BY]            VARCHAR(50)    NULL,
        [UPDATED_ON]            DATETIME       NULL,
        PRIMARY KEY CLUSTERED ([COMPANY_ID] ASC)
    );
    PRINT 'Created COMPANY_MASTER table';
END
ELSE
BEGIN
    PRINT 'COMPANY_MASTER table already exists';
END
