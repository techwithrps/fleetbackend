const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const EmailConfigModel = require("../models/EmailConfigModel");

let cached = { transporter: null, from: null, loadedAt: 0 };
const CACHE_MS = 60_000;

const buildFrom = (cfg) => {
  const fromEmail = cfg?.from_email || process.env.EMAIL_USER;
  const fromName = cfg?.from_name || "Fleet App";
  if (!fromEmail) return null;
  return `${fromName} <${fromEmail}>`;
};

const createTransporterFromEnv = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.EMAIL_USER && process.env.EMAIL_PASS
      ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      : undefined,
  });

const getMailer = async () => {
  const now = Date.now();
  if (cached.transporter && now - cached.loadedAt < CACHE_MS) {
    return cached;
  }

  try {
    const cfg = await EmailConfigModel.getActiveWithPassword();
    if (cfg?.smtp_host && cfg?.smtp_port && cfg?.smtp_user && cfg?.smtp_pass) {
      cached = {
        transporter: nodemailer.createTransport({
          host: cfg.smtp_host,
          port: cfg.smtp_port,
          secure: !!cfg.smtp_secure,
          auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
        }),
        from: buildFrom(cfg),
        loadedAt: now,
      };
      return cached;
    }
  } catch (error) {
    // Fallback to env if DB config is not available.
    console.error("Mailer DB config error (fallback to env):", error.message);
  }

  cached = {
    transporter: createTransporterFromEnv(),
    from: buildFrom(null),
    loadedAt: now,
  };
  return cached;
};

module.exports = { getMailer };
