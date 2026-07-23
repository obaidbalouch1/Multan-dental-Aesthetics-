/* =====================================================================
   Multan Dental Aesthetic — appointment request backend
   ---------------------------------------------------------------------
   Setup:
     1. cd server
     2. npm install
     3. cp .env.example .env   (then fill in real SMTP + email values)
     4. npm start               (or "npm run dev" to auto-restart on save)

   The frontend posts to  POST /api/appointments  and this server emails
   the request straight to the clinic's inbox. No database — email is
   the record. If that stops being enough later, this is the one file
   to extend into something that also writes to a database.
===================================================================== */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

const PORT = process.env.PORT || 5000;
const CLINIC_EMAIL = process.env.CLINIC_EMAIL;
const ALLOWED_ORIGINS = (process.env.FRONTEND_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim());

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10kb" })); // small, deliberate cap — this is a contact form, not a file upload

app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS,
    methods: ["POST", "GET"],
  })
);

// Appointment requests are sensitive to abuse (spam, inbox flooding) —
// keep this generous for real patients but tight against scripts.
const appointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests. Please try again later or call us at +92 311-7594193." },
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const SERVICES = [
  "Veneers & Smile Design",
  "Teeth Whitening",
  "Orthodontics / Invisalign",
  "Dental Implants",
  "Root Canal Therapy",
  "Pediatric Dentistry",
  "Not sure yet",
];

// Strip characters that don't belong in a single-line field and enforce
// a sane max length — this is what actually matters for a form like this
// (not "is it valid" so much as "can it be used to inject headers or
// blow up the email body").
function cleanField(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}

function validateAppointment(body) {
  const errors = [];
  const name = cleanField(body.name, 80);
  const phone = cleanField(body.phone, 20);
  const service = cleanField(body.service, 60);
  const date = cleanField(body.date, 20);
  const message = cleanField(body.message, 500);

  if (!name) errors.push("Name is required.");
  if (!/^[0-9+ -]{7,20}$/.test(phone)) errors.push("Enter a valid phone number.");
  if (!SERVICES.includes(service)) errors.push("Choose a valid service.");
  if (date && Number.isNaN(Date.parse(date))) errors.push("Preferred date isn't valid.");

  return { errors, data: { name, phone, service, date, message } };
}

app.post("/api/appointments", appointmentLimiter, async (req, res) => {
  const { errors, data } = validateAppointment(req.body || {});
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors[0] });
  }

  if (!CLINIC_EMAIL || !process.env.SMTP_HOST) {
    console.error("Email is not configured — check server/.env");
    return res.status(500).json({ ok: false, error: "Booking is temporarily unavailable. Please call us at +92 311-7594193." });
  }

  try {
    await transporter.sendMail({
      from: `"Multan Dental Aesthetic — Website" <${process.env.SMTP_USER}>`,
      to: CLINIC_EMAIL,
      replyTo: undefined, // form doesn't collect patient email, only phone
      subject: `New appointment request — ${data.name}`,
      text:
        `Name: ${data.name}\n` +
        `Phone: ${data.phone}\n` +
        `Interested in: ${data.service}\n` +
        `Preferred date: ${data.date || "Not specified"}\n` +
        `Message: ${data.message || "—"}\n` +
        `\nSubmitted: ${new Date().toISOString()}`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to send appointment email:", err.message);
    res.status(502).json({ ok: false, error: "Couldn't send your request right now. Please try again or call us at +92 311-7594193." });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Multan Dental Aesthetic backend listening on port ${PORT}`);
});
