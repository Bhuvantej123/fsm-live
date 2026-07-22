const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate, requireAdmin, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { id: user.id, username: user.username, role: user.role, engineer_id: user.engineer_id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — verify token and return user info
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users — list all users (admin only)
router.get('/users', authenticate, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.role, u.engineer_id, u.created_at,
             e.name as engineer_name
      FROM users u
      LEFT JOIN engineers e ON e.id = u.engineer_id
      ORDER BY u.role DESC, u.username ASC
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users — create a new engineer user (admin only)
router.post('/users', authenticate, requireAdmin, (req, res) => {
  try {
    const { username, password, engineer_id } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      "INSERT INTO users (username, password_hash, role, engineer_id) VALUES (?, ?, 'engineer', ?)"
    ).run(username, hash, engineer_id || null);
    const newUser = db.prepare('SELECT id, username, role, engineer_id, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newUser);
  } catch (err) {
    if (err.message?.includes('UNIQUE') || err.message?.includes('unique')) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id — update engineer user (admin only)
router.put('/users/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { username, password, engineer_id } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin' && username) {
      // Don't let admin rename/repwd themselves from here easily — still allow it
    }
    const newUsername = username || user.username;
    const newHash = password ? bcrypt.hashSync(password, 10) : user.password_hash;
    const newEngineerId = engineer_id !== undefined ? engineer_id : user.engineer_id;
    db.prepare('UPDATE users SET username=?, password_hash=?, engineer_id=? WHERE id=?')
      .run(newUsername, newHash, newEngineerId || null, req.params.id);
    const updated = db.prepare('SELECT id, username, role, engineer_id, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err.message?.includes('UNIQUE') || err.message?.includes('unique')) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id — delete an engineer user (admin only, can't delete self)
router.delete('/users/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin account' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
