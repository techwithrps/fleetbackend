const otpStore = new Map(); // email => { otp, expiresAt }

// Normalize email to lowercase for consistent lookup
const normalizeEmail = (email) => email.toLowerCase().trim();

const isDev = process.env.NODE_ENV === "development";

const saveOtp = (email, otp, expiresAt) => {
  const normalizedEmail = normalizeEmail(email);
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`Saving OTP for ${normalizedEmail}, expires at ${new Date(expiresAt)}`);
  }
  return otpStore.set(normalizedEmail, { otp, expiresAt });
};

const getOtp = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const data = otpStore.get(normalizedEmail);
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`Retrieved OTP for ${normalizedEmail}: ${data ? "Found" : "Not found"}`);
  }
  return data;
};

const deleteOtp = (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`Deleting OTP for ${normalizedEmail}`);
  }
  return otpStore.delete(normalizedEmail);
};

module.exports = {
  saveOtp,
  getOtp,
  deleteOtp,
};
