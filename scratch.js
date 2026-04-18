const { pool, sql } = require("./Src/config/dbconfig");
async function check() {
  try {
    const res = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TIRE_ATTACHMENT_HISTORY'");
    console.log(res.recordset);
  } catch(e) { console.error(e); }
  process.exit(0);
}
check();
