const { pool, sql, connectDB } = require("./Src/config/dbconfig");
const fs = require('fs');
const path = require('path');

// Raw data from the previous step
const itemsRaw = [
    "IGNITION SWITCH EICHER 40.40  IA208177", "TURNING TABLE MAIN PIN", "ALTINATOR CUT OUT LEY OLD MODLE (26938063A)", 
    "FAN BELT AL 4019 (8PK1250EPDM)", "GEAR BOX SELECTOR PAD F2437514", "GEAR BOX SELECTOR PLATE 1ST & 2ND F2437614", 
    "GEAR BOX SELECTOR PLATE F2437414", "BRAKE OIL BOTTLE 4018 (NAIP-NPN)", "NEW PLATE 12MM 45\"*29\"", 
    "RADIATOR JALLI EISHER 35.31", "COOLANT TUNCKY EISHER PRO (ID326182)", "TANK ASSY (RADIATOR TANK) EICHER PRO ID326182", 
    "H/L RELAY 06 PIN BIG", "WIRE WITH CUPLOUR FOR TRAILER", "FRONT KAMANI WASHER", "KAMANI JHOKA 27 NO 9\"", 
    "BONNET SHEET WITH COVER (6037)", "HAND CONTROL VALVE (HAND BRAKE ASSY) IC307531", "VISCOUS FAN ASSY (ID205984)", 
    "GEAR LEAVER DANDI (LEY)", "ENGINE MOUNTING FRONT EISHER (IA202606)", "ENGINE PISTON RING 6DTI (P0953951)", 
    "PRESSURE PLATE ASSY EISHER(380061L5723)", "BACK GLASS CARGO CABIN", "NAIL 1.5 INC", "CAB MTG BRKT ON CHASIS CH/RH(F4D02513)", 
    "CAB PIVOT BKT ON CHASIS (F4D02413)", "CAB PIVOT BKT ON CAB (F4D01512)", "HUB CHUCK NUT LOCK (YORK)", 
    "HUB CHUCK NUT (YORK)", "PADDLE WITH SENSOR (EISHER PRO 6037)IE310538)", "GEAR SHIFTER (LEVER) END EICHER 35.31 GS01030", 
    "FENDER EISHER 35.31", "FRONT WHEEL CAP EISHER 35.31(IA303716)", "CABIL WIRE WITH COUPLER TATA 4923", 
    "GEAR LEAVER COVER TATA (4923)", "HEAD LAMP HOUSING R/S (IA300186)", "BELT TENSIONER (EISHER)2222898763", 
    "NUT BOLT 13 NO 2\"", "NUT BOLT 21 NO 1.5\"", "NUT BOLT 19 NO 2.5\"", "WIPER BLADE NEW MODLE 20\"", 
    "U BOLT 33 NO 24\"", "FAN BELT EISHER 6037 (2221707005)", "BELLOW AIR CLEANER HOSE CLIP (40.40)", 
    "BRAKE TUBER ASSY (CLUTCH OIL PIPE ) IA000327", "BELLOW AIR CLEANER (ID206956)", "BRAKE VALVE EICHER 35.31 (M304930/306840/IA090213)", 
    "PIN GREASE EP2", "GREESE EP-2", "REAR SPRING BUSH (TATA)3523250150", "STEEL PATCH 2 INC", 
    "GEAR OIL ELBOW OIL FILTER (F1332342)", "KIT FOR LOCKS L/S TATA SIGNA L/S(N0284172300109)", 
    "KIT FOR LOCKS TATA SIGNA R/S", "UREA CAP EISHER PRO IC327092", "FILTER CAPUREA LOCKABLE EISHER 6037", 
    "OIL GUAZE EISHER (ME014910)", "SOLENOID SWITCH 12V LUKAS 26241556 (GENSET)", "DIESEL FILTER WATER SEP (F002H23590)", 
    "HEAD GAS KIT HALF (3088 MLS)", "HEAD LIGHT BEEM ASSY LAKKAR CABIN", "FAN BELT (278603990126)", 
    "WIPER CHRIYA LOCK LAKKAR CABIN", "FAN BELT (TATA SIGNA) 5259157", "SOLONIDE SWITCH 24 V 6037 (LOCKAL)", 
    "SELF GARRARI CHIMTA 24 V", "CHHIK MACHINE KIT (300003075)", "HEAD LIGHT ASSY EISHER 6037 (IE316172)", 
    "CARBON SET SELF 24 V OLD MODLE LEY", "WIPER BLADE 20\" EISEHR", "WIPER BLADE 17\"EISHER", 
    "CLUTCH CYLINDER EISHER 6037 SMALL FRONT (ID311776)", "CLUTCH CYLINDER EISHER BACK (BIG) 6037 ID319724", 
    "DRIVER SHEET RAKSHEEN BOTH SIDE", "OVERRUNNING CLUTCH DRIVER (F002G20724)", "SLEEP YOKE K269A", 
    "SHAFT CROSS RK102", "TQ OIL 1/2 LTR", "ENGINE LINER Y", "PRESSURE METER PIPE 14/19 (CA-209B88)", 
    "TAPPIED COVER PACKING EISHER (ID320154)", "BACK GLASS RUBBER CATGO CABIN", "SLEEP YOKE (K269A) EISHER", 
    "SAFAT CROSS RK102 (EISHER)", "ENGINE VALVE SET IB999769", "TRAILER VALVE ASSY (X7439400)", 
    "PRESSURE TEE 22/24", "TRAILER BALANCE ROD PIN ", "TRAILER BALANCE ROD SMALL", "TRAILER BALANCE ROD BIG", 
    "3000 INC SQ 30 MM PLATE 5FT/04FT/2INC", "31 SQ FT MS PLATE 12MM  06FT/535FT", "32 SQ FT MS PLATE 05 MM 08FT/04FT", 
    "30 SQ FT MS PLATE 10 MM 6FT/5FT", "96 SQ ET IRON SHEET 18 GUAZE", "64 SQ FT IRON SHEET 16 GUAZE", 
    "SCRAP PATTI ", "C CHENNAL 6\"", "FUSE 10 AMP"
];

async function seed() {
    try {
        console.log("Connecting to database...");
        await connectDB();
        
        console.log("Starting seed process...");
        const result = await pool.request().query("SELECT ISNULL(MAX(ITEM_ID), 0) AS max_id FROM ITEM_MASTER");
        let currentId = Number(result.recordset[0].max_id) + 1;

        for (let i = 0; i < itemsRaw.length; i++) {
            const itemName = itemsRaw[i];
            const itemCode = `ITM${String(currentId).padStart(4, '0')}`;
            
            try {
                await pool.request()
                    .input("id", sql.Numeric(18, 0), currentId)
                    .input("code", sql.VarChar(50), itemCode)
                    .input("name", sql.VarChar(100), itemName)
                    .query(`
                        IF NOT EXISTS (SELECT 1 FROM ITEM_MASTER WHERE ITEM_NAME = @name)
                        BEGIN
                            INSERT INTO ITEM_MASTER (ITEM_ID, ITEM_CODE, ITEM_NAME, STATUS, CREATED_ON)
                            VALUES (@id, @code, @name, 'ACTIVE', GETDATE())
                        END
                    `);
                console.log(`Seeded: ${itemName}`);
                currentId++;
            } catch (innerError) {
                console.error(`Error seeding ${itemName}:`, innerError.message);
            }
        }
        console.log("Seeding completed!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seed();
