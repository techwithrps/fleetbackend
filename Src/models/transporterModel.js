const { pool, sql } = require("../config/dbconfig");

const transporterModel = {
  // Get transporter details by request ID
  getTransporterByRequestId: async (requestId) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId).query(`
          SELECT * FROM transporter_details 
          WHERE request_id = @request_id
          ORDER BY vehicle_sequence
        `);
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },

  // Check container history
  checkContainerHistory: async (containerNo, currentRequestId = null) => {
    try {
      if (!containerNo || containerNo.trim() === "") {
        return { history: [], lastUsed: null, totalUses: 0 };
      }

      const cleanContainerNo = containerNo.trim();
      let query = `
        SELECT 
          td.id,
          td.request_id,
          td.container_no,
          td.vehicle_number,
          td.transporter_name,
          td.driver_name,
          td.created_at,
          tr.consignee,
          tr.consigner,
          tr.status as request_status
        FROM transporter_details td
        INNER JOIN transport_requests tr ON td.request_id = tr.id
        WHERE td.container_no = @container_no
      `;

      const request = pool
        .request()
        .input("container_no", sql.NVarChar(100), cleanContainerNo);

      if (currentRequestId) {
        query += ` AND td.request_id != @current_request_id`;
        request.input("current_request_id", sql.Int, currentRequestId);
      }

      query += ` ORDER BY td.request_id DESC`;

      const result = await request.query(query);
      const history = result.recordset;

      return {
        history,
        lastUsed: history.length > 0 ? history[0] : null,
        totalUses: history.length,
      };
    } catch (error) {
      return { history: [], lastUsed: null, totalUses: 0 };
    }
  },

  // Get next available sequence number for a request
  getNextSequenceNumber: async (requestId) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId).query(`
          SELECT ISNULL(MAX(vehicle_sequence), 0) + 1 as next_sequence 
          FROM transporter_details
          WHERE request_id = @request_id
        `);
      return result.recordset[0].next_sequence;
    } catch (error) {
      throw error;
    }
  },

  // Create multiple vehicles in batch (ATOMIC OPERATION)
  createMultipleVehicles: async (requestId, vehicles) => {
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      // Get the starting sequence number
      const startSequenceResult = await transaction
        .request()
        .input("request_id", sql.Int, requestId).query(`
          SELECT ISNULL(MAX(vehicle_sequence), 0) as max_sequence 
          FROM transporter_details
          WHERE request_id = @request_id
        `);

      let currentSequence = startSequenceResult.recordset[0].max_sequence + 1;
      const results = [];

      for (const vehicleData of vehicles) {
        const {
          transporter_name,
          vehicle_number,
          driver_name,
          driver_contact,
          license_number,
          license_expiry,
          additional_charges = 0,
          service_charges,
          total_charge,
          container_no,
          line,
          seal_no,
          seal1,
          seal2,
          container_total_weight,
          cargo_total_weight,
          container_type,
          container_size,
        } = vehicleData;

        const result = await transaction
          .request()
          .input("request_id", sql.Int, requestId)
          .input("transporter_name", sql.NVarChar(255), transporter_name)
          .input("vehicle_number", sql.NVarChar(50), vehicle_number)
          .input("driver_name", sql.NVarChar(255), driver_name)
          .input("driver_contact", sql.NVarChar(20), driver_contact)
          .input("license_number", sql.NVarChar(50), license_number || null)
          .input("license_expiry", sql.Date, license_expiry || null)
          .input("additional_charges", sql.Decimal(12, 2), additional_charges)
          .input(
            "service_charges",
            sql.NVarChar(sql.MAX),
            service_charges || null
          )
          .input("total_charge", sql.Decimal(12, 2), total_charge || 0)
          .input("container_no", sql.NVarChar(100), container_no || null)
          .input("line", sql.NVarChar(100), line || null)
          .input("seal_no", sql.NVarChar(100), seal_no || null)
          .input("seal1", sql.NVarChar(100), seal1 || null)
          .input("seal2", sql.NVarChar(100), seal2 || null)
          .input(
            "container_total_weight",
            sql.Decimal(12, 2),
            container_total_weight || null
          )
          .input(
            "cargo_total_weight",
            sql.Decimal(12, 2),
            cargo_total_weight || null
          )
          .input("container_type", sql.NVarChar(50), container_type || null)
          .input("container_size", sql.NVarChar(20), container_size || null)
          .input("vehicle_sequence", sql.Int, currentSequence).query(`
            INSERT INTO transporter_details (
              request_id, transporter_name, vehicle_number, driver_name, driver_contact,
              license_number, license_expiry, additional_charges, service_charges, total_charge,
              container_no, line, seal_no, vehicle_sequence, seal1, seal2, 
              container_total_weight, cargo_total_weight, container_type, container_size
            )
            OUTPUT INSERTED.*
            VALUES (
              @request_id, @transporter_name, @vehicle_number, @driver_name, @driver_contact,
              @license_number, @license_expiry, @additional_charges, @service_charges, @total_charge,
              @container_no, @line, @seal_no, @vehicle_sequence, @seal1, @seal2,
              @container_total_weight, @cargo_total_weight, @container_type, @container_size
            )
          `);

        results.push(result.recordset[0]);
        currentSequence++;
      }

      // Update the transport request status to 'Vehicle Assigned'
      await transaction.request().input("request_id", sql.Int, requestId)
        .query(`
          UPDATE transport_requests
          SET status = 'Vehicle Assigned', updated_at = GETDATE()
          WHERE id = @request_id
        `);

      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      console.error("Create multiple vehicles error:", error);
      throw error;
    }
  },

  // updateMultipleVehicleContainers method with UPDATE-then-INSERT logic
  updateMultipleVehicleContainers: async (requestId, vehicleContainers) => {
    try {
      console.log("Starting batch container assignment");

      const results = [];
      let sequence; // Will be initialized later

      // Get max sequence once
      const seqResult = await pool
        .request()
        .input("request_id", sql.Int, requestId)
        .query(
          "SELECT ISNULL(MAX(vehicle_sequence), 0) as max_seq FROM transporter_details WHERE request_id = @request_id"
        );
      sequence = seqResult.recordset[0].max_seq + 1;

      for (const vc of vehicleContainers) {
        console.log(`Processing vehicle ${vc.vehicle_number}`);

        const vInfo = await pool
          .request()
          .input("request_id", sql.Int, requestId)
          .input("vehicle_number", sql.NVarChar(50), vc.vehicle_number)
          .query(
            `SELECT TOP 1 id, transporter_name, driver_name, driver_contact, 
             ISNULL(additional_charges, 0) as additional_charges,
             service_charges, ISNULL(total_charge, 0) as total_charge, container_no
             FROM transporter_details 
             WHERE request_id = @request_id AND vehicle_number = @vehicle_number
             ORDER BY vehicle_sequence`
          );

        if (vInfo.recordset.length === 0) {
          console.warn(
            `Vehicle ${vc.vehicle_number} not found for request ${requestId}. Skipping.`
          );
          continue; // Skip to the next vehicle
        }

        const v = vInfo.recordset[0];
        const containerResults = [];

        // Check if the first row for this vehicle is empty and can be updated
        let canUpdateFirstRow = v.container_no === null;
        let firstRowId = v.id;

        for (let i = 0; i < vc.containers.length; i++) {
          const container = vc.containers[i];
          let result;

          if (i === 0 && canUpdateFirstRow) {
            // First container, and the vehicle's row is empty, so UPDATE it
            console.log(
              `Updating existing row ${firstRowId} for vehicle ${vc.vehicle_number}`
            );
            result = await pool
              .request()
              .input("id", sql.Int, firstRowId)
              .input(
                "container_no",
                sql.NVarChar(100),
                container.container_no || null
              )
              .input("line", sql.NVarChar(100), container.line || null)
              .input("seal_no", sql.NVarChar(100), container.seal_no || null)
              .input("seal1", sql.NVarChar(100), container.seal1 || null)
              .input("seal2", sql.NVarChar(100), container.seal2 || null)
              .input(
                "container_total_weight",
                sql.Decimal(12, 2),
                container.container_total_weight || null
              )
              .input(
                "cargo_total_weight",
                sql.Decimal(12, 2),
                container.cargo_total_weight || null
              )
              .input(
                "container_type",
                sql.NVarChar(50),
                container.container_type || null
              )
              .input(
                "container_size",
                sql.NVarChar(20),
                container.container_size || null
              ).query(`
                UPDATE transporter_details
                SET 
                  container_no = @container_no, line = @line, seal_no = @seal_no,
                  seal1 = @seal1, seal2 = @seal2,
                  container_total_weight = @container_total_weight,
                  cargo_total_weight = @cargo_total_weight,
                  container_type = @container_type,
                  container_size = @container_size,
                  updated_at = GETDATE()
                OUTPUT INSERTED.id, INSERTED.container_no
                WHERE id = @id
              `);
          } else {
            // Additional container, or the first row was not empty, so INSERT a new row
            console.log(`Inserting new row for vehicle ${vc.vehicle_number}`);
            result = await pool
              .request()
              .input("request_id", sql.Int, requestId)
              .input("transporter_name", sql.NVarChar(255), v.transporter_name)
              .input("vehicle_number", sql.NVarChar(50), vc.vehicle_number)
              .input("driver_name", sql.NVarChar(255), v.driver_name)
              .input("driver_contact", sql.NVarChar(20), v.driver_contact)
              .input(
                "additional_charges",
                sql.Decimal(12, 2),
                v.additional_charges
              )
              .input(
                "service_charges",
                sql.NVarChar(sql.MAX),
                v.service_charges
              )
              .input("total_charge", sql.Decimal(12, 2), v.total_charge)
              .input(
                "container_no",
                sql.NVarChar(100),
                container.container_no || null
              )
              .input("line", sql.NVarChar(100), container.line || null)
              .input("seal_no", sql.NVarChar(100), container.seal_no || null)
              .input("seal1", sql.NVarChar(100), container.seal1 || null)
              .input("seal2", sql.NVarChar(100), container.seal2 || null)
              .input(
                "container_total_weight",
                sql.Decimal(12, 2),
                container.container_total_weight || null
              )
              .input(
                "cargo_total_weight",
                sql.Decimal(12, 2),
                container.cargo_total_weight || null
              )
              .input(
                "container_type",
                sql.NVarChar(50),
                container.container_type || null
              )
              .input(
                "container_size",
                sql.NVarChar(20),
                container.container_size || null
              )
              .input("vehicle_sequence", sql.Int, sequence++).query(`
                INSERT INTO transporter_details (
                  request_id, transporter_name, vehicle_number, driver_name, driver_contact,
                  additional_charges, service_charges, total_charge, container_no, line,
                  seal_no, vehicle_sequence, seal1, seal2, container_total_weight,
                  cargo_total_weight, container_type, container_size
                )
                OUTPUT INSERTED.id, INSERTED.container_no
                VALUES (
                  @request_id, @transporter_name, @vehicle_number, @driver_name, @driver_contact,
                  @additional_charges, @service_charges, @total_charge, @container_no, @line,
                  @seal_no, @vehicle_sequence, @seal1, @seal2, @container_total_weight,
                  @cargo_total_weight, @container_type, @container_size
                )
              `);
          }

          if (result.recordset.length > 0) {
            containerResults.push({
              id: result.recordset[0].id,
              container_no: result.recordset[0].container_no,
            });
          }
        }

        results.push({
          vehicle_number: vc.vehicle_number,
          containers: containerResults,
          containerCount: containerResults.length,
        });
      }

      console.log("Batch container assignment completed");
      return results;
    } catch (error) {
      console.error("Batch container assignment error:", error);
      throw error;
    }
  },

  // Original createTransporter method (simplified and fixed)
  createTransporter: async (transportRequestId, transporterData) => {
    try {
      const nextSequence = await transporterModel.getNextSequenceNumber(
        transportRequestId
      );
      const sequenceToUse = transporterData.vehicle_sequence || nextSequence;

      const {
        transporter_name,
        vehicle_number,
        driver_name,
        driver_contact,
        license_number,
        license_expiry,
        additional_charges,
        service_charges,
        total_charge,
        container_no,
        line,
        seal_no,
        seal1,
        seal2,
        container_total_weight,
        cargo_total_weight,
        container_type,
        container_size,
      } = transporterData;

      const result = await pool
        .request()
        .input("request_id", sql.Int, transportRequestId)
        .input("transporter_name", sql.NVarChar(255), transporter_name)
        .input("vehicle_number", sql.NVarChar(50), vehicle_number)
        .input("driver_name", sql.NVarChar(255), driver_name)
        .input("driver_contact", sql.NVarChar(20), driver_contact)
        .input("license_number", sql.NVarChar(50), license_number || null)
        .input("license_expiry", sql.Date, license_expiry || null)
        .input(
          "additional_charges",
          sql.Decimal(12, 2),
          additional_charges || 0
        )
        .input(
          "service_charges",
          sql.NVarChar(sql.MAX),
          service_charges || null
        )
        .input("total_charge", sql.Decimal(12, 2), total_charge || 0)
        .input("container_no", sql.NVarChar(100), container_no || null)
        .input("line", sql.NVarChar(100), line || null)
        .input("seal_no", sql.NVarChar(100), seal_no || null)
        .input("seal1", sql.NVarChar(100), seal1 || null)
        .input("seal2", sql.NVarChar(100), seal2 || null)
        .input(
          "container_total_weight",
          sql.Decimal(12, 2),
          container_total_weight || null
        )
        .input(
          "cargo_total_weight",
          sql.Decimal(12, 2),
          cargo_total_weight || null
        )
        .input("container_type", sql.NVarChar(50), container_type || null)
        .input("container_size", sql.NVarChar(20), container_size || null)
        .input("vehicle_sequence", sql.Int, sequenceToUse).query(`
          INSERT INTO transporter_details (
            request_id, transporter_name, vehicle_number, driver_name, driver_contact,
            license_number, license_expiry, additional_charges, service_charges, total_charge,
            container_no, line, seal_no, vehicle_sequence, seal1, seal2, 
            container_total_weight, cargo_total_weight, container_type, container_size
          )
          OUTPUT INSERTED.*
          VALUES (
            @request_id, @transporter_name, @vehicle_number, @driver_name, @driver_contact,
            @license_number, @license_expiry, @additional_charges, @service_charges, @total_charge,
            @container_no, @line, @seal_no, @vehicle_sequence, @seal1, @seal2,
            @container_total_weight, @cargo_total_weight, @container_type, @container_size
          )
        `);

      // Update the transport request status to 'Vehicle Assigned'
      await pool.request().input("request_id", sql.Int, transportRequestId)
        .query(`
          UPDATE transport_requests
          SET status = 'Vehicle Assigned', updated_at = GETDATE()
          WHERE id = @request_id
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Create transporter error:", error);
      throw error;
    }
  },

  // Update existing transporter details
  updateTransporter: async (id, transporterData) => {
    try {
      const currentRecord = await pool.request().input("id", sql.Int, id)
        .query(`
          SELECT request_id, vehicle_sequence, container_no 
          FROM transporter_details 
          WHERE id = @id
        `);

      if (currentRecord.recordset.length === 0) {
        throw new Error("Transporter record not found");
      }

      const {
        request_id,
        vehicle_sequence,
        container_no: currentContainerNo,
      } = currentRecord.recordset[0];

      let containerHistoryResult = {
        history: [],
        lastUsed: null,
        totalUses: 0,
      };
      if (
        transporterData.container_no &&
        transporterData.container_no !== currentContainerNo
      ) {
        containerHistoryResult = await transporterModel.checkContainerHistory(
          transporterData.container_no,
          request_id
        );
      }

      let sequenceToUse = vehicle_sequence;
      if (
        transporterData.vehicle_sequence &&
        transporterData.vehicle_sequence !== vehicle_sequence
      ) {
        const conflictCheck = await pool
          .request()
          .input("request_id", sql.Int, request_id)
          .input("vehicle_sequence", sql.Int, transporterData.vehicle_sequence)
          .input("id", sql.Int, id).query(`
            SELECT id FROM transporter_details
            WHERE request_id = @request_id 
            AND vehicle_sequence = @vehicle_sequence
            AND id != @id
          `);

        if (conflictCheck.recordset.length > 0) {
          sequenceToUse = await transporterModel.getNextSequenceNumber(
            request_id
          );
        } else {
          sequenceToUse = transporterData.vehicle_sequence;
        }
      }

      const {
        transporter_name,
        vehicle_number,
        driver_name,
        driver_contact,
        license_number,
        license_expiry,
        additional_charges,
        service_charges,
        total_charge,
        container_no,
        line,
        seal_no,
        seal1,
        seal2,
        container_total_weight,
        cargo_total_weight,
        container_type,
        container_size,
        vin_no,
      } = transporterData;

      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("transporter_name", sql.NVarChar(255), transporter_name)
        .input("vehicle_number", sql.NVarChar(50), vehicle_number)
        .input("driver_name", sql.NVarChar(255), driver_name)
        .input("driver_contact", sql.NVarChar(20), driver_contact)
        .input("license_number", sql.NVarChar(50), license_number || null)
        .input("license_expiry", sql.Date, license_expiry || null)
        .input(
          "additional_charges",
          sql.Decimal(12, 2),
          additional_charges || 0
        )
        .input("service_charges", sql.NVarChar(sql.MAX), service_charges)
        .input("total_charge", sql.Decimal(12, 2), total_charge)
        .input("container_no", sql.NVarChar(100), container_no || null)
        .input("line", sql.NVarChar(100), line || null)
        .input("seal_no", sql.NVarChar(100), seal_no || null)
        .input("seal1", sql.NVarChar(100), seal1 || null)
        .input("seal2", sql.NVarChar(100), seal2 || null)
        .input(
          "container_total_weight",
          sql.Decimal(12, 2),
          container_total_weight || null
        )
        .input(
          "cargo_total_weight",
          sql.Decimal(12, 2),
          cargo_total_weight || null
        )
        .input("container_type", sql.NVarChar(50), container_type || null)
        .input("container_size", sql.NVarChar(20), container_size || null)
        .input("vehicle_sequence", sql.Int, sequenceToUse)
        .input("vin_no", sql.NVarChar(100), vin_no || null).query(`
          UPDATE transporter_details 
          SET 
            transporter_name = @transporter_name,
            vehicle_number = @vehicle_number,
            driver_name = @driver_name,
            driver_contact = @driver_contact,
            license_number = @license_number,
            license_expiry = @license_expiry,
            additional_charges = @additional_charges,
            service_charges = @service_charges,
            total_charge = @total_charge,
            container_no = @container_no,
            line = @line,
            seal_no = @seal_no,
            seal1 = @seal1,
            seal2 = @seal2,
            container_total_weight = @container_total_weight,
            cargo_total_weight = @cargo_total_weight,
            container_type = @container_type,
            container_size = @container_size,
            updated_at = GETDATE(),
            vehicle_sequence = @vehicle_sequence,
            vin_no = @vin_no
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      const updatedRow =
        result.recordset[0] ||
        (
          await pool
            .request()
            .input("id", sql.Int, id)
            .query(`SELECT * FROM transporter_details WHERE id = @id`)
        ).recordset[0];

      return {
        transporterDetails: updatedRow,
        containerHistory: containerHistoryResult.history,
        lastUsedIn: containerHistoryResult.lastUsed,
        containerAlreadyUsed: containerHistoryResult.totalUses > 0,
        totalPreviousUses: containerHistoryResult.totalUses,
        message:
          containerHistoryResult.totalUses > 0
            ? `Warning: Container ${container_no} was last used in Request #${containerHistoryResult.lastUsed.request_id} (Total: ${containerHistoryResult.totalUses} previous use(s))`
            : null,
      };
    } catch (error) {
      throw error;
    }
  },

  // Update container details
  updateContainerDetails: async (id, containerData) => {
    try {
      const currentRecord = await pool.request().input("id", sql.Int, id)
        .query(`
          SELECT request_id, container_no 
          FROM transporter_details 
          WHERE id = @id
        `);

      if (currentRecord.recordset.length === 0) {
        throw new Error("Container record not found");
      }

      const { request_id, container_no: currentContainerNo } =
        currentRecord.recordset[0];

      let containerHistoryResult = {
        history: [],
        lastUsed: null,
        totalUses: 0,
      };
      if (
        containerData.container_no &&
        containerData.container_no !== currentContainerNo
      ) {
        containerHistoryResult = await transporterModel.checkContainerHistory(
          containerData.container_no,
          request_id
        );
      }

      const {
        container_no,
        line,
        seal_no,
        number_of_containers,
        seal1,
        seal2,
        container_total_weight,
        cargo_total_weight,
        container_type,
        container_size,
        vehicle_number,
      } = containerData;

      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .input("container_no", sql.NVarChar(100), container_no || null)
        .input("line", sql.NVarChar(100), line || null)
        .input("seal_no", sql.NVarChar(100), seal_no || null)
        .input("number_of_containers", sql.Int, number_of_containers || null)
        .input("seal1", sql.NVarChar(100), seal1 || null)
        .input("seal2", sql.NVarChar(100), seal2 || null)
        .input(
          "container_total_weight",
          sql.Decimal(12, 2),
          container_total_weight || null
        )
        .input(
          "cargo_total_weight",
          sql.Decimal(12, 2),
          cargo_total_weight || null
        )
        .input("container_type", sql.NVarChar(50), container_type || null)
        .input("container_size", sql.NVarChar(20), container_size || null)
        .input("vehicle_number", sql.NVarChar(50), vehicle_number || null)
        .query(`
          UPDATE transporter_details 
          SET 
            container_no = @container_no,
            line = @line,
            seal_no = @seal_no,
            number_of_containers = @number_of_containers,
            seal1 = @seal1,
            seal2 = @seal2,
            container_total_weight = @container_total_weight,
            cargo_total_weight = @cargo_total_weight,
            container_type = @container_type,
            container_size = @container_size,
            vehicle_number = COALESCE(@vehicle_number, vehicle_number),
            updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      return {
        containerDetails: result.recordset[0],
        containerHistory: containerHistoryResult.history,
        lastUsedIn: containerHistoryResult.lastUsed,
        containerAlreadyUsed: containerHistoryResult.totalUses > 0,
        totalPreviousUses: containerHistoryResult.totalUses,
        message:
          containerHistoryResult.totalUses > 0
            ? `Warning: Container ${container_no} was last used in Request #${containerHistoryResult.lastUsed.request_id} (Total: ${containerHistoryResult.totalUses} previous use(s))`
            : null,
      };
    } catch (error) {
      throw error;
    }
  },

  // Add multiple containers to a vehicle (improved)
  addContainersToVehicle: async (requestId, vehicleNumber, containersData) => {
    try {
      const vehicleResult = await pool
        .request()
        .input("request_id", sql.Int, requestId)
        .input("vehicle_number", sql.NVarChar(50), vehicleNumber).query(`
          SELECT 
            id, transporter_name, vehicle_number, driver_name, driver_contact,
            additional_charges, service_charges, total_charge
          FROM transporter_details 
          WHERE request_id = @request_id AND vehicle_number = @vehicle_number
          ORDER BY vehicle_sequence
          OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
        `);

      if (vehicleResult.recordset.length === 0) {
        throw new Error("Vehicle not found for this request");
      }

      const vehicleDetails = vehicleResult.recordset[0];
      const results = [];

      // Get starting sequence for batch insert
      let currentSequence = await transporterModel.getNextSequenceNumber(
        requestId
      );

      for (const containerData of containersData) {
        let containerHistoryResult = {
          history: [],
          lastUsed: null,
          totalUses: 0,
        };
        if (containerData.container_no) {
          containerHistoryResult = await transporterModel.checkContainerHistory(
            containerData.container_no,
            requestId
          );
        }

        const {
          container_no,
          line,
          seal_no,
          seal1,
          seal2,
          container_total_weight,
          cargo_total_weight,
          container_type,
          container_size,
        } = containerData;

        const insertResult = await pool
          .request()
          .input("request_id", sql.Int, requestId)
          .input(
            "transporter_name",
            sql.NVarChar(255),
            vehicleDetails.transporter_name
          )
          .input(
            "vehicle_number",
            sql.NVarChar(50),
            vehicleDetails.vehicle_number
          )
          .input("driver_name", sql.NVarChar(255), vehicleDetails.driver_name)
          .input(
            "driver_contact",
            sql.NVarChar(20),
            vehicleDetails.driver_contact
          )
          .input(
            "additional_charges",
            sql.Decimal(12, 2),
            vehicleDetails.additional_charges || 0
          )
          .input(
            "service_charges",
            sql.NVarChar(sql.MAX),
            vehicleDetails.service_charges
          )
          .input(
            "total_charge",
            sql.Decimal(12, 2),
            vehicleDetails.total_charge
          )
          .input("container_no", sql.NVarChar(100), container_no || null)
          .input("line", sql.NVarChar(100), line || null)
          .input("seal_no", sql.NVarChar(100), seal_no || null)
          .input("seal1", sql.NVarChar(100), seal1 || null)
          .input("seal2", sql.NVarChar(100), seal2 || null)
          .input(
            "container_total_weight",
            sql.Decimal(12, 2),
            container_total_weight || null
          )
          .input(
            "cargo_total_weight",
            sql.Decimal(12, 2),
            cargo_total_weight || null
          )
          .input("container_type", sql.NVarChar(50), container_type || null)
          .input("container_size", sql.NVarChar(20), container_size || null)
          .input("vehicle_sequence", sql.Int, currentSequence).query(`
            INSERT INTO transporter_details (
              request_id, transporter_name, vehicle_number, driver_name, driver_contact,
              additional_charges, service_charges, total_charge, container_no, line,
              seal_no, vehicle_sequence, seal1, seal2, container_total_weight,
              cargo_total_weight, container_type, container_size
            )
            OUTPUT INSERTED.*
            VALUES (
              @request_id, @transporter_name, @vehicle_number, @driver_name, @driver_contact,
              @additional_charges, @service_charges, @total_charge, @container_no, @line,
              @seal_no, @vehicle_sequence, @seal1, @seal2, @container_total_weight,
              @cargo_total_weight, @container_type, @container_size
            )
          `);

        results.push({
          containerDetails: insertResult.recordset[0],
          containerHistory: containerHistoryResult.history,
          lastUsedIn: containerHistoryResult.lastUsed,
          containerAlreadyUsed: containerHistoryResult.totalUses > 0,
          totalPreviousUses: containerHistoryResult.totalUses,
          message:
            containerHistoryResult.totalUses > 0
              ? `Warning: Container ${container_no} was last used in Request #${containerHistoryResult.lastUsed.request_id} (Total: ${containerHistoryResult.totalUses} previous use(s))`
              : null,
        });

        currentSequence++;
      }

      return {
        containers: results,
        hasWarnings: results.some((r) => r.containerAlreadyUsed),
      };
    } catch (error) {
      throw error;
    }
  },

  getcontainerbyrequestid: async (requestId) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId).query(`
          SELECT 
            td.*, tr.status as request_status, tr.consignee, tr.consigner,
            u.name as customer_name, u.email as customer_email
          FROM transporter_details td
          INNER JOIN transport_requests tr ON td.request_id = tr.id
          INNER JOIN users u ON tr.customer_id = u.id
          WHERE td.request_id = @request_id
          ORDER BY td.vehicle_sequence
        `);
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },

  deleteTransporter: async (id) => {
    try {
      const result = await pool.request().input("id", sql.Int, id).query(`
          DELETE FROM transporter_details 
          OUTPUT DELETED.*
          WHERE id = @id
        `);
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  },

  getAllTransporters: async () => {
    try {
      const result = await pool.request().query(`
        SELECT 
          td.*, tr.status as request_status, tr.consignee, tr.consigner,
          u.name as customer_name, u.email as customer_email
        FROM transporter_details td
        INNER JOIN transport_requests tr ON td.request_id = tr.id
        INNER JOIN users u ON tr.customer_id = u.id
        ORDER BY td.created_at DESC
      `);
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },

  checkTransportRequestExists: async (requestId) => {
    try {
      const result = await pool.request().input("requestId", sql.Int, requestId)
        .query(`
          SELECT id, status 
          FROM transport_requests 
          WHERE id = @requestId
        `);
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  },

  checkTransporterExists: async (requestId) => {
    try {
      const result = await pool.request().input("requestId", sql.Int, requestId)
        .query(`
          SELECT id 
          FROM transporter_details 
          WHERE request_id = @requestId
        `);
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },

  getContainersByVehicleNumber: async (requestId, vehicleNumber) => {
    try {
      const result = await pool
        .request()
        .input("request_id", sql.Int, requestId)
        .input("vehicle_number", sql.NVarChar(50), vehicleNumber).query(`
          SELECT * 
          FROM transporter_details 
          WHERE request_id = @request_id AND vehicle_number = @vehicle_number
          ORDER BY vehicle_sequence
        `);
      return result.recordset;
    } catch (error) {
      throw error;
    }
  },

  deleteContainer: async (containerId) => {
    try {
      const result = await pool.request().input("id", sql.Int, containerId)
        .query(`
          DELETE FROM transporter_details 
          OUTPUT DELETED.*
          WHERE id = @id
        `);
      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  },
};

module.exports = transporterModel;
