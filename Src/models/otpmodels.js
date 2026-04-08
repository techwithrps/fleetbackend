const otpStore = new Map(); // email => { otp, expiresAt }

// Normalize email to lowercase for consistent lookup
const normalizeEmail = (email) => email.toLowerCase().trim();

saveOtp = (email, otp, expiresAt) => {
  const normalizedEmail = normalizeEmail(email);
  console.log(`Saving OTP for ${normalizedEmail}, expires at ${new Date(expiresAt)}`);
  return otpStore.set(normalizedEmail, { otp, expiresAt });
};

getOtp = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const data = otpStore.get(normalizedEmail);
  console.log(`Retrieved OTP for ${normalizedEmail}: ${data ? 'Found' : 'Not found'}`);
  return data;
};

deleteOtp = (email) => {
  const normalizedEmail = normalizeEmail(email);
  console.log(`Deleting OTP for ${normalizedEmail}`);
  return otpStore.delete(normalizedEmail);
};

module.exports = {
  saveOtp,
  getOtp,
  deleteOtp
}
