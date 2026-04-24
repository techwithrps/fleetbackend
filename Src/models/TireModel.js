const { pool, sql } = require("../config/dbconfig");
const { applyLocationFilter } = require("../utils/queryHelper");

class TireModel {
  static async getAll(user = null) {
    try {
      const request = pool.request();
      const filter = applyLocationFilter(request, user);
      
      const result = await request.query(`
        SELECT *
        FROM TIRE_MASTER
        WHERE 1=1 ${filter}
        ORDER BY TIRE_NO
      `);

      return result.recordset;
    } catch (error) {
      console.error("Get all tires error:", error);
      throw error;
    }
  }

  static async getById(tireId, user = null) {
    try {
      const request = pool.request();
      const filter = applyLocationFilter(request, user);

      const result = await request
        .input("tire_id", sql.Numeric(18, 0), tireId)
        .query(`
          SELECT *
          FROM TIRE_MASTER
          WHERE TIRE_ID = @tire_id ${filter}
        `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error("Get tire by ID error:", error);
      throw error;
    }
  }

  static async getNextTireId() {
    try {
      const result = await pool.request().query(`
        SELECT ISNULL(MAX(TIRE_ID), 0) + 1 AS next_id
        FROM TIRE_MASTER
      `);

      return result.recordset[0].next_id;
    } catch (error) {
      console.error("Get next tire ID error:", error);
      throw error;
    }
  }

  static async create(data) {
    const transaction = new sql.Transaction(pool);

    try {
      const nextId = await this.getNextTireId();

      await transaction.begin();

      const request = new sql.Request(transaction);

      await request
        .input("tire_id", sql.Numeric(18, 0), nextId)
        .input("terminal_id", sql.Numeric(18, 0), data.terminal_id || null)
        .input("tire_no", sql.VarChar(50), data.tire_no)
        .input("company", sql.VarChar(50), data.company || null)
        .input(
          "purchase_date",
          sql.Date,
          data.purchase_date ? new Date(data.purchase_date) : null
        )
        .input("status", sql.Char(2), data.status || "NW")
        .input("km_run", sql.Numeric(18, 2), data.km_run || null)
        .input("warranty_years", sql.Int, data.warranty_years || null)
        .input("warranty_km", sql.Numeric(18, 2), data.warranty_km || null)
        .input(
          "purchase_with_tax",
          sql.Numeric(18, 2),
          data.purchase_with_tax || null
        )
        .input(
          "purchase_without_tax",
          sql.Numeric(18, 2),
          data.purchase_without_tax || null
        )
        .input("remarks", sql.VarChar(150), data.remarks || null)
        .input("created_by", sql.VarChar(30), data.created_by || null)
        .input("created_on", sql.DateTime, new Date())
        .query(`
          INSERT INTO TIRE_MASTER (
            TIRE_ID,
            TERMINAL_ID,
            TIRE_NO,
            COMPANY,
            PURCHASE_DATE,
            STATUS,
            KM_RUN,
            WARRANTY_YEARS,
            WARRANTY_KM,
            PURCHASE_WITH_TAX,
            PURCHASE_WITHOUT_TAX,
            REMARKS,
            CREATED_BY,
            CREATED_ON
          )
          VALUES (
            @tire_id,
            @terminal_id,
            @tire_no,
            @company,
            @purchase_date,
            @status,
            @km_run,
            @warranty_years,
            @warranty_km,
            @purchase_with_tax,
            @purchase_without_tax,
            @remarks,
            @created_by,
            @created_on
          )
        `);

      await transaction.commit();

      return { success: true, tire_id: nextId };
    } catch (error) {
      await transaction.rollback();
      console.error("Create tire error:", error);
      throw error;
    }
  }

  static async update(tireId, data) {
    try {
      await pool
        .request()
        .input("tire_id", sql.Numeric(18, 0), tireId)
        .input("terminal_id", sql.Numeric(18, 0), data.terminal_id || null)
        .input("tire_no", sql.VarChar(50), data.tire_no)
        .input("company", sql.VarChar(50), data.company || null)
        .input(
          "purchase_date",
          sql.Date,
          data.purchase_date ? new Date(data.purchase_date) : null
        )
        .input("status", sql.Char(2), data.status || "NW")
        .input("km_run", sql.Numeric(18, 2), data.km_run || null)
        .input("warranty_years", sql.Int, data.warranty_years || null)
        .input("warranty_km", sql.Numeric(18, 2), data.warranty_km || null)
        .input(
          "purchase_with_tax",
          sql.Numeric(18, 2),
          data.purchase_with_tax || null
        )
        .input(
          "purchase_without_tax",
          sql.Numeric(18, 2),
          data.purchase_without_tax || null
        )
        .input("remarks", sql.VarChar(150), data.remarks || null)
        .input("updated_by", sql.VarChar(30), data.updated_by || null)
        .input("updated_on", sql.DateTime, new Date())
        .query(`
          UPDATE TIRE_MASTER
          SET
            TERMINAL_ID = @terminal_id,
            TIRE_NO = @tire_no,
            COMPANY = @company,
            PURCHASE_DATE = @purchase_date,
            STATUS = @status,
            KM_RUN = @km_run,
            WARRANTY_YEARS = @warranty_years,
            WARRANTY_KM = @warranty_km,
            PURCHASE_WITH_TAX = @purchase_with_tax,
            PURCHASE_WITHOUT_TAX = @purchase_without_tax,
            REMARKS = @remarks,
            UPDATED_BY = @updated_by,
            UPDATED_ON = @updated_on
          WHERE TIRE_ID = @tire_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Update tire error:", error);
      throw error;
    }
  }

  static async delete(tireId) {
    try {
      await pool
        .request()
        .input("tire_id", sql.Numeric(18, 0), tireId)
        .query(`
          DELETE FROM TIRE_MASTER
          WHERE TIRE_ID = @tire_id
        `);

      return { success: true };
    } catch (error) {
      console.error("Delete tire error:", error);
      throw error;
    }
  }

  static async search(searchText, user = null) {
    try {
      const request = pool.request();
      const filter = applyLocationFilter(request, user);

      const result = await request
        .input("search", sql.VarChar(100), `%${searchText}%`)
        .query(`
          SELECT *
          FROM TIRE_MASTER
          WHERE (TIRE_NO LIKE @search OR COMPANY LIKE @search) ${filter}
          ORDER BY TIRE_NO
        `);

      return result.recordset;
    } catch (error) {
      console.error("Search tires error:", error);
      throw error;
    }
  }
}

module.exports = TireModel;
