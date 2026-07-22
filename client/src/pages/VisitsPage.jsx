import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Trash2, Eye, Filter, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import Modal       from '../components/Modal'
import VisitForm   from '../components/VisitForm'
import { useConfirm } from '../components/ConfirmDialog'

export default function VisitsPage() {
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || ''

  const [showFilters, setShowFilters] = useState(Boolean(initialStatus))
  const [visits,    setVisits]    = useState([])
  const [engineers, setEngineers] = useState([])
  const [customers, setCustomers] = useState([])
  const [filters,   setFilters]   = useState({
    status: initialStatus, start_date: '', end_date: '', search: '', engineer_id: '', customer_id: ''
  })
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const nav = useNavigate()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const { isAdmin } = useAuth()

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id)

  const activeFilterCount = [filters.status, filters.engineer_id, filters.customer_id, filters.start_date, filters.end_date].filter(Boolean).length

  // Sync status if search params change
  useEffect(() => {
    const s = searchParams.get('status')
    if (s !== null) {
      setFilters(prev => ({ ...prev, status: s }))
      if (s) setShowFilters(true)
    }
  }, [searchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const v = await api.getVisits(params)
      setVisits(v)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    Promise.all([api.getEngineers(), api.getCustomers()]).then(([e, c]) => {
      setEngineers(e); setCustomers(c)
    })
  }, [])

  const remove = async id => {
    const ok = await confirm('This will permanently delete the visit and its attachments.')
    if (!ok) return
    try { await api.deleteVisit(id); load() }
    catch (ex) { alert(ex.message) }
  }

  const openEdit = v => { setEditing(v); setShowForm(true) }
  const f = k => e => setFilters(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Visits</h1>
          <p className="page-subtitle">{visits.length} visit{visits.length !== 1 ? 's' : ''} matching filters</p>
        </div>
        <button id="btn-log-visit" className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus size={16} /> Log Visit
        </button>
      </div>

      {/* Sleek Compact Control Bar */}
      <div className="card" style={{ marginBottom: 20, padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Small compact search box */}
          <div className="search-wrap" style={{ flex: 1, maxWidth: 260 }}>
            <Search size={14} className="s-icon" />
            <input
              id="visits-search"
              className="form-control"
              style={{ paddingLeft: 34, fontSize: 13, height: 38 }}
              placeholder="Search visits…"
              value={filters.search}
              onChange={f('search')}
            />
          </div>

          {/* Filter toggle button */}
          <button
            className={`btn ${showFilters || activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setShowFilters(s => !s)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, flexShrink: 0 }}
          >
            <Filter size={14} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span style={{
                background: 'rgba(255,255,255,0.25)', color: '#fff',
                borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 700
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Filter Drawer */}
        {showFilters && (
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)',
            display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
            animation: 'fadeIn 0.2s ease'
          }}>
            <select className="form-control" style={{ width: 130, height: 36, fontSize: 12.5 }} value={filters.status} onChange={f('status')}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>

            <select className="form-control" style={{ width: 160, height: 36, fontSize: 12.5 }} value={filters.engineer_id} onChange={f('engineer_id')}>
              <option value="">All Engineers</option>
              {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>

            <select className="form-control" style={{ width: 170, height: 36, fontSize: 12.5 }} value={filters.customer_id} onChange={f('customer_id')}>
              <option value="">All Customers</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <input type="date" className="form-control" style={{ width: 140, height: 36, fontSize: 12.5 }} value={filters.start_date} onChange={f('start_date')} />
            <input type="date" className="form-control" style={{ width: 140, height: 36, fontSize: 12.5 }} value={filters.end_date}   onChange={f('end_date')}   />

            {activeFilterCount > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ height: 36, fontSize: 12 }}
                onClick={() => setFilters(prev => ({ ...prev, status: '', start_date: '', end_date: '', engineer_id: '', customer_id: '' }))}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table & Mobile Cards */}
      <div>
        {loading ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : visits.length === 0 ? (
          <div className="card empty-state">
            <ClipboardList size={44} style={{ opacity: .22 }} />
            <h3>No visits found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="card desktop-only-view">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Engineer</th>
                      <th>Problem</th>
                      <th>Actions Taken</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(v => {
                      const isExpanded = expandedId === v.id
                      return (
                        <>
                          <tr
                            key={v.id}
                            onClick={() => toggleExpand(v.id)}
                            style={{ cursor: 'pointer', background: isExpanded ? 'rgba(99,102,241,0.06)' : undefined }}
                          >
                            <td style={{ whiteSpace: 'nowrap', color: 'var(--text-sec)' }}>{v.visit_date}</td>
                            <td>
                              <span
                                style={{ color: 'var(--primary-light)', cursor: 'pointer', fontWeight: 500 }}
                                onClick={e => { e.stopPropagation(); nav(`/customers/${v.customer_id}`) }}
                              >
                                {v.customer_name}
                              </span>
                            </td>
                            <td style={{ color: v.engineer_name ? 'var(--text)' : 'var(--text-muted)' }}>
                              {v.engineer_name || '—'}
                            </td>
                            <td style={{ maxWidth: 200 }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-sec)' }}>
                                {v.problem || '—'}
                              </div>
                            </td>
                            <td style={{ maxWidth: 200 }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)' }}>
                                {v.actions_taken || '—'}
                              </div>
                            </td>
                            <td><StatusBadge status={v.status} /></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                                <button className="btn btn-icon btn-sm" title="View Customer" onClick={() => nav(`/customers/${v.customer_id}`)}>
                                  <Eye size={13} />
                                </button>
                                {isAdmin && (
                                  <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(v)}>
                                    Edit
                                  </button>
                                )}
                                {isAdmin && (
                                  <button className="btn btn-danger btn-sm" title="Delete" onClick={() => remove(v.id)}>
                                    <Trash2 size={13} />
                                  </button>
                                )}
                                {isExpanded
                                  ? <ChevronUp size={14} color="var(--text-muted)" />
                                  : <ChevronDown size={14} color="var(--text-muted)" />
                                }
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${v.id}-detail`} style={{ background: 'rgba(99,102,241,0.04)' }}>
                              <td colSpan={7} style={{ padding: '14px 20px 18px', borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                                  {v.problem && (
                                    <div>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '.06em' }}>Problem / Issue</div>
                                      <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{v.problem}</div>
                                    </div>
                                  )}
                                  {v.actions_taken && (
                                    <div>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '.06em' }}>Actions Taken</div>
                                      <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{v.actions_taken}</div>
                                    </div>
                                  )}
                                  {v.remarks && (
                                    <div>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '.06em' }}>Remarks</div>
                                      <div style={{ fontSize: 13.5, color: 'var(--text-sec)', lineHeight: 1.6 }}>{v.remarks}</div>
                                    </div>
                                  )}
                                  {!v.problem && !v.actions_taken && !v.remarks && (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No details recorded.</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List View */}
            <div className="mobile-only-view" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visits.map(v => {
                const isExpanded = expandedId === v.id
                return (
                  <div className="card" key={v.id} style={{ padding: '16px 18px', border: isExpanded ? '1px solid rgba(99,102,241,.3)' : undefined }}>

                    {/* Tappable header */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, cursor: 'pointer' }}
                      onClick={() => toggleExpand(v.id)}
                    >
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sec)' }}>{v.visit_date}</span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{v.engineer_name || 'Unassigned'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={v.status} />
                        {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {/* Customer name */}
                    <div
                      style={{ fontSize: 14, color: 'var(--primary-light)', fontWeight: 600, cursor: 'pointer', marginBottom: isExpanded ? 14 : 0 }}
                      onClick={() => nav(`/customers/${v.customer_id}`)}
                    >
                      {v.customer_name}
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn 0.15s ease' }}>
                        {v.problem && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5, letterSpacing: '.06em' }}>Problem / Issue</div>
                            <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65 }}>{v.problem}</div>
                          </div>
                        )}
                        {v.actions_taken && (
                          <div style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.07)', borderRadius: 'var(--r-sm)', borderLeft: '3px solid var(--primary)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', marginBottom: 5, letterSpacing: '.06em' }}>Actions Taken</div>
                            <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65 }}>{v.actions_taken}</div>
                          </div>
                        )}
                        {v.remarks && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5, letterSpacing: '.06em' }}>Remarks</div>
                            <div style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.65 }}>{v.remarks}</div>
                          </div>
                        )}
                        {!v.problem && !v.actions_taken && !v.remarks && (
                          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No details recorded.</div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => nav(`/customers/${v.customer_id}`)}>
                            <Eye size={12} /> View Customer
                          </button>
                          {isAdmin && (
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(v)}>
                              Edit
                            </button>
                          )}
                          {isAdmin && (
                            <button className="btn btn-danger btn-sm" onClick={() => remove(v.id)}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {confirmDialog}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null) }}
        title={editing ? 'Edit Visit' : 'Log New Visit'}
        maxWidth="640px"
      >
        <VisitForm
          visit={editing}
          onSuccess={() => { setShowForm(false); setEditing(null); load() }}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      </Modal>
    </div>
  )
}
