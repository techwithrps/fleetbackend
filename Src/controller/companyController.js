const CompanyModel = require("../models/CompanyModel");

exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await CompanyModel.getAllCompanies();
    res.status(200).json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const company = await CompanyModel.getCompanyById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    // Convert logo blob to base64 if needed by frontend
    if (company.LOGO_BLOB) {
      company.LOGO_BASE64 = `data:${company.LOGO_MIME_TYPE};base64,${company.LOGO_BLOB.toString('base64')}`;
      delete company.LOGO_BLOB; // Remove binary data from standard response
    }
    
    res.status(200).json(company);
  } catch (error) {
    console.error("Error fetching company by id:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const data = req.body;
    const file = req.file;

    if (!data.COMPANY_NAME) {
      return res.status(400).json({ message: "COMPANY_NAME is required" });
    }

    const result = await CompanyModel.createCompany(data, file);
    res.status(201).json({ message: "Company created successfully", companyId: result.COMPANY_ID });
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const data = req.body;
    const file = req.file;
    const id = req.params.id;

    if (!data.COMPANY_NAME) {
      return res.status(400).json({ message: "COMPANY_NAME is required" });
    }

    await CompanyModel.updateCompany(id, data, file);
    res.status(200).json({ message: "Company updated successfully" });
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    await CompanyModel.deleteCompany(req.params.id);
    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
