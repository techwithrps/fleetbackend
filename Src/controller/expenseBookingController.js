const ExpenseBookingModel = require("../models/ExpenseBookingModel");

exports.createExpenseBooking = async (req, res) => {
  try {
    const data = req.body;
    
    // Parse expenseRows if it comes as a JSON string (due to multipart/form-data)
    if (data.expenseRows && typeof data.expenseRows === "string") {
      try {
        data.expenseRows = JSON.parse(data.expenseRows);
      } catch (e) {
        console.warn("Could not parse expenseRows JSON");
      }
    }

    let document = null;
    if (req.file) {
      document = {
        buffer: req.file.buffer,
        name: req.file.originalname,
        type: req.file.mimetype,
      };
    }

    const result = await ExpenseBookingModel.create(data, document);
    res.status(201).json({
      success: true,
      message: "Expense Booking created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Create expense booking controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create Expense Booking",
      error: error.message,
    });
  }
};

exports.getAllExpenseBookings = async (req, res) => {
  try {
    const result = await ExpenseBookingModel.getAll();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get all expense bookings controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Expense Bookings",
      error: error.message,
    });
  }
};

exports.getExpenseBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ExpenseBookingModel.getById(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Expense Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get expense booking by id controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Expense Booking",
      error: error.message,
    });
  }
};
