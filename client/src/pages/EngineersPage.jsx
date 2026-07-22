import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, UserCog, Mail, Phone, KeyRound, ShieldOff } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { useConfirm } from '../components/ConfirmDialog'

const EMPTY = { name: '', email: '', phone: '' }
const EMPTY_USER = { username: '', password: '' }

export default function EngineersPage() {
  const [engineers, setEngineers] = useState([])
  const [users,     setUsers]     = useState([])   // login accounts
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')

  // Login management modal
  const [loginModal,   setLoginModal]   = useState(null)  // null | engineer obj
  const [loginForm,    setLoginForm]    = useState(EMPTY_USER)
  const [loginBusy,    setLoginBusy]    = useState(false)
  const [loginErr,     setLoginErr]     = useState('')

  const { confirm, dialog: confirmDialog } = useConfirm()
  const { isAdmin } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [engs, usrs] = await Promise.all([api.getEngineers(), isAdmin ? api.getUsers() : Promise.resolve([])])
      setEngineers(engs)
      setUsers(usrs)
    } finally { setLoading(false) }
  }, [isAdmin])

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

  const openLoginModal = eng => {
    const existingUser = users.find(u => u.engineer_id === eng.id)
    setLoginModal({ ...eng, existingUser })
    setLoginForm({ username: existingUser?.username || eng.name.toLowerCase().replace(/\s+/g, '.'), password: '' })
    setLoginErr('')
  }

  const saveLogin = async ev => {
    ev.preventDefault(); setLoginBusy(true); setLoginErr('')
    try {
      const eng = loginModal
      if (eng.existingUser) {
        // Update existing
        await api.updateUser(eng.existingUser.id, {
          username: loginForm.username,
          ...(loginForm.password ? { password: loginForm.password } : {}),
          engineer_id: eng.id,
        })
      } else {
        // Create new
        if (!loginForm.password) { setLoginErr('Password is required for new accounts'); setLoginBusy(false); return }
        await api.createUser({ username: loginForm.username, password: loginForm.password, engineer_id: eng.id })
      }
      setLoginModal(null); load()
    } catch (ex) { setLoginErr(ex.message) }
    finally { setLoginBusy(false) }
  }

  const removeLogin = async user => {
    const ok = await confirm(`Remove login access for "${user.username}"? The engineer record will remain.`)
    if (!ok) return
    try { await api.deleteUser(user.id); load() }
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
        {isAdmin && (
          <button id="btn-add-engineer" className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Engineer
          </button>
        )}
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
          {engineers.map((eng, i) => {
            const linkedUser = users.find(u => u.engineer_id === eng.id)
            return (
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{eng.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Field Engineer</div>
                  </div>
                  {/* Login status badge */}
                  {isAdmin && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 99,
                      background: linkedUser ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.05)',
                      color: linkedUser ? '#34d399' : 'var(--text-muted)',
                      border: '1px solid',
                      borderColor: linkedUser ? 'rgba(16,185,129,.25)' : 'var(--border)',
                      flexShrink: 0,
                    }}>
                      {linkedUser ? `@${linkedUser.username}` : 'No login'}
                    </div>
                  )}
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

                {isAdmin && (
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => openLoginModal(eng)}
                      title={linkedUser ? 'Edit Login' : 'Create Login'}
                    >
                      <KeyRound size={13} /> {linkedUser ? 'Edit Login' : 'Set Login'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(eng)} title="Edit Engineer">
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(eng.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {confirmDialog}

      {/* Engineer Add/Edit Modal */}
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

      {/* Login Management Modal */}
      <Modal
        isOpen={!!loginModal}
        onClose={() => setLoginModal(null)}
        title={loginModal?.existingUser ? `Edit Login — ${loginModal?.name}` : `Create Login — ${loginModal?.name}`}
        maxWidth="420px"
      >
        <form onSubmit={saveLogin}>
          {loginErr && <div className="alert-error" style={{ marginBottom: 12 }}>{loginErr}</div>}

          {loginModal?.existingUser && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 'var(--r-sm)',
              background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)',
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 13, color: '#34d399' }}>
                Active login: <strong>@{loginModal.existingUser.username}</strong>
              </span>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => { removeLogin(loginModal.existingUser); setLoginModal(null) }}
              >
                <ShieldOff size={12} /> Revoke
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              value={loginForm.username}
              onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
              required
              placeholder="e.g. rajesh.kumar"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Password {loginModal?.existingUser && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              className="form-control"
              value={loginForm.password}
              onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              placeholder={loginModal?.existingUser ? 'Leave blank to keep unchanged' : 'Set a password'}
              required={!loginModal?.existingUser}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setLoginModal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loginBusy}>
              {loginBusy ? 'Saving…' : loginModal?.existingUser ? 'Update Login' : 'Create Login'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
