const { pool, sql } = require("../config/dbconfig");
const bcrypt = require("bcryptjs");

class User {
  static async findByEmail(email) {
    try {
      await pool.connect();
      const result = await pool
        .request()
        .input("email", sql.VarChar, email)
        .query(`
          SELECT u.*, r.role_name as role 
          FROM users u 
          LEFT JOIN roles r ON u.role_id = r.id 
          WHERE u.email = @email
        `);

      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Resolve role name to ID if needed
      let roleId = userData.role_id;
      if (!roleId && userData.role) {
        const roleResult = await pool.request()
          .input("roleName", sql.VarChar, userData.role)
          .query("SELECT id FROM roles WHERE role_name = @roleName");
        if (roleResult.recordset.length > 0) {
          roleId = roleResult.recordset[0].id;
        }
      }

      await pool.connect();
      const result = await pool
        .request()
        .input("name", sql.VarChar, userData.name)
        .input("email", sql.VarChar, userData.email)
        .input("phone", sql.VarChar, userData.phone)
        .input("password", sql.VarChar, hashedPassword)
        .input("role_id", sql.Int, roleId)
        .query(
          `
          INSERT INTO users (name, email, phone, password, role_id)
          OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.phone, INSERTED.role_id
          VALUES (@name, @email, @phone, @password, @role_id)
        `
        );

      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async findById(id) {
    try {
      await pool.connect();
      const result = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
          SELECT u.id, u.name, u.email, u.phone, r.role_name as role 
          FROM users u 
          LEFT JOIN roles r ON u.role_id = r.id 
          WHERE u.id = @id
        `);

      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
