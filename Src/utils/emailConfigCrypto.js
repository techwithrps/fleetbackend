const crypto = require("crypto");

const deriveKey = () => {
  const secret = process.env.EMAIL_CONFIG_SECRET || "";
  if (!secret) {
    throw new Error(
      "EMAIL_CONFIG_SECRET is missing. Set it to enable email password encryption."
    );
  }
  // Derive a stable 32-byte key from any secret string.
  return crypto.createHash("sha256").update(secret, "utf8").digest();
};

const encryptToBuffer = (plainText) => {
  if (plainText === undefined || plainText === null || String(plainText) === "") {
    return null;
  }

  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const cipherText = Buffer.concat([
    cipher.update(String(plainText), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Layout: [1 byte version][12 iv][16 tag][cipherText]
  return Buffer.concat([Buffer.from([1]), iv, tag, cipherText]);
};

const decryptFromBuffer = (buffer) => {
  if (!buffer) return null;
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const version = data.readUInt8(0);
  if (version !== 1) {
    throw new Error("Unsupported EMAIL_CONFIG encryption version");
  }

  const iv = data.subarray(1, 13);
  const tag = data.subarray(13, 29);
  const cipherText = data.subarray(29);

  const key = deriveKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return plain.toString("utf8");
};

module.exports = {
  encryptToBuffer,
  decryptFromBuffer,
};

