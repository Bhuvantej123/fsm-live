const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');

// ── Multer setup ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt'];
    allowed.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('File type not allowed'));
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function visitWithDetails(id) {
  const visit = db.prepare(`
    SELECT v.*, c.name AS customer_name, e.name AS engineer_name
    FROM visits v
    LEFT JOIN customers c ON v.customer_id = c.id
    LEFT JOIN engineers e ON v.engineer_id = e.id
    WHERE v.id = ?
  `).get(id);
  if (!visit) return null;
  visit.attachments = db.prepare('SELECT * FROM attachments WHERE visit_id = ?').all(id);
  return visit;
}

// ── GET all visits (filterable) ───────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { customer_id, engineer_id, status, start_date, end_date, search, with_attachments } = req.query;

    let q = `
      SELECT v.*, c.name AS customer_name, e.name AS engineer_name
      FROM visits v
      LEFT JOIN customers c ON v.customer_id = c.id
      LEFT JOIN engineers e ON v.engineer_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (customer_id)  { q += ' AND v.customer_id = ?';   params.push(customer_id); }
    if (engineer_id)  { q += ' AND v.engineer_id = ?';   params.push(engineer_id); }
    if (status)       { q += ' AND v.status = ?';        params.push(status); }
    if (start_date)   { q += ' AND v.visit_date >= ?';   params.push(start_date); }
    if (end_date)     { q += ' AND v.visit_date <= ?';   params.push(end_date); }
    if (search) {
      q += ' AND (v.problem LIKE ? OR c.name LIKE ? OR e.name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    q += ' ORDER BY v.visit_date DESC, v.created_at DESC';

    let visits = db.prepare(q).all(...params);

    if (with_attachments === 'true') {
      visits = visits.map(v => ({
        ...v,
        attachments: db.prepare('SELECT * FROM attachments WHERE visit_id = ?').all(v.id)
      }));
    }

    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single visit with attachments ─────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const visit = visitWithDetails(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Not found' });
    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create visit ─────────────────────────────────────────────────────────
router.post('/', upload.array('attachments', 10), (req, res) => {
  try {
    const { customer_id, engineer_id, visit_date, problem, actions_taken, remarks, status } = req.body;
    if (!customer_id || !visit_date)
      return res.status(400).json({ error: 'customer_id and visit_date are required' });

    const result = db.prepare(`
      INSERT INTO visits (customer_id, engineer_id, visit_date, problem, actions_taken, remarks, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      customer_id, engineer_id || null, visit_date,
      problem || null, actions_taken || null, remarks || null, status || 'open'
    );

    const visitId = result.lastInsertRowid;
    if (req.files?.length) {
      const ins = db.prepare('INSERT INTO attachments (visit_id, filename, original_name) VALUES (?, ?, ?)');
      req.files.forEach(f => ins.run(visitId, f.filename, f.originalname));
    }

    res.status(201).json(visitWithDetails(visitId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update visit ──────────────────────────────────────────────────────────
router.put('/:id', upload.array('attachments', 10), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { customer_id, engineer_id, visit_date, problem, actions_taken, remarks, status } = req.body;
    db.prepare(`
      UPDATE visits
      SET customer_id=?, engineer_id=?, visit_date=?, problem=?, actions_taken=?, remarks=?, status=?
      WHERE id=?
    `).run(
      customer_id   || existing.customer_id,
      engineer_id !== undefined ? (engineer_id || null) : existing.engineer_id,
      visit_date    || existing.visit_date,
      problem       !== undefined ? problem       : existing.problem,
      actions_taken !== undefined ? actions_taken : existing.actions_taken,
      remarks       !== undefined ? remarks       : existing.remarks,
      status        || existing.status,
      req.params.id
    );

    if (req.files?.length) {
      const ins = db.prepare('INSERT INTO attachments (visit_id, filename, original_name) VALUES (?, ?, ?)');
      req.files.forEach(f => ins.run(req.params.id, f.filename, f.originalname));
    }

    res.json(visitWithDetails(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE visit ──────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Not found' });

    // Remove attachment files from disk
    const atts = db.prepare('SELECT * FROM attachments WHERE visit_id = ?').all(req.params.id);
    atts.forEach(a => {
      const fp = path.join(__dirname, '..', 'uploads', a.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });

    db.prepare('DELETE FROM visits WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE attachment ─────────────────────────────────────────────────────────
router.delete('/:visitId/attachments/:attId', (req, res) => {
  try {
    const att = db.prepare(
      'SELECT * FROM attachments WHERE id = ? AND visit_id = ?'
    ).get(req.params.attId, req.params.visitId);
    if (!att) return res.status(404).json({ error: 'Not found' });

    const fp = path.join(__dirname, '..', 'uploads', att.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);

    db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.attId);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
