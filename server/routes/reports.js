const express = require('express');
const router  = express.Router();
const PDFDoc  = require('pdfkit');
const ExcelJS = require('exceljs');
const db      = require('../db');

// Helper to format any Date or string into clean YYYY-MM-DD
function formatDate(d) {
  if (!d) return '—';
  if (d instanceof Date) {
    return d.toISOString().slice(0, 10);
  }
  const str = String(d);
  if (str.includes('T')) return str.split('T')[0];
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return str.slice(0, 10);
}

// ── Helper: fetch all customer data for a given month ─────────────────────────
function getMonthData(month) {
  const parts = (month || new Date().toISOString().slice(0, 7)).split('-');
  const year = parseInt(parts[0], 10);
  const mIndex = parseInt(parts[1], 10);

  const lastDay = new Date(year, mIndex, 0).getDate();
  const start = `${month}-01`;
  const end   = `${month}-${String(lastDay).padStart(2, '0')}`;

  const isPg = Boolean(process.env.DATABASE_URL);

  const customerQuery = isPg ? `
    SELECT c.id, c.name, c.contact_person, c.phone, c.email, c.address, c.contract_type, c.notes, c.created_at, MIN(v.visit_date) as earliest_visit
    FROM customers c
    JOIN visits v ON c.id = v.customer_id
    WHERE v.visit_date::text >= ? AND v.visit_date::text <= ?
    GROUP BY c.id, c.name, c.contact_person, c.phone, c.email, c.address, c.contract_type, c.notes, c.created_at
    ORDER BY earliest_visit ASC
  ` : `
    SELECT c.id, c.name, c.contact_person, c.phone, c.email, c.address, c.contract_type, c.notes, c.created_at, MIN(v.visit_date) as earliest_visit
    FROM customers c
    JOIN visits v ON c.id = v.customer_id
    WHERE v.visit_date >= ? AND v.visit_date <= ?
    GROUP BY c.id
    ORDER BY earliest_visit ASC
  `;

  const customers = db.prepare(customerQuery).all(start, end);

  return customers.map(c => {
    const visitsQuery = isPg ? `
      SELECT v.*, e.name AS engineer_name
      FROM visits v
      LEFT JOIN engineers e ON v.engineer_id = e.id
      WHERE v.customer_id = ? AND v.visit_date::text >= ? AND v.visit_date::text <= ?
      ORDER BY v.visit_date ASC, v.id ASC
    ` : `
      SELECT v.*, e.name AS engineer_name
      FROM visits v
      LEFT JOIN engineers e ON v.engineer_id = e.id
      WHERE v.customer_id = ? AND v.visit_date >= ? AND v.visit_date <= ?
      ORDER BY v.visit_date ASC, v.id ASC
    `;

    const rawVisits = db.prepare(visitsQuery).all(c.id, start, end);
    const visits = rawVisits.map(v => ({
      ...v,
      visit_date: formatDate(v.visit_date)
    }));

    return {
      customer: c,
      visits,
      summary: {
        total:    visits.length,
        open:     visits.filter(v => v.status === 'open').length,
        resolved: visits.filter(v => v.status === 'resolved').length,
        pending:  visits.filter(v => v.status === 'pending').length,
      }
    };
  });
}

