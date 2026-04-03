const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://confioengineeringsolutions.netlify.app"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/test", (req, res) => {
  res.json({ message: "Backend working perfectly" });
});
// Database Connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL Database");

    const createTable = `
      CREATE TABLE IF NOT EXISTS enquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        message TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.query(createTable, (err) => {
      if (err) console.error("❌ Table creation error:", err.message);
      else console.log("✅ Enquiries table ready");
    });
  }
});

// Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,   // ← must be exactly this
    pass: process.env.GMAIL_PASS,   // ← must be exactly this
  },
});

transporter.verify((error) => {
  if (error) console.error("❌ Email Setup Error:", error.message);
  else console.log("✅ Email server is ready to send messages");
});

// Test Route
app.get("/", (req, res) => {
  res.json({ status: "✅ Confio Engineering Server is Running!" });
});

// Enquiry Route
app.post("/enquiry", (req, res) => {
  console.log("📩 Request received:", req.body);

  const { name, phone, email, message } = req.body;

  if (!name || !phone || !email) {
    return res.status(400).json({ error: "Name, phone, and email are required." });
  }

  const sql = "INSERT INTO enquiries (name, phone, email, message) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, phone, email, message || ""], (err, result) => {
    if (err) {
      console.error("❌ DB Insert Error:", err.message);
      return res.status(500).json({ error: "Database error. Please try again." });
    }

    console.log(`✅ Saved to DB with ID: ${result.insertId}`);

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.MANAGER_EMAIL,
      subject: "🔔 New Online Enquiry - Confio Engineering Solutions",
      html: `
        <h2>New Enquiry Received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message || "No message"}</p>
      `,
    };

    transporter.sendMail(mailOptions, (emailErr, info) => {
      if (emailErr) {
        console.error("❌ Email Error:", emailErr.message);
        return res.status(200).json({ message: "Enquiry saved!", dbId: result.insertId });
      }

      console.log("✅ Email sent:", info.response);
      return res.status(200).json({ message: "Enquiry saved and email sent!", dbId: result.insertId });
    });
  });
});

