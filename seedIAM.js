const { seedDefaultPermissions } = require("./Src/services/iamService");

async function run() {
  console.log("Seeding new granular permissions...");
  try {
    const perms = await seedDefaultPermissions();
    console.log("Done! Seeded", perms.length, "permissions.");
    process.exit(0);
  } catch (error) {
    console.error("Error formatting DB:", error);
    process.exit(1);
  }
}

run();
