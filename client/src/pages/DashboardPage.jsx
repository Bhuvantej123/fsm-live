import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, Eye, Trash2,
  ClipboardList, AlertCircle, Clock, CheckCircle, Activity
} from 'lucide-react'
import { api } from '../api'
import StatusBadge from '../components/StatusBadge'
import Modal       from '../components/Modal'
import VisitForm   from '../components/VisitForm'
import { useConfirm } from '../components/ConfirmDialog'

export default function DashboardPage() {
  const [visits,    setVisits]    = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [filters,   setFilters]   = useState({ status: '', start_date: '', end_date: '', search: '' })
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const nav = useNavigate()
  const { confirm, dialog: confirmDialog } = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status)     params.status     = filters.status
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date)   params.end_date   = filters.end_date
      if (filters.search)     params.search     = filters.search

      const [v, a] = await Promise.all([api.getVisits(params), api.getAnalytics()])
      setVisits(v); setAnalytics(a)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  const remove = async id => {
    const ok = await confirm('This will permanently delete the visit and its attachments.')
    if (!ok) return
    try { await api.deleteVisit(id); load() }
    catch (ex) { alert(ex.message) }
  }

  const f = analytics?.totals || {}

  return (
    <div>
      {/* ── KPI Cards ── */}
      <div className="kpi-grid">
        {[
          { label: 'Total Visits', value: f.total || 0,          cls: 'kpi-primary', icon: <ClipboardList size={22} color="var(--primary-light)" />, bg: 'rgba(99,102,241,.14)' },
          { label: 'Open Issues',  value: f.open_count || 0,     cls: 'kpi-danger',  icon: <AlertCircle   size={22} color="#fca5a5" />,              bg: 'rgba(239,68,68,.14)' },
          { label: 'Pending',      value: f.pending_count || 0,  cls: 'kpi-warning', icon: <Clock         size={22} color="#fcd34d" />,              bg: 'rgba(245,158,11,.14)' },
          { label: 'Resolved',     value: f.resolved_count || 0, cls: 'kpi-success', icon: <CheckCircle   size={22} color="#6ee7b7" />,              bg: 'rgba(16,185,129,.14)' },
        ].map(({ label, value, cls, icon, bg }) => (
          <div key={label} className={`card kpi-card ${cls}`}>
            <div className="kpi-icon" style={{ background: bg }}>{icon}</div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Visits table ── */}
      <div className="card">
        {/* Filter bar */}
        <div className="filter-bar">
          <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-wrap">
              <Search size={15} className="s-icon" />
              <input
                id="dashboard-search"
                className="form-control"
                style={{ paddingLeft: 36, minWidth: 220 }}
                placeholder="Search visits…"
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>

            <select
              id="dashboard-status"
              className="form-control"
              style={{ width: 140 }}
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <input type="date" className="form-control" style={{ width: 155 }}
              value={filters.start_date}
              onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))}
            />
            <input type="date" className="form-control" style={{ width: 155 }}
              value={filters.end_date}
              onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))}
            />
          </div>

          <button id="btn-new-visit" className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Visit
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Activity size={28} style={{ marginBottom: 10, opacity: .4 }} />
            <div>Loading…</div>
          </div>
        ) : visits.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={46} style={{ opacity: .25 }} />
            <h3>No visits found</h3>
            <p>Try adjusting filters or log a new visit</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-only-view">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Engineer</th>
                      <th>Problem</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(v => (
                      <tr key={v.id}>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-sec)' }}>{v.visit_date}</td>
                        <td>
                          <span
                            style={{ color: 'var(--primary-light)', cursor: 'pointer', fontWeight: 500 }}
                            onClick={() => nav(`/customers/${v.customer_id}`)}
                          >
                            {v.customer_name}
                          </span>
                        </td>
                        <td style={{ color: v.engineer_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {v.engineer_name || '—'}
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-sec)', fontSize: 13 }}>
                            {v.problem || '—'}
                          </div>
                        </td>
                        <td><StatusBadge status={v.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-icon btn-sm" title="View Customer" onClick={() => nav(`/customers/${v.customer_id}`)}>
                              <Eye size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" title="Delete" onClick={() => remove(v.id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List View */}
            <div className="mobile-only-view" style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visits.map(v => (
                <div className="card" key={v.id} style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sec)' }}>{v.visit_date}</span>
                    <StatusBadge status={v.status} />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Customer</div>
                    <div
                      style={{ fontSize: 14, color: 'var(--primary-light)', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => nav(`/customers/${v.customer_id}`)}
                    >
                      {v.customer_name}
                    </div>
                  </div>

                  <div className="grid-2-col" style={{ marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Engineer</div>
                      <div style={{ fontSize: 13, color: 'var(--text-sec)' }}>{v.engineer_name || 'Unassigned'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Problem</div>
                      <div style={{ fontSize: 13, color: 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.problem || '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => nav(`/customers/${v.customer_id}`)}>
                      <Eye size={12} /> View Customer
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(v.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {confirmDialog}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Log New Visit" maxWidth="620px">
        <VisitForm onSuccess={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  )
}
