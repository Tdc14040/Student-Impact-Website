const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite DB path
const dbPath = path.join(dataDir, 'students.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Failed to open DB:', err);
  else console.log('Connected to DB at', dbPath);
});

// Create table if not exists
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

// Receive assessments
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
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
  stmt.finalize();
});

// Admin fetch
app.get('/api/assessments', (req, res) => {
  db.all('SELECT * FROM students ORDER BY created_at DESC LIMIT 500', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log("Running on port", port));
