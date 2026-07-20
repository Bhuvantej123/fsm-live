import { useState, useEffect } from 'react'
import { FileText, Download, RefreshCw, FileSpreadsheet, Building2 } from 'lucide-react'
import { api } from '../api'
import StatusBadge from '../components/StatusBadge'

function monthLabel(m) {
  return new Date(`${m}-15`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function ReportsPage() {
  const now = new Date()
  const [month,   setMonth]   = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.getReport(month)
      setData(res.data); setLoaded(true)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month])

  const totals = {
    total:    data.reduce((s, r) => s + r.summary.total,    0),
    open:     data.reduce((s, r) => s + r.summary.open,     0),
    resolved: data.reduce((s, r) => s + r.summary.resolved, 0),
    pending:  data.reduce((s, r) => s + r.summary.pending,  0),
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Reports</h1>
          <p className="page-subtitle">Customer-wise service summary with export</p>
        </div>
        <div className="reports-filter-row" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="month"
            className="form-control"
            style={{ width: 170 }}
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
          <a
            href={api.reportPdfUrl(month)}
            target="_blank" rel="noreferrer"
            className="btn btn-danger"
            title="Export PDF"
          >
            <FileText size={16} /> PDF
          </a>
          <a
            href={api.reportExcelUrl(month)}
            className="btn btn-success"
            title="Export Excel"
          >
            <FileSpreadsheet size={16} /> Excel
          </a>
        </div>
      </div>

      {/* Month header */}
      <div className="card reports-month-header-card" style={{ padding: '18px 24px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{monthLabel(month)}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {data.length} customer{data.length !== 1 ? 's' : ''} with visits
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Total', value: totals.total,    color: 'var(--primary-light)' },
            { label: 'Open',  value: totals.open,     color: '#fca5a5' },
            { label: 'Pending', value: totals.pending, color: '#fcd34d' },
            { label: 'Resolved', value: totals.resolved, color: '#6ee7b7' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ opacity: .3, marginBottom: 10 }} />
          <div>Generating report…</div>
        </div>
      ) : data.length === 0 ? (
        <div className="card empty-state">
          <FileText size={44} style={{ opacity: .22 }} />
          <h3>No visits in {monthLabel(month)}</h3>
          <p>Select a different month or log visits first</p>
        </div>
      ) : (
        data.map(item => (
          <div key={item.customer.id} className="card" style={{ marginBottom: 18 }}>
            {/* Customer header */}
            <div className="reports-customer-header" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,.15)', display: 'flex', alignItems: 'center', justifycontent: 'center', flexShrink: 0 }}>
                <Building2 size={18} color="var(--primary-light)" style={{ margin: '11px 0 0 11px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{item.customer.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {item.customer.contact_person && `${item.customer.contact_person} · `}
                  {item.customer.address}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { l: 'Visits',   v: item.summary.total,    c: 'var(--text-primary)' },
                  { l: 'Open',     v: item.summary.open,     c: '#fca5a5' },
                  { l: 'Resolved', v: item.summary.resolved, c: '#6ee7b7' },
                  { l: 'Pending',  v: item.summary.pending,  c: '#fcd34d' },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ textAlign: 'center', minWidth: 44 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visits List / Table */}
            <div>
              {/* Desktop View Table */}
              <div className="desktop-only-view">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Engineer</th>
                        <th>Problem</th>
                        <th>Actions Taken</th>
                        <th>Remarks</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.visits.map(v => (
                        <tr key={v.id}>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--text-sec)', fontSize: 13 }}>{v.visit_date}</td>
                          <td style={{ color: 'var(--text-sec)', fontSize: 13 }}>{v.engineer_name || '—'}</td>
                          <td style={{ maxWidth: 220 }}>
                            <div style={{ fontSize: 13, color: 'var(--text-sec)' }}>{v.problem || '—'}</div>
                          </td>
                          <td style={{ maxWidth: 220 }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{v.actions_taken || '—'}</div>
                          </td>
                          <td style={{ maxWidth: 180 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{v.remarks || '—'}</div>
                          </td>
                          <td><StatusBadge status={v.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile View Stacked Cards */}
              <div className="mobile-only-view" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {item.visits.map(v => (
                  <div key={v.id} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.015)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--text-sec)' }}>
                      <span>{v.visit_date}</span>
                      <StatusBadge status={v.status} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', marginRight: 4 }}>Engineer:</span>
                      {v.engineer_name || 'Unassigned'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', marginRight: 4 }}>Problem:</span>
                      {v.problem || '—'}
                    </div>
                    {v.actions_taken && (
                      <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', marginRight: 4 }}>Actions:</span>
                        {v.actions_taken}
                      </div>
                    )}
                    {v.remarks && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', marginRight: 4 }}>Remarks:</span>
                        {v.remarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
