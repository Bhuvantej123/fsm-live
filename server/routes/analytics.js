const express = require('express');
const router  = express.Router();
const db      = require('../db');

const isPg = Boolean(process.env.DATABASE_URL);

// GET analytics summary (optionally date-filtered)
router.get('/summary', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const dateParams = [];
    let dateWhere = '';
    if (start_date) { dateWhere += ' AND visit_date >= ?'; dateParams.push(start_date); }
    if (end_date)   { dateWhere += ' AND visit_date <= ?'; dateParams.push(end_date); }

    // Overall totals
    const totals = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'open'     THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
        SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'closed'   THEN 1 ELSE 0 END) AS closed_count
      FROM visits WHERE 1=1 ${dateWhere}
    `).get(...dateParams);

    // Engineer performance
    const engineerPerf = db.prepare(`
      SELECT e.id, e.name,
        COUNT(v.id)                                                      AS total_visits,
        SUM(CASE WHEN v.status = 'resolved' THEN 1 ELSE 0 END)          AS resolved,
        SUM(CASE WHEN v.status = 'open'     THEN 1 ELSE 0 END)          AS open_count,
        SUM(CASE WHEN v.status = 'pending'  THEN 1 ELSE 0 END)          AS pending
      FROM engineers e
      LEFT JOIN visits v ON e.id = v.engineer_id AND 1=1 ${dateWhere}
      GROUP BY e.id, e.name
      ORDER BY total_visits DESC
    `).all(...dateParams);

    // Monthly trend – last 6 months (PostgreSQL / SQLite dual query)
    const monthlyTrendQuery = isPg ? `
      SELECT TO_CHAR(visit_date::date, 'YYYY-MM') AS month, COUNT(*)::int AS count
      FROM visits
      WHERE visit_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(visit_date::date, 'YYYY-MM')
      ORDER BY month ASC
    ` : `
      SELECT strftime('%Y-%m', visit_date) AS month, COUNT(*) AS count
      FROM visits
      WHERE visit_date >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `;

    const monthlyTrend = db.prepare(monthlyTrendQuery).all();

    // Top customers by visit count
    const topCustomers = db.prepare(`
      SELECT c.id, c.name, COUNT(v.id) AS visit_count,
        SUM(CASE WHEN v.status IN ('open','pending') THEN 1 ELSE 0 END) AS unresolved
      FROM customers c
      LEFT JOIN visits v ON c.id = v.customer_id AND 1=1 ${dateWhere}
      GROUP BY c.id, c.name
      ORDER BY visit_count DESC
      LIMIT 10
    `).all(...dateParams);

    res.json({ totals, engineerPerf, monthlyTrend, topCustomers });
  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
