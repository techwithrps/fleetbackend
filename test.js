const { pool, connectDB } = require("./Src/config/dbconfig");

async function test() {
  await connectDB();
  try {
    const r1 = await pool.request().query("SELECT TOP 1 * FROM dbo.LOCATION_MASTER");
    console.log("LOCATION_MASTER ok", r1.recordset);
  } catch(e) {
    console.error("LOCATION_MASTER err:", e.message);
  }

  try {
    const r2 = await pool.request().query("SELECT TOP 1 * FROM dbo.PAGE_MASTER");
    console.log("PAGE_MASTER ok", r2.recordset);
  } catch(e) {
    console.error("PAGE_MASTER err:", e.message);
  }

  try {
    const r3 = await pool.request().query("SELECT TOP 1 * FROM dbo.USER_PAGE_ACCESS_MAPPING");
    console.log("MAPPING ok", r3.recordset);
  } catch(e) {
    console.error("MAPPING err:", e.message);
  }
  process.exit();
}
test();
