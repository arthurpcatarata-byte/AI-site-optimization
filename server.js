const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;
const JWT_SECRET = crypto.randomBytes(32).toString('hex');

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function authenticate(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== AUTH ROUTES ====================

app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Username or email already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hash);

  const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 86400000 });
  res.json({ message: 'Registration successful', username });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 86400000 });
  res.json({ message: 'Login successful', username: user.username });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/me', authenticate, (req, res) => {
  res.json({ username: req.username, id: req.userId });
});

// ==================== SITE ROUTES ====================

// AI Feasibility Score Calculator (dummy function)
function calculateFeasibilityScores(site) {
  // Simulated AI scoring based on site parameters
  const sizeNorm = Math.min(site.size_sqft / 50000, 1);
  const costPerSqft = site.estimated_cost / site.size_sqft;

  // Environmental score: favor medium-sized sites
  const environmental = Math.round((0.7 + Math.random() * 0.3) * (sizeNorm > 0.5 ? 0.9 : 0.7) * 100) / 100;

  // Market score: based on zoning type
  const zoningScores = { residential: 0.85, commercial: 0.78, industrial: 0.65, mixed: 0.90, agricultural: 0.55 };
  const market = Math.round((zoningScores[site.zoning.toLowerCase()] || 0.7) * (0.8 + Math.random() * 0.2) * 100) / 100;

  // Infrastructure score: inversely related to cost per sqft
  const infrastructure = Math.round(Math.max(0.3, Math.min(1, 1 - costPerSqft / 500)) * (0.7 + Math.random() * 0.3) * 100) / 100;

  // Regulatory score: based on zoning
  const regScores = { residential: 0.90, commercial: 0.75, industrial: 0.60, mixed: 0.70, agricultural: 0.80 };
  const regulatory = Math.round((regScores[site.zoning.toLowerCase()] || 0.7) * (0.8 + Math.random() * 0.2) * 100) / 100;

  // Overall feasibility: weighted average
  const feasibility = Math.round((environmental * 0.25 + market * 0.30 + infrastructure * 0.25 + regulatory * 0.20) * 100) / 100;

  return {
    feasibility_score: feasibility,
    environmental_score: environmental,
    market_score: market,
    infrastructure_score: infrastructure,
    regulatory_score: regulatory
  };
}

app.get('/api/sites', authenticate, (req, res) => {
  const sites = db.prepare('SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(sites);
});

app.get('/api/sites/:id', authenticate, (req, res) => {
  const siteId = parseInt(req.params.id, 10);
  if (isNaN(siteId)) return res.status(400).json({ error: 'Invalid site ID' });

  const site = db.prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?').get(siteId, req.userId);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json(site);
});

app.post('/api/sites', authenticate, (req, res) => {
  const { name, location, size_sqft, zoning, estimated_cost } = req.body;
  if (!name || !location || !size_sqft || !zoning || !estimated_cost) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const scores = calculateFeasibilityScores({ size_sqft, zoning, estimated_cost });

  const result = db.prepare(`
    INSERT INTO sites (user_id, name, location, size_sqft, zoning, estimated_cost,
      feasibility_score, environmental_score, market_score, infrastructure_score, regulatory_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.userId, name, location, size_sqft, zoning, estimated_cost,
    scores.feasibility_score, scores.environmental_score,
    scores.market_score, scores.infrastructure_score, scores.regulatory_score
  );

  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(result.lastInsertRowid);
  res.json(site);
});

app.delete('/api/sites/:id', authenticate, (req, res) => {
  const siteId = parseInt(req.params.id, 10);
  if (isNaN(siteId)) return res.status(400).json({ error: 'Invalid site ID' });

  const result = db.prepare('DELETE FROM sites WHERE id = ? AND user_id = ?').run(siteId, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Site not found' });
  res.json({ message: 'Site deleted' });
});

// SPA fallback - serve index.html for unmatched routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🚀 SiteOptimizer AI running at http://localhost:${PORT}\n`);
});
