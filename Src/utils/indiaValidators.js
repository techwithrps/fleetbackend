const normalize = (value) =>
  typeof value === "string" ? value.trim() : value;

const normalizeUpper = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

const isEmpty = (value) =>
  value === undefined || value === null || String(value).trim() === "";

const toUpperTrim = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

const toLowerTrim = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

const compactVehicleNo = (value) =>
  typeof value === "string"
    ? value.replace(/[\s-]/g, "").toUpperCase()
    : value;

const compactDlNo = (value) =>
  typeof value === "string"
    ? value.replace(/[\s/-]/g, "").toUpperCase()
    : value;

const normalizeIndianMobile = (value) => {
  if (value === undefined || value === null) return value;
  const digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }
  return digits;
};

const getValue = (data, ...keys) => {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }
  return undefined;
};

const isValidEmail = (value) =>
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);

const isValidIndianMobile = (value) => {
  const digits = String(value).replace(/\D/g, "");
  const normalized = digits.startsWith("91") && digits.length === 12
    ? digits.slice(2)
    : digits;
  return /^[6-9]\d{9}$/.test(normalized);
};

const isValidIndianPhone = (value) => {
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 12;
};

const isValidPan = (value) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);

const isValidTan = (value) => /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(value);

const isValidGstin = (value) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(value);

const isValidIfsc = (value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value);

const isValidPinCode = (value) => /^[1-9][0-9]{5}$/.test(value);

const isValidVehicleNo = (value) => {
  const compact = String(value).replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/.test(compact);
};

const isValidVin = (value) =>
  /^[A-HJ-NPR-Z0-9]{17}$/.test(String(value).toUpperCase());

const isValidDlNo = (value) => {
  const compact = String(value).replace(/[\s/-]/g, "").toUpperCase();
  return /^[A-Z]{2}[0-9]{2}[0-9A-Z]{7,15}$/.test(compact);
};

const validateVendorPayload = (data) => {
  const errors = [];

  if (!isEmpty(data.pan) && !isValidPan(normalizeUpper(data.pan))) {
    errors.push("Invalid PAN format. Expected: AAAAA9999A");
  }
  if (!isEmpty(data.tan) && !isValidTan(normalizeUpper(data.tan))) {
    errors.push("Invalid TAN format. Expected: AAAA99999A");
  }
  if (!isEmpty(data.gstin) && !isValidGstin(normalizeUpper(data.gstin))) {
    errors.push("Invalid GSTIN format.");
  }
  if (!isEmpty(data.ifsc) && !isValidIfsc(normalizeUpper(data.ifsc))) {
    errors.push("Invalid IFSC format.");
  }
  if (!isEmpty(data.pin_code) && !isValidPinCode(normalize(data.pin_code))) {
    errors.push("Invalid PIN code. It must be 6 digits.");
  }

  ["email_id1", "email_id2"].forEach((field) => {
    if (!isEmpty(data[field]) && !isValidEmail(normalize(data[field]))) {
      errors.push(`Invalid ${field} format.`);
    }
  });

  if (!isEmpty(data.mobile_no) && !isValidIndianMobile(data.mobile_no)) {
    errors.push("Invalid mobile number. Use a valid 10-digit Indian mobile.");
  }
  if (!isEmpty(data.contact_no) && !isValidIndianPhone(data.contact_no)) {
    errors.push("Invalid contact number.");
  }

  return errors;
};

const validateDriverPayload = (data) => {
  const errors = [];

  if (!isEmpty(data.email_id) && !isValidEmail(normalize(data.email_id))) {
    errors.push("Invalid driver email format.");
  }
  if (!isEmpty(data.mobile_no) && !isValidIndianMobile(data.mobile_no)) {
    errors.push("Invalid driver mobile number.");
  }
  ["contact_no", "phone_no", "emerg_phone"].forEach((field) => {
    if (!isEmpty(data[field]) && !isValidIndianPhone(data[field])) {
      errors.push(`Invalid ${field} format.`);
    }
  });
  if (!isEmpty(data.dl_no) && !isValidDlNo(data.dl_no)) {
    errors.push("Invalid driving license number format.");
  }

  return errors;
};

const validateEquipmentPayload = (data) => {
  const errors = [];
  const equipmentNo = getValue(data, "EQUIPMENT_NO", "equipment_no");
  const vinNo = getValue(data, "VIN_NO", "vin_no");
  const insuranceNo = getValue(data, "INSURANCE_NO", "insurance_no");

  if (!isEmpty(equipmentNo) && !isValidVehicleNo(equipmentNo)) {
    errors.push("Invalid vehicle number format. Example: UP78CN6949");
  }
  if (!isEmpty(vinNo) && !isValidVin(vinNo)) {
    errors.push("Invalid VIN format. VIN must be 17 characters.");
  }
  if (!isEmpty(insuranceNo) && String(insuranceNo).trim().length < 6) {
    errors.push("Invalid insurance number. Please enter a valid policy number.");
  }

  return errors;
};

const normalizeVendorPayload = (data) => ({
  ...data,
  vendor_name: normalize(data.vendor_name),
  vendor_code: toUpperTrim(data.vendor_code),
  city: normalize(data.city),
  state_code: toUpperTrim(data.state_code),
  country: normalize(data.country),
  email_id1: toLowerTrim(data.email_id1),
  email_id2: toLowerTrim(data.email_id2),
  contact_no: normalizeIndianMobile(data.contact_no),
  mobile_no: normalizeIndianMobile(data.mobile_no),
  pan: toUpperTrim(data.pan),
  tan: toUpperTrim(data.tan),
  ifsc: toUpperTrim(data.ifsc),
  gstin: toUpperTrim(data.gstin),
  pin_code: normalize(data.pin_code),
});

const normalizeDriverPayload = (data) => ({
  ...data,
  driver_name: normalize(data.driver_name),
  email_id: toLowerTrim(data.email_id),
  vehicle_no: compactVehicleNo(data.vehicle_no),
  mobile_no: normalizeIndianMobile(data.mobile_no),
  contact_no: normalizeIndianMobile(data.contact_no),
  phone_no: normalizeIndianMobile(data.phone_no),
  emerg_phone: normalizeIndianMobile(data.emerg_phone),
  dl_no: compactDlNo(data.dl_no),
});

const normalizeEquipmentPayload = (data) => ({
  ...data,
  EQUIPMENT_NO: compactVehicleNo(getValue(data, "EQUIPMENT_NO", "equipment_no")),
  VIN_NO: toUpperTrim(getValue(data, "VIN_NO", "vin_no")),
  INSURANCE_NO: normalize(getValue(data, "INSURANCE_NO", "insurance_no")),
  ENG_NO: toUpperTrim(data.ENG_NO),
  ENG_TYPE: toUpperTrim(data.ENG_TYPE),
  RTO: toUpperTrim(data.RTO),
  MANUFACTURER: toUpperTrim(data.MANUFACTURER),
});

module.exports = {
  validateVendorPayload,
  validateDriverPayload,
  validateEquipmentPayload,
  normalizeVendorPayload,
  normalizeDriverPayload,
  normalizeEquipmentPayload,
};
