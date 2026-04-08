const { pool } = require("../config/dbconfig");
const sql = require("mssql");

// Create a new rate card
const createRateCard = async (req, res) => {
  try {
    const {
      contract_name,
      rate_code,
      customer_type,
      customer_name,
      remarks,
      valid_from,
      valid_to,
      doc_type,
      service_type,
      from_location,
      to_location,
      handover_location,
      pol,
      pod,
      container_size,
      container_type,
      container_status,
      commodity,
      weight_range_from,
      weight_range_to,
      base_rate,
      discount,
      final_rate,
      rate_type
    } = req.body;

    const customer_id = req.user.id; 

    await pool.request()
      .input("customer_id", sql.Int, customer_id)
      .input("contract_name", sql.NVarChar, contract_name || customer_name)
      .input("rate_code", sql.NVarChar, rate_code)
      .input("customer_type", sql.NVarChar, customer_type)
      .input("remarks", sql.NVarChar, remarks)
      .input("valid_from", sql.Date, valid_from)
      .input("valid_to", sql.Date, valid_to)
      .input("doc_type", sql.NVarChar, doc_type)
      .input("service_type", sql.NVarChar, service_type)
      .input("from_location", sql.NVarChar, from_location)
      .input("to_location", sql.NVarChar, to_location)
      .input("handover_location", sql.NVarChar, handover_location)
      .input("pol", sql.NVarChar, pol)
      .input("pod", sql.NVarChar, pod)
      .input("container_size", sql.NVarChar, container_size)
      .input("container_type", sql.NVarChar, container_type)
      .input("container_status", sql.NVarChar, container_status)
      .input("commodity", sql.NVarChar, commodity)
      .input("weight_range_from", sql.Decimal(12, 2), weight_range_from || 0)
      .input("weight_range_to", sql.Decimal(12, 2), weight_range_to || 0)
      .input("base_rate", sql.Decimal(12, 2), base_rate || 0)
      .input("discount", sql.Decimal(12, 2), discount || 0)
      .input("final_rate", sql.Decimal(12, 2), final_rate || 0)
      .input("rate_type", sql.NVarChar, rate_type || 'fixed')
      .query(`
        INSERT INTO rate_cards (
          customer_id, contract_name, rate_code, customer_type, remarks,
          valid_from, valid_to, doc_type, service_type,
          from_location, to_location, handover_location, pol, pod,
          container_size, container_type, container_status, commodity,
          weight_range_from, weight_range_to, base_rate, discount, final_rate,
          rate_type, status
        ) VALUES (
          @customer_id, @contract_name, @rate_code, @customer_type, @remarks,
          @valid_from, @valid_to, @doc_type, @service_type,
          @from_location, @to_location, @handover_location, @pol, @pod,
          @container_size, @container_type, @container_status, @commodity,
          @weight_range_from, @weight_range_to, @base_rate, @discount, @final_rate,
          @rate_type, 'pending'
        )
      `);

    res.status(201).json({ success: true, message: "Rate card submitted for approval" });
  } catch (error) {
    console.error("Error creating rate card:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get rate cards for a customer
const getCustomerRateCards = async (req, res) => {
  try {
    const customer_id = req.user.id;
    const result = await pool.request()
      .input("customer_id", sql.Int, customer_id)
      .query("SELECT * FROM rate_cards WHERE customer_id = @customer_id ORDER BY created_at DESC");

    res.json({ success: true, rateCards: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Admin: Get all pending rate cards
const getPendingRateCards = async (req, res) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT rc.*, u.name as customer_name, u.email as customer_email 
        FROM rate_cards rc
        JOIN users u ON rc.customer_id = u.id
        WHERE rc.status = 'pending'
        ORDER BY rc.created_at ASC
      `);

    res.json({ success: true, rateCards: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Admin: Approve or Reject rate card
const updateRateCardStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_comment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("status", sql.NVarChar, status)
      .input("admin_comment", sql.NVarChar, admin_comment)
      .query("UPDATE rate_cards SET status = @status, admin_comment = @admin_comment, updated_at = GETDATE() WHERE id = @id");

    res.json({ success: true, message: `Rate card ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Internal: Fetch active rate for a trip
const getActiveRate = async (customer_id, params) => {
  try {
    const { container_size, vehicle_type, vehicle_status } = params;
    const result = await pool.request()
      .input("customer_id", sql.Int, customer_id)
      .input("vehicle_type", sql.NVarChar, vehicle_type)
      .input("vehicle_status", sql.NVarChar, vehicle_status)
      .input("today", sql.Date, new Date())
      .query(`
        SELECT TOP 1 * FROM rate_cards 
        WHERE customer_id = @customer_id 
        AND status = 'approved'
        AND vehicle_type = @vehicle_type
        AND (vehicle_status = @vehicle_status OR vehicle_status IS NULL)
        AND @today BETWEEN valid_from AND valid_to
        ORDER BY created_at DESC
      `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error fetching active rate:", error);
    return null;
  }
};

// Specialized endpoint for API call
const fetchActiveRateForUser = async (req, res) => {
  try {
    const { container_size, vehicle_type, vehicle_size, vehicle_status } = req.query;
    const customer_id = req.user.id;

    if (!vehicle_type) {
      return res.status(400).json({ success: false, message: "Missing parameters" });
    }

    const rate = await getActiveRate(customer_id, { container_size, vehicle_type, vehicle_size, vehicle_status });

    if (!rate) {
      return res.json({ success: false, message: "No active rate card found for these parameters" });
    }

    res.json({ success: true, rate });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const deleteRateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const customer_id = req.user.id;

    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("customer_id", sql.Int, customer_id)
      .query("DELETE FROM rate_cards WHERE id = @id AND customer_id = @customer_id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: "Rate card not found or unauthorized" });
    }

    res.json({ success: true, message: "Rate card deleted successfully" });
  } catch (error) {
    console.error("Error deleting rate card:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Create bulk rate cards
const createBulkRateCards = async (req, res) => {
  const { records } = req.body;
  const customer_id = req.user.id;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    for (const record of records) {
      await transaction.request()
        .input("customer_id", sql.Int, customer_id)
        .input("contract_name", sql.NVarChar, record.contract_name || record.customer_name)
        .input("rate_code", sql.NVarChar, record.rate_code)
        .input("customer_type", sql.NVarChar, record.customer_type)
        .input("remarks", sql.NVarChar, record.remarks)
        .input("valid_from", sql.Date, record.valid_from)
        .input("valid_to", sql.Date, record.valid_to)
        .input("doc_type", sql.NVarChar, record.doc_type)
        .input("service_type", sql.NVarChar, record.service_type)
        .input("from_location", sql.NVarChar, record.from_location)
        .input("to_location", sql.NVarChar, record.to_location)
        .input("handover_location", sql.NVarChar, record.handover_location)
        .input("pol", sql.NVarChar, record.pol)
        .input("pod", sql.NVarChar, record.pod)
        .input("container_size", sql.NVarChar, record.container_size)
        .input("container_type", sql.NVarChar, record.container_type)
        .input("container_status", sql.NVarChar, record.container_status)
        .input("commodity", sql.NVarChar, record.commodity)
        .input("weight_range_from", sql.Decimal(12, 2), record.weight_range_from || 0)
        .input("weight_range_to", sql.Decimal(12, 2), record.weight_range_to || 0)
        .input("base_rate", sql.Decimal(12, 2), record.base_rate || 0)
        .input("discount", sql.Decimal(12, 2), record.discount || 0)
        .input("final_rate", sql.Decimal(12, 2), record.final_rate || 0)
        .input("rate_type", sql.NVarChar, record.rate_type || 'fixed')
        .query(`
          INSERT INTO rate_cards (
            customer_id, contract_name, rate_code, customer_type, remarks,
            valid_from, valid_to, doc_type, service_type,
            from_location, to_location, handover_location, pol, pod,
            container_size, container_type, container_status, commodity,
            weight_range_from, weight_range_to, base_rate, discount, final_rate,
            rate_type, status
          ) VALUES (
            @customer_id, @contract_name, @rate_code, @customer_type, @remarks,
            @valid_from, @valid_to, @doc_type, @service_type,
            @from_location, @to_location, @handover_location, @pol, @pod,
            @container_size, @container_type, @container_status, @commodity,
            @weight_range_from, @weight_range_to, @base_rate, @discount, @final_rate,
            @rate_type, 'pending'
          )
        `);
    }

    await transaction.commit();
    res.status(201).json({ success: true, message: `Successfully uploaded ${records.length} rate cards` });
  } catch (error) {
    await transaction.rollback();
    console.error("Bulk create error:", error);
    res.status(500).json({ success: false, message: "Bulk upload failed", error: error.message });
  }
};

const matchRateCard = async (req, res) => {
  try {
    const { from_location, to_location, vehicle_type, service_type } = req.body;
    const customer_id = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    if (!from_location || !to_location) {
        return res.json({ success: false, message: "Origin and Destination required" });
    }

    // Advanced Matching: Locations + Vehicle Category + Service
    let result = await pool.request()
      .input("customer_id", sql.Int, customer_id)
      .input("from", sql.NVarChar, from_location.trim())
      .input("to", sql.NVarChar, to_location.trim())
      .input("today", sql.Date, today)
      .query(`
        SELECT * FROM rate_cards 
        WHERE customer_id = @customer_id AND status = 'approved'
        AND LOWER(TRIM(from_location)) = LOWER(@from) 
        AND LOWER(TRIM(to_location)) = LOWER(@to)
        AND @today BETWEEN valid_from AND valid_to
        ORDER BY created_at DESC
      `);

    if (result.recordset.length > 0) {
      return res.json({ success: true, rates: result.recordset });
    }

    if (result.recordset.length > 0) {
      return res.json({ success: true, rates: result.recordset });
    }

    res.json({ success: false, rates: [], message: "No contract rates found for this route" });
  } catch (error) {
    console.error("Match logic error:", error);
    res.status(500).json({ success: false, message: "Match failed" });
  }
};

module.exports = {
  createRateCard,
  createBulkRateCards,
  getCustomerRateCards,
  getPendingRateCards,
  updateRateCardStatus,
  deleteRateCard,
  fetchActiveRateForUser,
  matchRateCard
};
