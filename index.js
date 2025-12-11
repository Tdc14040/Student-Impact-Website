const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files when deployed together
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// open (or create) DB
const db = new sqlite3.Database('./data/students.db');

// create table if not exists
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

// API to accept assessments
app.post('/api/assessments', (req, res) => {
  const body = req.body || {};
  const stmt = db.prepare(`INSERT INTO students (
    hours_per_day, short_video_minutes, main_platform, sleep_quality, procrastination, stress_level, performance, escapism_score, social_connection_score, learning_score, negative_impact_label
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run(
    body.hours_per_day || null, body.short_video_minutes || null, body.main_platform || null,
    body.sleep_quality || null, body.procrastination || null, body.stress_level || null, body.performance || null,
    body.escapism_score || null, body.social_connection_score || null, body.learning_score || null,
    body.negative_impact_label || 0,
    function(err) {
      if (err) return res.status(500).json({error: err.message});
      res.json({id: this.lastID});
    }
  );
  stmt.finalize();
});

// simple read endpoint (admin)
app.get('/api/assessments', (req, res) => {
  db.all('SELECT * FROM students ORDER BY created_at DESC LIMIT 500', (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('API and site running on', port));
