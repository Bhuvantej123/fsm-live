import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, Eye, Users, Building2 } from 'lucide-react'
import { api } from '../api'
import Modal from '../components/Modal'
import { useConfirm } from '../components/ConfirmDialog'

const CONTRACT_LABELS = { amc: 'AMC', premium: 'Premium', standard: 'Standard' }
const CONTRACT_CLS    = { amc: 'ct-amc', premium: 'ct-premium', standard: 'ct-standard' }

const EMPTY = { name: '', contact_person: '', phone: '', email: '', address: '', contract_type: 'standard', notes: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)   // null | 'add' | customer-obj
  const [form,      setForm]      = useState(EMPTY)
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')
  const nav = useNavigate()
  const { confirm, dialog: confirmDialog } = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setCustomers(await api.getCustomers(search ? { search } : {}))
    } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(EMPTY); setErr(''); setModal('add') }
  const openEdit = c => { setForm({ ...c }); setErr(''); setModal(c) }

  const save = async e => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      if (modal === 'add') await api.createCustomer(form)
      else                  await api.updateCustomer(modal.id, form)
      setModal(null); load()
    } catch (ex) { setErr(ex.message) }
    finally { setBusy(false) }
  }

  const remove = async id => {
    const ok = await confirm('This will permanently delete the customer and all their visits.')
    if (!ok) return
    try {
      await api.deleteCustomer(id)
      load()
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="btn-add-customer" className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filter-bar">
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={15} className="s-icon" />
            <input
              id="customer-search"
              className="form-control"
              style={{ paddingLeft: 36 }}
              placeholder="Search by name, contact, email or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table & Mobile Cards */}
      <div>
        {loading ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : customers.length === 0 ? (
          <div className="card empty-state">
            <Users size={46} style={{ opacity: .25 }} />
            <h3>No customers yet</h3>
            <p>Add your first customer to get started</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="card desktop-only-view">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Phone</th>
                      <th>Contract</th>
                      <th>Visits</th>
                      <th>Open</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(99,102,241,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Building2 size={14} color="var(--primary-light)" />
                            </div>
                            {c.name}
                          </div>
                          {c.address && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 38 }}>{c.address}</div>}
                        </td>
                        <td style={{ color: 'var(--text-sec)' }}>{c.contact_person || '—'}</td>
                        <td style={{ color: 'var(--text-sec)' }}>{c.phone || '—'}</td>
                        <td>
                          <span className={`badge ${CONTRACT_CLS[c.contract_type] || 'ct-standard'}`}>
                            {CONTRACT_LABELS[c.contract_type] || c.contract_type}
                          </span>
                        </td>
                        <td><span style={{ fontWeight: 600 }}>{c.total || 0}</span></td>
                        <td>
                          {c.open_count > 0
                            ? <span style={{ color: '#fca5a5', fontWeight: 600 }}>{c.open_count}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>0</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-icon btn-sm" title="View" onClick={() => nav(`/customers/${c.id}`)}>
                              <Eye size={13} />
                            </button>
                            <button className="btn btn-icon btn-sm" title="Edit" onClick={() => openEdit(c)}>
                              <Edit2 size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" title="Delete" onClick={() => remove(c.id)}>
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
            <div className="mobile-only-view" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {customers.map(c => (
                <div className="card" key={c.id} style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} color="var(--primary-light)" />
                      {c.name}
                    </div>
                    <span className={`badge ${CONTRACT_CLS[c.contract_type] || 'ct-standard'}`} style={{ fontSize: 10.5 }}>
                      {CONTRACT_LABELS[c.contract_type] || c.contract_type}
                    </span>
                  </div>

                  {c.address && (
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
                      {c.address}
                    </div>
                  )}

                  <div className="grid-2-col" style={{ padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Contact</div>
                      <div style={{ fontSize: 13, color: 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contact_person || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Phone</div>
                      <div style={{ fontSize: 13, color: 'var(--text-sec)' }}>{c.phone || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Visits</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{c.total || 0} visits</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Open Issues</div>
                      <div style={{ fontSize: 13, color: c.open_count > 0 ? '#f87171' : 'var(--text-sec)', fontWeight: 600 }}>
                        {c.open_count || 0} open
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => nav(`/customers/${c.id}`)}>
                      <Eye size={12} /> View Detail
                    </button>
                    <button className="btn btn-icon btn-sm" onClick={() => openEdit(c)}>
                      <Edit2 size={12} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Customer' : 'Edit Customer'}
        maxWidth="580px"
      >
        <form onSubmit={save}>
          {err && <div className="alert-error">{err}</div>}

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Company Name *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. TechCorp Industries" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input className="form-control" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="e.g. Vikram Nair" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 044-22345678" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@company.in" />
            </div>
            <div className="form-group">
              <label className="form-label">Contract Type</label>
              <select className="form-control" value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
                <option value="standard">Standard</option>
                <option value="amc">AMC</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Address</label>
              <input className="form-control" value={form.address} onChange={e => set('address', e.target.value)} placeholder="City, State" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-control" style={{ minHeight: 60 }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
