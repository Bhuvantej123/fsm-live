import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, UserCog, Mail, Phone } from 'lucide-react'
import { api } from '../api'
import Modal from '../components/Modal'
import { useConfirm } from '../components/ConfirmDialog'

const EMPTY = { name: '', email: '', phone: '' }

export default function EngineersPage() {
  const [engineers, setEngineers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')
  const { confirm, dialog: confirmDialog } = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try { setEngineers(await api.getEngineers()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd  = () => { setForm(EMPTY); setErr(''); setModal('add') }
  const openEdit = e  => { setForm({ ...e }); setErr(''); setModal(e) }

  const save = async ev => {
    ev.preventDefault(); setBusy(true); setErr('')
    try {
      if (modal === 'add') await api.createEngineer(form)
      else                  await api.updateEngineer(modal.id, form)
      setModal(null); load()
    } catch (ex) { setErr(ex.message) }
    finally { setBusy(false) }
  }

  const remove = async id => {
    const ok = await confirm('Delete this engineer? They will be unassigned from all visits.')
    if (!ok) return
    try { await api.deleteEngineer(id); load() }
    catch (ex) { alert(ex.message) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const avatarColors = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6']

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Engineers</h1>
          <p className="page-subtitle">{engineers.length} field engineer{engineers.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="btn-add-engineer" className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Engineer
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : engineers.length === 0 ? (
        <div className="empty-state">
          <UserCog size={46} style={{ opacity: .22 }} />
          <h3>No engineers yet</h3>
          <p>Add engineers to assign them to service visits</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {engineers.map((eng, i) => (
            <div key={eng.id} className="card" style={{ padding: '22px 22px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: avatarColors[i % avatarColors.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, color: '#fff'
                }}>
                  {eng.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{eng.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Field Engineer</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
                {eng.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-sec)' }}>
                    <Mail size={13} color="var(--text-muted)" /> {eng.email}
                  </div>
                )}
                {eng.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-sec)' }}>
                    <Phone size={13} color="var(--text-muted)" /> {eng.phone}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openEdit(eng)}>
                  <Edit2 size={13} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(eng.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDialog}
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Engineer' : 'Edit Engineer'} maxWidth="460px">
        <form onSubmit={save}>
          {err && <div className="alert-error">{err}</div>}
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Rajesh Kumar" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} placeholder="rajesh@fsm.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210" />
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
