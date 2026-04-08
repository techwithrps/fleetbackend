const { pool, sql } = require("../config/dbconfig");

class TransportRequest {
  static async create(requestData) {
    try {
      const {
        consignee,
        consigner,
        vehicle_type,
        vehicle_size,
        pickup_location,
        stuffing_location,
        delivery_location,
        commodity,
        cargo_type,
        cargo_weight,
        service_type,
        service_prices,
        containers_20ft,
        containers_40ft,
        total_containers,
        expected_pickup_date,
        expected_pickup_time,
        expected_delivery_date,
        expected_delivery_time,
        requested_price,
        no_of_vehicles,
        status,
        vehicle_status,
        customerId,
        SHIPA_NO, // Added new field
      } = requestData;

      const result = await pool
        .request()
        .input("customerId", sql.Int, customerId)
        .input("consignee", sql.NVarChar, consignee)
        .input("consigner", sql.NVarChar, consigner)
        .input("vehicle_type", sql.NVarChar, vehicle_type)
        .input("vehicle_size", sql.NVarChar, vehicle_size)
        .input("pickup_location", sql.NVarChar, pickup_location)
        .input("stuffing_location", sql.NVarChar, stuffing_location)
        .input("delivery_location", sql.NVarChar, delivery_location)
        .input("commodity", sql.NVarChar, commodity)
        .input("cargo_type", sql.NVarChar, cargo_type)
        .input("cargo_weight", sql.Decimal(10, 2), cargo_weight)
        .input(
          "service_type",
          sql.NVarChar(sql.MAX),
          JSON.stringify(service_type)
        )
        .input(
          "service_prices",
          sql.NVarChar(sql.MAX),
          JSON.stringify(service_prices)
        )
        .input("containers_20ft", sql.Int, containers_20ft || 0)
        .input("containers_40ft", sql.Int, containers_40ft || 0)
        .input("total_containers", sql.Int, total_containers)
        .input("expected_pickup_date", sql.Date, expected_pickup_date)
        .input("expected_pickup_time", sql.Time, expected_pickup_time)
        .input("expected_delivery_date", sql.Date, expected_delivery_date)
        .input("expected_delivery_time", sql.Time, expected_delivery_time)
        .input("requested_price", sql.Decimal(10, 2), requested_price)
        .input("no_of_vehicles", sql.Int, no_of_vehicles || 1)
        .input("status", sql.NVarChar, status)
        .input("vehicle_status", sql.NVarChar, vehicle_status || "Empty")
        .input("SHIPA_NO", sql.NVarChar, SHIPA_NO) // Added new field
        .query(`
        INSERT INTO transport_requests (
          customer_id, vehicle_type, vehicle_size, consignee, consigner,
          containers_20ft, containers_40ft, total_containers,
          pickup_location, stuffing_location, delivery_location,
          commodity, cargo_type, cargo_weight, service_type,
          service_prices, expected_pickup_date, expected_pickup_time,
          expected_delivery_date, expected_delivery_time,
          requested_price, status, no_of_vehicles, vehicle_status, SHIPA_NO, created_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @customerId, @vehicle_type, @vehicle_size, @consignee, @consigner,
          @containers_20ft, @containers_40ft, @total_containers,
          @pickup_location, @stuffing_location, @delivery_location,
          @commodity, @cargo_type, @cargo_weight, @service_type,
          @service_prices, @expected_pickup_date, @expected_pickup_time,
          @expected_delivery_date, @expected_delivery_time,
          @requested_price, @status, @no_of_vehicles, @vehicle_status, @SHIPA_NO, GETDATE()
        )
        `);

      return { success: true };
    } catch (error) {
      console.error("Create transport request error:", error);
      throw error;
    }
  }

