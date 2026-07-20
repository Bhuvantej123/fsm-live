import { useState, useEffect } from 'react'
import {
  ClipboardList, AlertCircle, Clock, CheckCircle,
  TrendingUp, Award, Building2
} from 'lucide-react'
import { api } from '../api'

// ── Simple SVG bar chart ──────────────────────────────────────────────────────
function BarChart({ data, colorFn }) {
  if (!data?.length) return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>No data</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="chart-container">
      <div className="chart-bar-wrap">
        {data.map(d => (
          <div key={d.month} className="chart-bar-col">
            <div className="chart-val">{d.count}</div>
            <div
              className="chart-bar"
              title={`${d.month}: ${d.count} visits`}
              style={{
                height: `${Math.max(8, (d.count / max) * 130)}px`,
                background: colorFn ? colorFn(d) : 'linear-gradient(180deg, var(--primary-light), var(--primary-dark))',
                boxShadow: '0 2px 8px rgba(99,102,241,.3)'
              }}
            />
            <div className="chart-label">
              {d.month?.slice(5) /* MM only */}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAnalytics().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics…</div>
  )

  const t = data?.totals || {}
  const eng = data?.engineerPerf || []
  const trend = data?.monthlyTrend || []
  const topCust = data?.topCustomers || []

  const resolveRate = t.total > 0 ? Math.round((t.resolved_count / t.total) * 100) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Service performance overview — all time</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid">
        {[
          { label: 'Total Visits',    value: t.total || 0,          cls: 'kpi-primary', icon: <ClipboardList size={22} color="var(--primary-light)" />, bg: 'rgba(99,102,241,.14)' },
          { label: 'Open Issues',     value: t.open_count || 0,     cls: 'kpi-danger',  icon: <AlertCircle   size={22} color="#fca5a5" />,              bg: 'rgba(239,68,68,.14)' },
          { label: 'Pending',         value: t.pending_count || 0,  cls: 'kpi-warning', icon: <Clock         size={22} color="#fcd34d" />,              bg: 'rgba(245,158,11,.14)' },
          { label: 'Resolved',        value: t.resolved_count || 0, cls: 'kpi-success', icon: <CheckCircle   size={22} color="#6ee7b7" />,              bg: 'rgba(16,185,129,.14)' },
          { label: 'Resolution Rate', value: `${resolveRate}%`,     cls: 'kpi-accent',  icon: <TrendingUp    size={22} color="#67e8f9" />,              bg: 'rgba(6,182,212,.14)' },
        ].map(({ label, value, cls, icon, bg }) => (
          <div key={label} className={`card kpi-card ${cls}`}>
            <div className="kpi-icon" style={{ background: bg }}>{icon}</div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid-2-col" style={{ marginBottom: 20, gap: 20 }}>
        {/* Monthly Trend */}
        <div className="card">
          <div style={{ padding: '18px 20px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Monthly Visit Trend</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingBottom: 14 }}>Last 6 months</div>
          </div>
          <BarChart data={trend} />
        </div>

        {/* Status distribution */}
        <div className="card" style={{ padding: '18px 22px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Status Distribution</div>
          {[
            { label: 'Open',     value: t.open_count || 0,     color: '#ef4444', bg: 'rgba(239,68,68,.14)' },
            { label: 'Pending',  value: t.pending_count || 0,  color: '#f59e0b', bg: 'rgba(245,158,11,.14)' },
            { label: 'Resolved', value: t.resolved_count || 0, color: '#10b981', bg: 'rgba(16,185,129,.14)' },
            { label: 'Closed',   value: t.closed_count || 0,   color: '#64748b', bg: 'rgba(100,116,139,.14)' },
          ].map(({ label, value, color, bg }) => {
            const pct = t.total > 0 ? Math.round((value / t.total) * 100) : 0
            return (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-sec)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{value} ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .6s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Engineer performance & Top customers row */}
      <div className="grid-2-col" style={{ gap: 20 }}>
        {/* Engineer performance */}
        <div className="card">
          <div style={{ padding: '18px 22px 0', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, paddingBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={17} color="var(--primary-light)" /> Engineer Performance
            </div>
          </div>
          {eng.length === 0 ? (
            <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>No engineers found</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Engineer</th>
                    <th>Visits</th>
                    <th>Resolved</th>
                    <th>Open</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {eng.map((e, i) => {
                    const rate = e.total_visits > 0 ? Math.round((e.resolved / e.total_visits) * 100) : 0
                    return (
                      <tr key={e.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                              background: ['#6366f1','#06b6d4','#10b981','#f59e0b'][i % 4],
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, color: '#fff'
                            }}>
                              {e.name.charAt(0)}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{e.name}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{e.total_visits}</td>
                        <td style={{ color: '#6ee7b7', fontWeight: 600 }}>{e.resolved}</td>
                        <td style={{ color: e.open_count > 0 ? '#fca5a5' : 'var(--text-muted)' }}>{e.open_count}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 40, height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${rate}%`, height: '100%', background: '#10b981', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top customers */}
        <div className="card">
          <div style={{ padding: '18px 22px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, paddingBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={17} color="var(--accent)" /> Top Customers by Visits
            </div>
          </div>
          {topCust.length === 0 ? (
            <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Visits</th>
                    <th>Unresolved</th>
                  </tr>
                </thead>
                <tbody>
                  {topCust.map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</td>
                      <td style={{ fontWeight: 700 }}>{c.visit_count}</td>
                      <td>
                        {c.unresolved > 0
                          ? <span style={{ color: '#fca5a5', fontWeight: 700 }}>{c.unresolved}</span>
                          : <span style={{ color: '#6ee7b7', fontWeight: 600 }}>✓</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
