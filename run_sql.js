const fs = require('fs');
const { pool, connectDB } = require("./Src/config/dbconfig");

async function runSQL() {
    try {
        await connectDB();
        console.log("Connected to DB.");

        const sqlScript = fs.readFileSync('add_item_group_purchase_tables.sql', 'utf8');
        
        await pool.request().query(sqlScript);

        console.log("SQL script executed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error executing SQL:", err);
        process.exit(1);
    }
}

runSQL();
