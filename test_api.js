const { pool, sql } = require('./Src/config/dbconfig');
const CompanyModel = require('./Src/models/CompanyModel');
const VehicleReportController = require('./Src/controller/vehicleReportController');

async function test() {
  try {
    const { connectDB } = require('./Src/config/dbconfig');
    await connectDB();
    console.log("Connected to DB.");

    try {
      console.log("Testing CompanyModel.getAllCompanies()...");
      await CompanyModel.getAllCompanies();
      console.log("CompanyModel.getAllCompanies() OK");
    } catch (e) {
      console.error("CompanyModel Error:", e);
    }

    try {
      console.log("Testing Vehicle Master Report query...");
      const req = {};
      const res = {
        status: (code) => ({
          json: (data) => console.log("Vehicle Report JSON:", code, "success:", data.success)
        })
      };
      await VehicleReportController.getVehicleMasterReport(req, res);
    } catch (e) {
      console.error("Column fetch Error:", e);
    }

    process.exit(0);
  } catch (err) {
    console.error("Connection Error:", err);
    process.exit(1);
  }
}

test();
