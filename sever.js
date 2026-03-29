const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// 1. MySQL Database Connection
// ─────────────────────────────────────────────
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "bhaveshsal@1",
  database: "confio_db",
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

// ─────────────────────────────────────────────
// 2. Gmail Nodemailer Transporter
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "bsalunke2022@gmail.com",
    pass: "byrcnkmxnkdycejh",   // ✅ FIXED: removed spaces from app password
  },
});

// ✅ Verify email connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Setup Error:", error.message);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

// ─────────────────────────────────────────────
// 3. Enquiry POST Route
// ─────────────────────────────────────────────
app.post("/enquiry", (req, res) => {
  console.log("📩 Request received:", req.body); // ✅ log incoming data

  const { name, phone, email, message } = req.body;

  if (!name || !phone || !email) {
    console.log("❌ Missing fields");
    return res.status(400).json({ error: "Name, phone, and email are required." });
  }

  console.log(`📩 New Enquiry Received`);
  console.log(`Name: ${name}, Phone: ${phone}, Email: ${email}`);

  // ── Save to MySQL ──
  const sql = "INSERT INTO enquiries (name, phone, email, message) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, phone, email, message || ""], (err, result) => {
    if (err) {
      console.error("❌ DB Insert Error:", err.message);
      return res.status(500).json({ error: "Database error. Please try again." });
    }

    console.log(`✅ Saved to DB with ID: ${result.insertId}`);

    // ── Send Email ──
    const mailOptions = {
      from: "bsalunke2022@gmail.com",
      to: "bhaveshsalunke874@gmail.com",
      subject: "🔔 New Online Enquiry - Confio Engineering Solutions",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #003366; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Confio Engineering Solutions</h2>
            <p style="color: #aad4f5; margin: 4px 0;">New Enquiry Notification</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 16px;">Hello Manager,</p>
            <p>You have received a new enquiry from the website. Here are the details:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
              <tr style="background-color: #f2f2f2;">
                <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd; width: 30%;">Name</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Phone</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${phone}</td>
              </tr>
              <tr style="background-color: #f2f2f2;">
                <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Email</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Message</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${message || "<em>No message provided</em>"}</td>
              </tr>
              <tr style="background-color: #f2f2f2;">
                <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">Received At</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
              </tr>
            </table>
            <p style="margin-top: 20px; color: #555;">Please follow up with the client at your earliest convenience.</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 12px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd;">
            © ${new Date().getFullYear()} Confio Engineering Solutions. All rights reserved.
          </div>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (emailErr, info) => {
      if (emailErr) {
        console.error("❌ Email Error:", emailErr.message);
        return res.status(200).json({
          message: "Enquiry saved successfully! (Email notification pending)",
          dbId: result.insertId,
        });
      }

      console.log("✅ Email sent to manager:", info.response);
      return res.status(200).json({
        message: "Enquiry saved and email sent successfully!",
        dbId: result.insertId,
      });
    });
  });
});

// ✅ Test route — open in browser to check if server is working
app.get("/", (req, res) => {
  res.send("✅ Confio Engineering Server is Running!");
});

// ─────────────────────────────────────────────
// 4. Start Server
// ─────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
