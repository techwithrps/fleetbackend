const { pool } = require("../config/dbconfig");
const bcrypt = require("bcryptjs");

class User {
  static async findByEmail(email) {
    try {
      await pool.connect();
      const result = await pool
        .request()
        .input("email", sql.VarChar, email)
        .query("SELECT * FROM users WHERE email = @email");

      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }

  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      await pool.connect();
      const result = await pool
        .request()
        .input("name", sql.VarChar, userData.name)
        .input("email", sql.VarChar, userData.email)
        .input("phone", sql.VarChar, userData.phone)
        .input("password", sql.VarChar, hashedPassword)
        .input("role", sql.VarChar, userData.role)
        .query(
          `
          INSERT INTO users (name, email, phone, password, role)
          OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.phone, INSERTED.role
          VALUES (@name, @email, @phone, @password, @role)
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
        .query("SELECT id, name, email, phone, role FROM users WHERE id = @id");

      return result.recordset[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
