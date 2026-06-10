const { pool, connectDB } = require("./Src/config/dbconfig");
const ReportMasterController = require("./Src/controller/reportMasterController");

async function check() {
  try {
    await connectDB();
    console.log("Database connected successfully.");

    const testUserAdminAll = {
      role: "Admin",
      terminalId: "ALL"
    };

    const res = {
      json: (body) => {
        console.log("SUCCESS RESPONSE BODY:", JSON.stringify(body, null, 2));
      },
      status: (code) => {
        console.log("STATUS CODE:", code);
        return {
          json: (body) => {
            console.log("ERROR RESPONSE BODY:", JSON.stringify(body, null, 2));
          }
        };
      }
    };

    console.log("\n--- Testing dashboard summary for Admin with terminalId = ALL ---");
    await ReportMasterController.getDashboardSummary({ user: testUserAdminAll }, res);

    console.log("\n--- Testing getAllSummary for Admin (checks if the missing import issue is fixed) ---");
    await ReportMasterController.getAllSummary({ user: testUserAdminAll }, res);

  } catch(e) {
    console.error("Test execution failed:", e);
  }
  process.exit(0);
}
check();
