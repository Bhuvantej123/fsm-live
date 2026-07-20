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
    SELECT DISTINCT c.* FROM customers c
    JOIN visits v ON c.id = v.customer_id
    WHERE v.visit_date::text >= ? AND v.visit_date::text <= ?
    ORDER BY c.name
  ` : `
    SELECT DISTINCT c.* FROM customers c
    JOIN visits v ON c.id = v.customer_id
    WHERE v.visit_date >= ? AND v.visit_date <= ?
    ORDER BY c.name
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

// ── GET PDF ───────────────────────────────────────────────────────────────────
router.get('/monthly/pdf', (req, res) => {
  try {
    const month      = req.query.month || new Date().toISOString().slice(0, 7);
    const data       = getMonthData(month);
    const monthLabel = new Date(`${month}-15`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="FSM_Report_${month}.pdf"`);

    const doc = new PDFDoc({ margin: 45, size: 'A4', bufferPages: true, autoFirstPage: true });
    doc.pipe(res);

    const PW  = doc.page.width;          // 595
    const PH  = doc.page.height;         // 842
    const LM  = 45;                      // left margin
    const RM  = PW - 45;                 // right margin
    const CW  = RM - LM;                 // content width  ≈ 505

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
      const ph = 11, pw2 = tw + 8, r = 2;
      doc.save().roundedRect(x, y - 1, pw2, ph, r).fill(bg);
      doc.fillColor(fg).fontSize(7.5).font('Helvetica-Bold').text(text, x + 4, y + 0.5).restore();
      return pw2;
    };

    // Total summary values
    const totalVisits   = data.reduce((s, r) => s + r.summary.total, 0);
    const totalOpen     = data.reduce((s, r) => s + r.summary.open, 0);
    const totalResolved = data.reduce((s, r) => s + r.summary.resolved, 0);
    const totalPending  = data.reduce((s, r) => s + r.summary.pending, 0);

    // Header Accent
    doc.rect(0, 0, PW, 6).fill(C.indigo);

    doc.fillColor(C.indigo).rect(LM, 22, 4, 38).fill();
    doc.fontSize(20).font('Helvetica-Bold').fillColor(C.black)
       .text('Field Service Management Report', LM + 14, 22);
    doc.fontSize(11).font('Helvetica').fillColor(C.mid)
       .text(`Monthly Summary  ·  ${monthLabel}`, LM + 14, 46);

    const genDate = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    doc.fontSize(8.5).font('Helvetica').fillColor(C.muted)
       .text(`Generated: ${genDate}`, LM, 25, { width: CW, align: 'right' });

    hRule(72, C.indigo, 1);

    // KPI Summary
    const kpiY  = 82;
    const kpiH  = 52;
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
      doc.fontSize(18).font('Helvetica-Bold').fillColor(k.color)
         .text(String(k.value), cx - 30, kpiY + 10, { width: 60, align: 'center' });
      doc.fontSize(7).font('Helvetica-Bold').fillColor(C.muted)
         .text(k.label.toUpperCase(), cx - 30, kpiY + 34, { width: 60, align: 'center' });
    });

    for (let i = 1; i < kpis.length; i++) {
      const dx = LM + i * (CW / kpis.length);
      doc.save().strokeColor('#e2e8f0').lineWidth(0.5)
         .moveTo(dx, kpiY + 10).lineTo(dx, kpiY + kpiH - 10).stroke().restore();
    }

    let curY = kpiY + kpiH + 18;

    // Customer Sections
    for (const item of data) {
      if (curY > PH - 120) {
        doc.addPage();
        doc.rect(0, 0, PW, 6).fill(C.indigo);
        curY = 24;
      }

      // Customer Header
      doc.save().roundedRect(LM, curY, CW, 44, 4).fill(C.bg).restore();
      doc.save().roundedRect(LM, curY, CW, 44, 4).lineWidth(0.5).strokeColor(C.light).stroke().restore();
      doc.save().rect(LM, curY, 4, 44).fill(C.indigo).restore();

      doc.fontSize(11).font('Helvetica-Bold').fillColor(C.black)
         .text(item.customer.name, LM + 14, curY + 7, { width: CW * 0.58 });

      const meta = [item.customer.contact_person, item.customer.phone, item.customer.address]
        .filter(Boolean).join('  ·  ');
      if (meta) {
        doc.fontSize(8).font('Helvetica').fillColor(C.mid)
           .text(meta, LM + 14, curY + 25, { width: CW * 0.58 });
      }

      const stats = [
        { l: 'Visits',   v: item.summary.total,    c: C.indigo },
        { l: 'Open',     v: item.summary.open,      c: C.red    },
        { l: 'Resolved', v: item.summary.resolved,  c: C.green  },
        { l: 'Pending',  v: item.summary.pending,   c: C.amber  },
      ];
      stats.forEach((s, si) => {
        const sx = RM - (stats.length - si) * 62 + 10;
        doc.fontSize(12).font('Helvetica-Bold').fillColor(s.c)
           .text(String(s.v), sx, curY + 8, { width: 52, align: 'center' });
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C.muted)
           .text(s.l.toUpperCase(), sx, curY + 27, { width: 52, align: 'center' });
      });

      curY += 52;

      // Table Header
      const drawTableHead = (y) => {
        doc.save().rect(LM, y, CW, 16).fill('#f1f5f9').restore();
        const cols = [
          { label: 'DATE',         x: LM + 6,   w: 68  },
          { label: 'ENGINEER',     x: LM + 76,  w: 90  },
          { label: 'STATUS',       x: LM + 170, w: 60  },
          { label: 'PROBLEM / ACTIONS / REMARKS', x: LM + 234, w: CW - 238 },
        ];
        cols.forEach(col => {
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C.mid)
             .text(col.label, col.x, y + 4, { width: col.w });
        });
      };

      drawTableHead(curY);
      curY += 18;

      // Visit Rows
      item.visits.forEach((v, vi) => {
        const rw = CW - 238;
        const formattedDate = formatDate(v.visit_date);
        
        let textH = 0;
        if (v.problem) textH += doc.fontSize(8).heightOfString(`Problem: ${v.problem}`, { width: rw });
        if (v.actions_taken) textH += doc.fontSize(8).heightOfString(`Actions: ${v.actions_taken}`, { width: rw });
        if (v.remarks) textH += doc.fontSize(7.5).heightOfString(`Remarks: ${v.remarks}`, { width: rw });

        const dateH = doc.fontSize(8.5).heightOfString(formattedDate, { width: 68 });
        const engH  = doc.fontSize(8.5).heightOfString(v.engineer_name || '—', { width: 90 });
        
        const rowH  = Math.max(34, textH + 14, dateH + 12, engH + 12);

        if (curY + rowH > PH - 50) {
          doc.addPage();
          doc.rect(0, 0, PW, 6).fill(C.indigo);
          curY = 24;
          drawTableHead(curY);
          curY += 18;
        }

        if (vi % 2 === 0) {
          doc.save().rect(LM, curY, CW, rowH).fill('#fafafa').restore();
        }

        // Date (Clean YYYY-MM-DD format)
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.black)
           .text(formattedDate, LM + 6, curY + 6, { width: 68 });

        // Engineer
        doc.fontSize(8.5).font('Helvetica').fillColor(C.dark)
           .text(v.engineer_name || '—', LM + 76, curY + 6, { width: 90 });

        // Status pill
        const sc = statusConfig[v.status] || statusConfig.open;
        pill(sc.label, sc.fg, sc.bg, LM + 170, curY + 6);

        // Problem / Actions / Remarks
        let ty = curY + 6;
        const rx = LM + 234;

        if (v.problem) {
          doc.fontSize(8).font('Helvetica-Bold').fillColor(C.black).text('Problem: ', rx, ty, { continued: true });
          doc.font('Helvetica').fillColor(C.dark).text(v.problem, { width: rw });
          ty = doc.y + 3;
        }
        if (v.actions_taken) {
          doc.fontSize(8).font('Helvetica-Bold').fillColor(C.black).text('Actions: ', rx, ty, { continued: true });
          doc.font('Helvetica').fillColor(C.dark).text(v.actions_taken, { width: rw });
          ty = doc.y + 3;
        }
        if (v.remarks) {
          doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(C.muted).text(`Remarks: ${v.remarks}`, rx, ty, { width: rw });
          ty = doc.y + 3;
        }

        hRule(curY + rowH, '#e2e8f0', 0.5);
        curY += rowH;
      });

      curY += 16;
    }

    // Footers
    const totalPages = doc.bufferedPageRange().count;
    for (let p = 0; p < totalPages; p++) {
      doc.switchToPage(p);
      hRule(PH - 34, C.light, 0.5);
      doc.fontSize(7.5).font('Helvetica').fillColor(C.muted)
         .text(`FSM — Field Service Management  ·  ${monthLabel}`, LM, PH - 26)
         .text(`Page ${p + 1} of ${totalPages}`, LM, PH - 26, { width: CW, align: 'right' });
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
      cCell.border = { bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } };

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