  static async getCustomerRequests(customerId, page, limit) {
    try {
      const offset = (page - 1) * limit;

      const countResult = await pool
        .request()
        .input("customerId", sql.Int, customerId)
        .query(
          `SELECT COUNT(*) AS total FROM transport_requests WHERE customer_id = @customerId`
        );

      const totalRequests = countResult.recordset[0].total;

      const result = await pool
        .request()
        .input("customerId", sql.Int, customerId)
        .input("offset", sql.Int, offset)
        .input("limit", sql.Int, limit).query(`
          SELECT 
            tr.*,
            CONVERT(varchar, tr.created_at, 120) as request_created_at,
            CONVERT(varchar, tr.updated_at, 120) as request_updated_at,
            CONVERT(varchar, tr.expected_pickup_date, 23) as formatted_pickup_date,
            CONVERT(varchar, tr.expected_delivery_date, 23) as formatted_delivery_date,
            CONVERT(varchar, tr.expected_pickup_time, 108) as formatted_pickup_time,
            CONVERT(varchar, tr.expected_delivery_time, 108) as formatted_delivery_time
          FROM transport_requests tr
          WHERE tr.customer_id = @customerId
          ORDER BY tr.created_at DESC
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);
      return { requests: result.recordset, totalRequests };
    } catch (error) {
      throw error;
    }
  }

  static async getAllRequests(page, limit) {
    try {
      const offset = (page - 1) * limit;

      const countResult = await pool
        .request()
        .query(`SELECT COUNT(*) AS total FROM transport_requests`);

      const totalRequests = countResult.recordset[0].total;

      const result = await pool
        .request()
        .input("offset", sql.Int, offset)
        .input("limit", sql.Int, limit).query(`
          SELECT 
            tr.*,
            CONVERT(varchar, tr.created_at, 120) as request_created_at,
            CONVERT(varchar, tr.updated_at, 120) as request_updated_at,
            CONVERT(varchar, tr.expected_pickup_date, 23) as formatted_pickup_date,
            CONVERT(varchar, tr.expected_delivery_date, 23) as formatted_delivery_date,
            CONVERT(varchar, tr.expected_pickup_time, 108) as formatted_pickup_time,
            CONVERT(varchar, tr.expected_delivery_time, 108) as formatted_delivery_time,
            u.name as customer_name,
            u.email as customer_email,
            u.created_at as user_created_at
          FROM transport_requests tr
          LEFT JOIN users u ON tr.customer_id = u.id
          ORDER BY tr.created_at DESC
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);
      return { requests: result.recordset, totalRequests };
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(requestId, status, adminComment) {
    try {
      const result = await pool
        .request()
        .input("requestId", sql.Int, requestId)
        .input("status", sql.VarChar(20), status)
        .input("adminComment", sql.NVarChar(500), adminComment)
        .input("updatedAt", sql.DateTime, new Date()).query(`
          UPDATE transport_requests 
          SET 
            status = @status,
            admin_comment = @adminComment,
            updated_at = @updatedAt
          OUTPUT INSERTED.*
          WHERE id = @requestId;
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Update status error:", error);
      throw error;
    }
  }

  static async update(id, requestData) {
    try {
      const {
        consignee,
        consigner,
        vehicle_type,
        vehicle_size,
        pickup_location,
        stuffing_location,
        delivery_location,
        commodity,
        cargo_type,
        cargo_weight,
        service_type,
        service_prices,
        containers_20ft,
        containers_40ft,
        total_containers,
        expected_pickup_date,
        expected_pickup_time,
        expected_delivery_date,
        expected_delivery_time,
        requested_price,
        no_of_vehicles,
        customerId,
        SHIPA_NO, // Added new field
      } = requestData;

      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("customerId", sql.Int, customerId)
        .input("consignee", sql.NVarChar, consignee)
        .input("consigner", sql.NVarChar, consigner)
        .input("vehicle_type", sql.NVarChar, vehicle_type)
        .input("vehicle_size", sql.NVarChar, vehicle_size)
        .input("pickup_location", sql.NVarChar, pickup_location)
        .input("stuffing_location", sql.NVarChar, stuffing_location)
        .input("delivery_location", sql.NVarChar, delivery_location)
        .input("commodity", sql.NVarChar, commodity)
        .input("cargo_type", sql.NVarChar, cargo_type)
        .input("cargo_weight", sql.Decimal(10, 2), cargo_weight)
        .input(
          "service_type",
          sql.NVarChar(sql.MAX),
          JSON.stringify(service_type)
        )
        .input(
          "service_prices",
          sql.NVarChar(sql.MAX),
          JSON.stringify(service_prices)
        )
        .input("containers_20ft", sql.Int, containers_20ft)
        .input("containers_40ft", sql.Int, containers_40ft)
        .input("total_containers", sql.Int, total_containers)
        .input("expected_pickup_date", sql.Date, expected_pickup_date)
        .input("expected_pickup_time", sql.Time, expected_pickup_time)
        .input("expected_delivery_date", sql.Date, expected_delivery_date)
        .input("expected_delivery_time", sql.Time, expected_delivery_time)
        .input("requested_price", sql.Decimal(10, 2), requested_price)
        .input("no_of_vehicles", sql.Int, no_of_vehicles || 1)
        .input("SHIPA_NO", sql.NVarChar, SHIPA_NO) // Added new field
        .query(`
          UPDATE transport_requests
          SET 
            consignee = @consignee,
            consigner = @consigner,
            vehicle_type = @vehicle_type,
            vehicle_size = @vehicle_size,
            pickup_location = @pickup_location,
            stuffing_location = @stuffing_location,
            delivery_location = @delivery_location,
            commodity = @commodity,
            cargo_type = @cargo_type,
            cargo_weight = @cargo_weight,
            service_type = @service_type,
            service_prices = @service_prices,
            containers_20ft = @containers_20ft,
            containers_40ft = @containers_40ft,
            total_containers = @total_containers,
            expected_pickup_date = @expected_pickup_date,
         
            expected_delivery_date = @expected_delivery_date,
          
            requested_price = @requested_price,
            no_of_vehicles = @no_of_vehicles,
            SHIPA_NO = @SHIPA_NO,
            updated_at = GETDATE()
          WHERE id = @id AND customer_id = @customerId
        `);

      return { success: true };
    } catch (error) {
      console.error("Update transport request error:", error);
      throw error;
    }
  }
  static async getRequestsByFilters(filters) {
    try {
      const {
        shipa_no,
        request_id,
        container_no,
        date,
        from_date,
        to_date,
        consigner,
      } = filters;

      let query = `
        SELECT DISTINCT tr.*,
        CONVERT(varchar, tr.created_at, 120) as request_created_at,
        CONVERT(varchar, tr.updated_at, 120) as request_updated_at,
        CONVERT(varchar, tr.expected_pickup_date, 23) as formatted_pickup_date,
        CONVERT(varchar, tr.expected_delivery_date, 23) as formatted_delivery_date,
        CONVERT(varchar, tr.expected_pickup_time, 108) as formatted_pickup_time,
        CONVERT(varchar, tr.expected_delivery_time, 108) as formatted_delivery_time,
        u.name as customer_name,
        u.email as customer_email,
        u.created_at as user_created_at
        FROM transport_requests tr
        LEFT JOIN transporter_details td ON tr.id = td.request_id
        LEFT JOIN users u ON tr.customer_id = u.id
      `;

      const whereClauses = [];
      const request = pool.request();

      if (shipa_no) {
        whereClauses.push(`tr.SHIPA_NO LIKE @shipa_no`);
        request.input("shipa_no", sql.NVarChar, `%${shipa_no}%`);
      }
      if (request_id) {
        whereClauses.push(`tr.id = @request_id`);
        request.input("request_id", sql.Int, request_id);
      }
      if (container_no) {
        whereClauses.push(`td.container_no LIKE @container_no`);
        request.input("container_no", sql.NVarChar, `%${container_no}%`);
      }
      if (consigner) {
        whereClauses.push(`tr.consigner LIKE @consigner`);
        request.input("consigner", sql.NVarChar, `%${consigner}%`);
      }
      if (date) {
        whereClauses.push(`CONVERT(date, tr.created_at) = @date`);
        request.input("date", sql.Date, date);
      }
      // New date range filters
      if (from_date && to_date) {
        // Ensure to_date includes the entire day
        const nextDay = new Date(to_date);
        nextDay.setDate(nextDay.getDate() + 1); // Add one day
        whereClauses.push(
          `tr.created_at >= @from_date AND tr.created_at < @to_date_plus_one_day`
        );
        request.input("from_date", sql.Date, from_date);
        request.input(
          "to_date_plus_one_day",
          sql.Date,
          nextDay.toISOString().split("T")[0]
        ); // Pass as YYYY-MM-DD
      } else if (from_date) {
        whereClauses.push(`tr.created_at >= @from_date`);
        request.input("from_date", sql.Date, from_date);
      } else if (to_date) {
        // Ensure to_date includes the entire day
        const nextDay = new Date(to_date);
        nextDay.setDate(nextDay.getDate() + 1); // Add one day
        whereClauses.push(`tr.created_at < @to_date_plus_one_day`);
        request.input(
          "to_date_plus_one_day",
          sql.Date,
          nextDay.toISOString().split("T")[0]
        ); // Pass as YYYY-MM-DD
      }

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(" AND ")}`;
      }

      // Add ORDER BY clause
      query += ` ORDER BY tr.created_at DESC`;

      const result = await request.query(query);
      return {
        requests: result.recordset,
        totalRequests: result.recordset.length,
      };
    } catch (error) {
      console.error("Get filtered requests error:", error);
      throw error;
    }
  }
}

module.exports = TransportRequest;
