import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Phone, Mail, MapPin,
  Building2, ClipboardList, CheckCircle, Clock, AlertCircle, Edit2
} from 'lucide-react'
import { api } from '../api'
import VisitCard  from '../components/VisitCard'
import Modal      from '../components/Modal'
import VisitForm  from '../components/VisitForm'
import StatusBadge from '../components/StatusBadge'
import { useConfirm } from '../components/ConfirmDialog'

const CONTRACT_LABELS = { amc: 'AMC', premium: 'Premium', standard: 'Standard' }
const CONTRACT_CLS    = { amc: 'ct-amc', premium: 'ct-premium', standard: 'ct-standard' }

export default function CustomerDetailPage() {
  const { id }   = useParams()
  const nav      = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [visits,   setVisits]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const { confirm, dialog: confirmDialog } = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, v] = await Promise.all([
        api.getCustomer(id),
        api.getVisits({ customer_id: id, with_attachments: 'true' })
      ])
      setCustomer(c); setVisits(v)
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const remove = async vid => {
    const ok = await confirm('This will permanently delete the visit and its attachments.')
    if (!ok) return
    try { await api.deleteVisit(vid); load() }
    catch (ex) { alert(ex.message) }
  }

  const filtered = filter
    ? visits.filter(v => v.status === filter)
    : visits

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
  if (!customer) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Customer not found.</div>

  const counts = {
    total:    visits.length,
    open:     visits.filter(v => v.status === 'open').length,
    resolved: visits.filter(v => v.status === 'resolved').length,
    pending:  visits.filter(v => v.status === 'pending').length,
  }

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={() => nav('/customers')}>
        <ArrowLeft size={15} /> Back to Customers
      </button>

      {/* Customer Info Card */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,rgba(99,102,241,.25),rgba(6,182,212,.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={28} color="var(--primary-light)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>{customer.name}</h2>
              <span className={`badge ${CONTRACT_CLS[customer.contract_type] || 'ct-standard'}`}>
                {CONTRACT_LABELS[customer.contract_type] || customer.contract_type}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {customer.contact_person && (
                <span style={{ fontSize: 13, color: 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Building2 size={13} /> {customer.contact_person}
                </span>
              )}
              {customer.phone && (
                <span style={{ fontSize: 13, color: 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Phone size={13} /> {customer.phone}
                </span>
              )}
              {customer.email && (
                <span style={{ fontSize: 13, color: 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Mail size={13} /> {customer.email}
                </span>
              )}
              {customer.address && (
                <span style={{ fontSize: 13, color: 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MapPin size={13} /> {customer.address}
                </span>
              )}
            </div>
            {customer.notes && (
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {customer.notes}
              </div>
            )}
          </div>
        </div>

        {/* Mini KPIs */}
        <div style={{ display: 'flex', gap: 14, marginTop: 22, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: counts.total,    icon: <ClipboardList size={14} />, color: 'var(--primary-light)' },
            { label: 'Open',  value: counts.open,     icon: <AlertCircle   size={14} />, color: '#fca5a5' },
            { label: 'Pending', value: counts.pending, icon: <Clock        size={14} />, color: '#fcd34d' },
            { label: 'Resolved', value: counts.resolved, icon: <CheckCircle size={14} />, color: '#6ee7b7' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{
              padding: '10px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ color }}>{icon}</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{value}</span>
              <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Visits Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'open', 'pending', 'resolved', 'closed'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(s)}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus size={14} /> Log Visit
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={42} style={{ opacity: .22 }} />
          <h3>No visits</h3>
          <p>{filter ? `No ${filter} visits for this customer` : 'Log the first visit to get started'}</p>
        </div>
      ) : (
        filtered.map(v => (
          <VisitCard
            key={v.id} visit={v}
            onEdit={v2 => { setEditing(v2); setShowForm(true) }}
            onDelete={remove}
          />
        ))
      )}

      {confirmDialog}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null) }}
        title={editing ? 'Edit Visit' : 'Log New Visit'}
        maxWidth="620px"
      >
        <VisitForm
          visit={editing}
          customerId={id}
          onSuccess={() => { setShowForm(false); setEditing(null); load() }}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      </Modal>
    </div>
  )
}
