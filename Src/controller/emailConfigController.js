const nodemailer = require("nodemailer");
const EmailConfigModel = require("../models/EmailConfigModel");

const getActiveConfig = async (req, res) => {
  try {
    const cfg = await EmailConfigModel.getActive();
    return res.json({ success: true, data: cfg });
  } catch (error) {
    console.error("Get email config error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const upsertActiveConfig = async (req, res) => {
  try {
    const payload = req.body || {};
    const id = await EmailConfigModel.upsertActive({
      provider: payload.provider,
      smtp_host: payload.smtp_host,
      smtp_port: payload.smtp_port ? Number(payload.smtp_port) : null,
      smtp_secure: !!payload.smtp_secure,
      smtp_user: payload.smtp_user,
      smtp_password: payload.smtp_password || null,
      from_email: payload.from_email,
      from_name: payload.from_name,
      reply_to: payload.reply_to,
    });

    const cfg = await EmailConfigModel.getActive();
    return res.json({ success: true, id, data: cfg });
  } catch (error) {
    console.error("Upsert email config error:", error);
    const message =
      String(error?.message || "").includes("EMAIL_CONFIG_SECRET")
        ? "EMAIL_CONFIG_SECRET is not set on server"
        : "Server error";
    return res.status(500).json({ success: false, message });
  }
};

const testEmail = async (req, res) => {
  try {
    const { to, subject, text } = req.body || {};
    if (!to) {
      return res.status(400).json({ success: false, message: "Missing 'to'" });
    }

    const cfg = await EmailConfigModel.getActiveWithPassword();
    if (!cfg || !cfg.smtp_host || !cfg.smtp_port || !cfg.smtp_user || !cfg.smtp_pass) {
      return res.status(400).json({
        success: false,
        message: "Email config is incomplete. Please set SMTP fields and password.",
      });
    }

    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: cfg.smtp_port,
      secure: !!cfg.smtp_secure,
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });

    const fromEmail = cfg.from_email || cfg.smtp_user;
    const fromName = cfg.from_name || "Fleet App";

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      replyTo: cfg.reply_to || undefined,
      subject: subject || "Test Email",
      text: text || "This is a test email from Fleet App.",
    });

    return res.json({ success: true, message: "Test email sent" });
  } catch (error) {
    console.error("Test email error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    });
  }
};

module.exports = {
  getActiveConfig,
  upsertActiveConfig,
  testEmail,
};

