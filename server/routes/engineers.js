const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', (req, res) => {
  try {
    const engineers = db.prepare('SELECT * FROM engineers ORDER BY name ASC').all();
    res.json(engineers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const e = db.prepare('SELECT * FROM engineers WHERE id = ?').get(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found' });
    res.json(e);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db.prepare(
      'INSERT INTO engineers (name, email, phone) VALUES (?, ?, ?)'
    ).run(name, email || null, phone || null);
    res.status(201).json(db.prepare('SELECT * FROM engineers WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const e = db.prepare('SELECT * FROM engineers WHERE id = ?').get(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found' });
    const { name, email, phone } = req.body;
    db.prepare('UPDATE engineers SET name=?, email=?, phone=? WHERE id=?').run(
      name ?? e.name, email ?? e.email, phone ?? e.phone, req.params.id
    );
    res.json(db.prepare('SELECT * FROM engineers WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM engineers WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
