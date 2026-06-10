const { pool, connectDB } = require("./Src/config/dbconfig");

async function checkTables() {
    try {
        await connectDB();
        
        const result = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME IN ('ITEM_GROUP_MASTER', 'ITEM_PURCHASE_MASTER')
        `);

        console.log("Found Tables:");
        console.table(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkTables();
