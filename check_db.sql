SELECT
  @@SERVERNAME AS server_name,
  CAST(SERVERPROPERTY('MachineName') AS NVARCHAR(128)) AS machine_name,
  DB_NAME() AS current_database,
  SUSER_SNAME() AS login_user;

SELECT
  c.name AS column_name,
  t.name AS data_type,
  c.max_length
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.FLEET_EQUIPMENT_MASTER')
  AND c.name IN ('IMAGE','FITNESS_DOC','RC_DOC','INSURANCE_DOC','PERMIT_A','PERMIT_B')
ORDER BY c.name;
