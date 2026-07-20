const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all customers with optional search & contract_type filter
router.get('/', (req, res) => {
  try {
    const { search, contract_type } = req.query;
    let query = 'SELECT * FROM customers';
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (contract_type) {
      conditions.push('contract_type = ?');
      params.push(contract_type);
    }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY name ASC';

    const customers = db.prepare(query).all(...params);

    const withCounts = customers.map(c => {
      const counts = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'open'     THEN 1 ELSE 0 END) as open_count,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
          SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN status = 'closed'   THEN 1 ELSE 0 END) as closed_count
        FROM visits WHERE customer_id = ?
      `).get(c.id);
      return { ...c, ...counts };
    });

    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single customer
router.get('/:id', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', (req, res) => {
  try {
    const { name, contact_person, phone, email, address, contract_type, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = db.prepare(`
      INSERT INTO customers (name, contact_person, phone, email, address, contract_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, contact_person || null, phone || null, email || null,
           address || null, contract_type || 'standard', notes || null);

    res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', (req, res) => {
  try {
    const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Customer not found' });

    const { name, contact_person, phone, email, address, contract_type, notes } = req.body;
    db.prepare(`
      UPDATE customers SET name=?, contact_person=?, phone=?, email=?, address=?, contract_type=?, notes=?
      WHERE id=?
    `).run(
      name ?? c.name, contact_person ?? c.contact_person,
      phone ?? c.phone, email ?? c.email,
      address ?? c.address, contract_type ?? c.contract_type,
      notes ?? c.notes, req.params.id
    );

    res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  try {
    const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
