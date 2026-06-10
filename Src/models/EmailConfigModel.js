const { pool, sql } = require("../config/dbconfig");
const { encryptToBuffer, decryptFromBuffer } = require("../utils/emailConfigCrypto");

class EmailConfigModel {
  static async getActive() {
    const result = await pool.request().query(`
      SELECT TOP 1
        ID, PROVIDER, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER,
        SMTP_PASS_ENC,
        FROM_EMAIL, FROM_NAME, REPLY_TO,
        IS_ACTIVE, CREATED_AT, UPDATED_AT
      FROM dbo.EMAIL_CONFIG
      WHERE IS_ACTIVE = 1
      ORDER BY UPDATED_AT DESC, ID DESC
    `);

    const row = result.recordset[0];
    if (!row) return null;

    const hasPassword = !!row.SMTP_PASS_ENC;
    return {
      id: row.ID,
      provider: row.PROVIDER,
      smtp_host: row.SMTP_HOST,
      smtp_port: row.SMTP_PORT,
      smtp_secure: !!row.SMTP_SECURE,
      smtp_user: row.SMTP_USER,
      from_email: row.FROM_EMAIL,
      from_name: row.FROM_NAME,
      reply_to: row.REPLY_TO,
      is_active: !!row.IS_ACTIVE,
      has_password: hasPassword,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT,
    };
  }

  static async getActiveWithPassword() {
    const result = await pool.request().query(`
      SELECT TOP 1
        ID, PROVIDER, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER,
        SMTP_PASS_ENC,
        FROM_EMAIL, FROM_NAME, REPLY_TO,
        IS_ACTIVE, CREATED_AT, UPDATED_AT
      FROM dbo.EMAIL_CONFIG
      WHERE IS_ACTIVE = 1
      ORDER BY UPDATED_AT DESC, ID DESC
    `);

    const row = result.recordset[0];
    if (!row) return null;

    return {
      id: row.ID,
      provider: row.PROVIDER,
      smtp_host: row.SMTP_HOST,
      smtp_port: row.SMTP_PORT,
      smtp_secure: !!row.SMTP_SECURE,
      smtp_user: row.SMTP_USER,
      smtp_pass: row.SMTP_PASS_ENC ? decryptFromBuffer(row.SMTP_PASS_ENC) : null,
      from_email: row.FROM_EMAIL,
      from_name: row.FROM_NAME,
      reply_to: row.REPLY_TO,
      is_active: !!row.IS_ACTIVE,
    };
  }

  static async upsertActive(config) {
    const {
      provider,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_password, // optional
      from_email,
      from_name,
      reply_to,
    } = config;

    const encryptedPass = encryptToBuffer(smtp_password);

    // Deactivate any existing active row first to satisfy unique filtered index.
    await pool.request().query(`
      UPDATE dbo.EMAIL_CONFIG
      SET IS_ACTIVE = 0, UPDATED_AT = GETDATE()
      WHERE IS_ACTIVE = 1
    `);

    const request = pool
      .request()
      .input("provider", sql.VarChar(50), provider || null)
      .input("smtp_host", sql.VarChar(255), smtp_host || null)
      .input("smtp_port", sql.Int, smtp_port || null)
      .input("smtp_secure", sql.Bit, smtp_secure ? 1 : 0)
      .input("smtp_user", sql.VarChar(255), smtp_user || null)
      .input("smtp_pass_enc", sql.VarBinary(sql.MAX), encryptedPass)
      .input("from_email", sql.VarChar(255), from_email || null)
      .input("from_name", sql.VarChar(255), from_name || null)
      .input("reply_to", sql.VarChar(255), reply_to || null);

    const result = await request.query(`
      INSERT INTO dbo.EMAIL_CONFIG (
        PROVIDER, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS_ENC,
        FROM_EMAIL, FROM_NAME, REPLY_TO,
        IS_ACTIVE, CREATED_AT, UPDATED_AT
      ) VALUES (
        @provider, @smtp_host, @smtp_port, @smtp_secure, @smtp_user, @smtp_pass_enc,
        @from_email, @from_name, @reply_to,
        1, GETDATE(), GETDATE()
      );

      SELECT SCOPE_IDENTITY() AS ID;
    `);

    return result.recordset[0]?.ID || null;
  }
}

module.exports = EmailConfigModel;

