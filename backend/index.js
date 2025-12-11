const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// DB
const dbPath = path.join(dataDir, 'students.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Failed to open DB:', err);
  else console.log('Connected to DB at', dbPath);
});

// create tables if not exists
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    hours_per_day REAL,
    short_video_minutes INTEGER,
    main_platform TEXT,
    sleep_quality INTEGER,
    procrastination INTEGER,
    stress_level INTEGER,
    performance INTEGER,
    escapism_score REAL,
    social_connection_score REAL,
    learning_score REAL,
    negative_impact_label INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    security_question TEXT,
    security_answer_hash TEXT,
    reset_otp TEXT,
    otp_expire INTEGER
  )`);
});

// nodemailer transporter (placeholders — set env vars in Render)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'YOUR_EMAIL_HERE',
    pass: process.env.SMTP_PASS || 'YOUR_APP_PASSWORD_HERE'
  }
});

// helper: generate JWT
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';

function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.admin = decoded;
    next();
  });
}

// Public: accept assessments
app.post('/api/assessments', (req, res) => {
  const b = req.body || {};
  const stmt = db.prepare(`INSERT INTO students (
    hours_per_day, short_video_minutes, main_platform, sleep_quality, procrastination,
    stress_level, performance, escapism_score, social_connection_score,
    learning_score, negative_impact_label
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run(
    b.hours_per_day || null,
    b.short_video_minutes || null,
    b.main_platform || null,
    b.sleep_quality || null,
    b.procrastination || null,
    b.stress_level || null,
    b.performance || null,
    b.escapism_score || null,
    b.social_connection_score || null,
    b.learning_score || null,
    b.negative_impact_label || 0,
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
  stmt.finalize();
});

// Protected: get assessments (admin only)
app.get('/api/assessments', verifyToken, (req, res) => {
  db.all('SELECT * FROM students ORDER BY created_at DESC LIMIT 1000', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Admin: register (create admin) — use once to create initial admin
app.post('/api/admin/register', (req, res) => {
  const { username, email, password, question, answer } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'username,email,password required' });

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);
  const answer_hash = answer ? bcrypt.hashSync(answer, salt) : null;

  db.run(`INSERT INTO admins (username,email,password_hash,security_question,security_answer_hash) VALUES (?,?,?,?,?)`,
    [username, email, password_hash, question || null, answer_hash],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ admin_id: this.lastID });
    }
  );
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM admins WHERE username = ?`, [username], (err, admin) => {
    if (err || !admin) return res.status(401).json({ error: 'Invalid username or password' });
    const ok = bcrypt.compareSync(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
    const token = jwt.sign({ admin_id: admin.admin_id, username: admin.username }, JWT_SECRET, { expiresIn: '4h' });
    res.json({ token });
  });
});

// Forgot password: send OTP
app.post('/api/admin/forgot', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  db.get(`SELECT * FROM admins WHERE email = ?`, [email], (err, admin) => {
    if (err || !admin) return res.json({ message: 'If the email exists, OTP has been sent' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    db.run(`UPDATE admins SET reset_otp = ?, otp_expire = ? WHERE email = ?`, [otp, expiry, email], (e) => {
      // send email (best-effort)
      transporter.sendMail({
        from: process.env.SMTP_USER || 'no-reply@example.com',
        to: email,
        subject: 'Your password reset OTP',
        text: `Your OTP is ${otp}. It expires in 10 minutes.`
      }, (mailErr, info) => {
        // ignore mail errors for now, respond success
        res.json({ message: 'If the email exists, OTP has been sent' });
      });
    });
  });
});

// Verify OTP
app.post('/api/admin/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });
  db.get(`SELECT * FROM admins WHERE email = ?`, [email], (err, admin) => {
    if (err || !admin) return res.status(400).json({ error: 'Invalid email or otp' });
    if (!admin.reset_otp || admin.reset_otp !== otp) return res.status(400).json({ error: 'Incorrect OTP' });
    if (Date.now() > (admin.otp_expire || 0)) return res.status(400).json({ error: 'OTP expired' });
    const resetToken = jwt.sign({ admin_id: admin.admin_id }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ resetToken });
  });
});

// Reset password using resetToken
app.post('/api/admin/reset-password', (req, res) => {
  const { newPassword, resetToken } = req.body;
  if (!newPassword || !resetToken) return res.status(400).json({ error: 'newPassword and resetToken required' });
  jwt.verify(resetToken, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired reset token' });
    const hash = bcrypt.hashSync(newPassword, 10);
    db.run(`UPDATE admins SET password_hash = ?, reset_otp = NULL, otp_expire = NULL WHERE admin_id = ?`, [hash, decoded.admin_id], (e) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json({ message: 'Password updated successfully' });
    });
  });
});

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('Running on port', port));