// ── GET JSON summary ──────────────────────────────────────────────────────────
router.get('/monthly', (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    res.json({ month, data: getMonthData(month) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET PDF (A4 Landscape — Matches Excel Layout 1-to-1) ──────────────────────
router.get('/monthly/pdf', (req, res) => {
  try {
    const month      = req.query.month || new Date().toISOString().slice(0, 7);
    const data       = getMonthData(month);
    const monthLabel = new Date(`${month}-15`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="FSM_Report_${month}.pdf"`);

    // Use Landscape orientation for 6-column matching layout
    const doc = new PDFDoc({
      margin: 36,
      size: 'A4',
      layout: 'landscape',
      bufferPages: true,
      autoFirstPage: true
    });
    doc.pipe(res);

    const PW  = doc.page.width;          // 841.89
    const PH  = doc.page.height;         // 595.28
    const LM  = 36;                      // left margin
    const RM  = PW - 36;                 // right margin
    const CW  = RM - LM;                 // content width = 769.89

    // ── Colour palette ──────────────────────────────────────────────────────
    const C = {
      black:      '#0f172a',
      dark:       '#1e293b',
      mid:        '#475569',
      muted:      '#64748b',
      light:      '#cbd5e1',
      bg:         '#f8fafc',
      indigo:     '#4f46e5',
      red:        '#b91c1c',   openBg:     '#fee2e2',
      green:      '#15803d',   resolvedBg: '#d1fae5',
      amber:      '#b45309',   pendingBg:  '#fef3c7',
      slate:      '#475569',
    };

    const hRule = (y, color = C.light, lw = 0.5) => {
      doc.save().strokeColor(color).lineWidth(lw)
         .moveTo(LM, y).lineTo(RM, y).stroke().restore();
    };

    const statusConfig = {
      open:     { label: 'OPEN',     fg: C.red,    bg: C.openBg     },
      resolved: { label: 'RESOLVED', fg: C.green,  bg: C.resolvedBg },
      pending:  { label: 'PENDING',  fg: C.amber,  bg: C.pendingBg  },
    };

    const pill = (text, fg, bg, x, y) => {
      const tw = doc.fontSize(7.5).font('Helvetica-Bold').widthOfString(text);
      const ph = 12, pw2 = tw + 10, r = 2;
      doc.save().roundedRect(x, y - 1, pw2, ph, r).fill(bg);
      doc.fillColor(fg).fontSize(7.5).font('Helvetica-Bold').text(text, x + 5, y + 1).restore();
      return pw2;
    };

    // Total summary values
    const totalVisits   = data.reduce((s, r) => s + r.summary.total, 0);
    const totalOpen     = data.reduce((s, r) => s + r.summary.open, 0);
    const totalResolved = data.reduce((s, r) => s + r.summary.resolved, 0);
    const totalPending  = data.reduce((s, r) => s + r.summary.pending, 0);

    // Header Accent Bar
    doc.rect(0, 0, PW, 6).fill(C.indigo);

    doc.fillColor(C.indigo).rect(LM, 18, 4, 34).fill();
    doc.fontSize(18).font('Helvetica-Bold').fillColor(C.black)
       .text('Field Service Management Report', LM + 12, 18);
    doc.fontSize(10).font('Helvetica').fillColor(C.mid)
       .text(`Monthly Summary  ·  ${monthLabel.toUpperCase()}`, LM + 12, 38);

    const genDate = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    doc.fontSize(8.5).font('Helvetica').fillColor(C.muted)
       .text(`Generated: ${genDate}`, LM, 20, { width: CW, align: 'right' });

    hRule(58, C.indigo, 1);

    // KPI Summary Band
    const kpiY  = 66;
    const kpiH  = 44;
    const kpis  = [
      { label: 'Total Visits', value: totalVisits,   color: C.indigo },
      { label: 'Open',         value: totalOpen,     color: C.red    },
      { label: 'Resolved',     value: totalResolved, color: C.green  },
      { label: 'Pending',      value: totalPending,  color: C.amber  },
      { label: 'Customers',    value: data.length,   color: C.slate  },
    ];

    doc.save().roundedRect(LM, kpiY, CW, kpiH, 4).fill(C.bg).restore();
    doc.save().roundedRect(LM, kpiY, CW, kpiH, 4).lineWidth(0.5).strokeColor(C.light).stroke().restore();

    kpis.forEach((k, i) => {
      const cx = LM + i * (CW / kpis.length) + (CW / kpis.length) / 2;
      doc.fontSize(16).font('Helvetica-Bold').fillColor(k.color)
         .text(String(k.value), cx - 30, kpiY + 8, { width: 60, align: 'center' });
      doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted)
         .text(k.label.toUpperCase(), cx - 30, kpiY + 28, { width: 60, align: 'center' });
    });

    for (let i = 1; i < kpis.length; i++) {
      const dx = LM + i * (CW / kpis.length);
      doc.save().strokeColor('#e2e8f0').lineWidth(0.5)
         .moveTo(dx, kpiY + 8).lineTo(dx, kpiY + kpiH - 8).stroke().restore();
    }

    let curY = kpiY + kpiH + 16;

    // 6 Columns exact specification matching Excel layout
    const cols = [
      { label: 'VISIT DATE',      x: LM + 6,   w: 75  },
      { label: 'ENGINEER',        x: LM + 86,  w: 110 },
      { label: 'STATUS',          x: LM + 201, w: 65  },
      { label: 'PROBLEM / ISSUE', x: LM + 271, w: 175 },
      { label: 'ACTIONS TAKEN',   x: LM + 451, w: 175 },
      { label: 'REMARKS',         x: LM + 631, w: 132 },
    ];

    const drawTableHead = (y) => {
      doc.save().rect(LM, y, CW, 18).fill('#e2e8f0').restore();
      cols.forEach(col => {
        doc.fontSize(7).font('Helvetica-Bold').fillColor(C.mid)
           .text(col.label, col.x, y + 5, { width: col.w });
      });
    };

    // Customer Sections
    for (const item of data) {
      if (curY > PH - 100) {
        doc.addPage();
        doc.rect(0, 0, PW, 6).fill(C.indigo);
        curY = 24;
      }

      // Customer Header Banner (Matches Excel)
      doc.save().roundedRect(LM, curY, CW, 36, 4).fill(C.bg).restore();
      doc.save().roundedRect(LM, curY, CW, 36, 4).lineWidth(0.5).strokeColor(C.light).stroke().restore();
      doc.save().rect(LM, curY, 4, 36).fill(C.indigo).restore();

      const custTitle = `CUSTOMER: ${item.customer.name.toUpperCase()}`;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.black)
         .text(custTitle, LM + 12, curY + 6, { width: CW * 0.65 });

      const meta = [
        item.customer.contact_person && `Contact: ${item.customer.contact_person}`,
        item.customer.phone && `Phone: ${item.customer.phone}`,
        item.customer.address && `Address: ${item.customer.address}`
      ].filter(Boolean).join('   |   ');

      if (meta) {
        doc.fontSize(7.5).font('Helvetica').fillColor(C.mid)
           .text(meta, LM + 12, curY + 21, { width: CW * 0.65 });
      }

      // Right mini stats
      const stats = [
        { l: 'Visits',   v: item.summary.total,    c: C.indigo },
        { l: 'Open',     v: item.summary.open,      c: C.red    },
        { l: 'Resolved', v: item.summary.resolved,  c: C.green  },
        { l: 'Pending',  v: item.summary.pending,   c: C.amber  },
      ];
      stats.forEach((s, si) => {
        const sx = RM - (stats.length - si) * 54 + 5;
        doc.fontSize(11).font('Helvetica-Bold').fillColor(s.c)
           .text(String(s.v), sx, curY + 5, { width: 44, align: 'center' });
        doc.fontSize(6).font('Helvetica-Bold').fillColor(C.muted)
           .text(s.l.toUpperCase(), sx, curY + 21, { width: 44, align: 'center' });
      });

      curY += 42;

      // Draw Table Column Headers
      drawTableHead(curY);
      curY += 18;

      if (item.visits.length === 0) {
        doc.fontSize(8.5).font('Helvetica-Oblique').fillColor(C.muted)
           .text('No visits logged for this month.', LM + 10, curY + 6);
        curY += 24;
      } else {
        item.visits.forEach((v, vi) => {
          const dateStr  = formatDate(v.visit_date);
          const engStr   = v.engineer_name || '—';
          const probStr  = v.problem || '—';
          const actStr   = v.actions_taken || '—';
          const remStr   = v.remarks || '—';

          const dateH = doc.fontSize(8.5).heightOfString(dateStr, { width: 75 });
          const engH  = doc.fontSize(8.5).heightOfString(engStr,  { width: 105 });
          const probH = doc.fontSize(8.5).heightOfString(probStr, { width: 170 });
          const actH  = doc.fontSize(8.5).heightOfString(actStr,  { width: 170 });
          const remH  = doc.fontSize(8.0).heightOfString(remStr,  { width: 125 });

          const rowH  = Math.max(26, dateH + 10, engH + 10, probH + 10, actH + 10, remH + 10);

          if (curY + rowH > PH - 45) {
            doc.addPage();
            doc.rect(0, 0, PW, 6).fill(C.indigo);
            curY = 24;
            drawTableHead(curY);
            curY += 18;
          }

          // Alternate row bg
          if (vi % 2 === 0) {
            doc.save().rect(LM, curY, CW, rowH).fill('#fafafa').restore();
          }

          // 1. Visit Date
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.black)
             .text(dateStr, cols[0].x, curY + 5, { width: cols[0].w });

          // 2. Engineer
          doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
             .text(engStr, cols[1].x, curY + 5, { width: cols[1].w });

          // 3. Status Pill
          const sc = statusConfig[v.status] || statusConfig.open;
          pill(sc.label, sc.fg, sc.bg, cols[2].x, curY + 5);

          // 4. Problem / Issue
          doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
             .text(probStr, cols[3].x, curY + 5, { width: cols[3].w });

          // 5. Actions Taken
          doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
             .text(actStr, cols[4].x, curY + 5, { width: cols[4].w });

          // 6. Remarks
          doc.fontSize(8.0).font('Helvetica-Oblique').fillColor(C.mid)
             .text(remStr, cols[5].x, curY + 5, { width: cols[5].w });

          hRule(curY + rowH, '#e2e8f0', 0.5);
          curY += rowH;
        });
      }

      curY += 14;
    }

    // Footers
    const totalPages = doc.bufferedPageRange().count;
    for (let p = 0; p < totalPages; p++) {
      doc.switchToPage(p);
      hRule(PH - 28, C.light, 0.5);
      doc.fontSize(7.5).font('Helvetica').fillColor(C.muted)
         .text(`FSM — Field Service Management Report  ·  ${monthLabel}`, LM, PH - 20)
         .text(`Page ${p + 1} of ${totalPages}`, LM, PH - 20, { width: CW, align: 'right' });
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET Excel ─────────────────────────────────────────────────────────────────
router.get('/monthly/excel', async (req, res) => {
  try {
    const month      = req.query.month || new Date().toISOString().slice(0, 7);
    const data       = getMonthData(month);
    const monthLabel = new Date(`${month}-15`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'FSM App';
    wb.created  = new Date();

    const sheet = wb.addWorksheet('Monthly Service Report');

    sheet.views = [{ showGridLines: true }];

    sheet.columns = [
      { key: 'col1', width: 15 }, // Date
      { key: 'col2', width: 22 }, // Engineer
      { key: 'col3', width: 14 }, // Status
      { key: 'col4', width: 35 }, // Problem
      { key: 'col5', width: 40 }, // Actions Taken
      { key: 'col6', width: 30 }, // Remarks
    ];

    const titleFont = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    const titleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    const sectionFont = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    const sectionFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    const thFont = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
    const thFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    const borderStyle = {
      top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right:  { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    const statusBgs = {
      OPEN:     'FFFEE2E2',
      RESOLVED: 'FFD1FAE5',
      PENDING:  'FFFEF3C7',
    };
    const statusFgs = {
      OPEN:     'FFB91C1C',
      RESOLVED: 'FF15803D',
      PENDING:  'FFB45309',
    };

    sheet.mergeCells('A1:F1');
    const titleRow = sheet.getRow(1);
    titleRow.height = 36;
    const titleCell = titleRow.getCell(1);
    titleCell.value = `FIELD SERVICE MANAGEMENT REPORT — ${monthLabel.toUpperCase()}`;
    titleCell.font = titleFont;
    titleCell.fill = titleFill;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A2:F2');
    const subRow = sheet.getRow(2);
    subRow.height = 20;
    const subCell = subRow.getCell(1);
    subCell.value = `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.addRow([]);

    data.forEach(item => {
      const custRow = sheet.addRow([
        `CUSTOMER: ${item.customer.name}   |   Contact: ${item.customer.contact_person || '—'}   |   Phone: ${item.customer.phone || '—'}   |   Address: ${item.customer.address || '—'}`
      ]);
      sheet.mergeCells(`A${custRow.number}:F${custRow.number}`);
      custRow.height = 26;
      
      const cCell = custRow.getCell(1);
      cCell.font = sectionFont;
      cCell.fill = sectionFill;
      cCell.alignment = { vertical: 'middle', indent: 1 };
      cCell.border = { bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } } };

      const statsRow = sheet.addRow([
        `Visits: ${item.summary.total}   ·   Open: ${item.summary.open}   ·   Resolved: ${item.summary.resolved}   ·   Pending: ${item.summary.pending}`
      ]);
      sheet.mergeCells(`A${statsRow.number}:F${statsRow.number}`);
      statsRow.height = 18;
      const sCell = statsRow.getCell(1);
      sCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      sCell.alignment = { vertical: 'middle', indent: 1 };

      const headerRow = sheet.addRow([
        'Visit Date',
        'Engineer',
        'Status',
        'Problem / Issue',
        'Actions Taken',
        'Remarks'
      ]);
      headerRow.height = 20;
      headerRow.eachCell((cell) => {
        cell.font = thFont;
        cell.fill = thFill;
        cell.alignment = { vertical: 'middle', horizontal: cell.col === 3 ? 'center' : 'left' };
        cell.border = borderStyle;
      });

      if (item.visits.length === 0) {
        const emptyRow = sheet.addRow(['No visits logged for this month.']);
        sheet.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
        emptyRow.height = 20;
        const eCell = emptyRow.getCell(1);
        eCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
        eCell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        item.visits.forEach(v => {
          const statusKey = (v.status || 'OPEN').toUpperCase();
          const row = sheet.addRow([
            v.visit_date,
            v.engineer_name || '—',
            statusKey,
            v.problem || '—',
            v.actions_taken || '—',
            v.remarks || '—'
          ]);
          row.height = 24;

          row.eachCell((cell) => {
            cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };
            cell.border = borderStyle;
            cell.alignment = { vertical: 'middle', wrapText: true };

            if (cell.col === 3) {
              cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: statusFgs[statusKey] || 'FF475569' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBgs[statusKey] || 'FFF1F5F9' } };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          });
        });
      }

      sheet.addRow([]);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="FSM_Report_${month}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
