import { useState, useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import { api, uploadsUrl } from '../api'

export default function VisitForm({ visit, customerId, onSuccess, onCancel }) {
  const [engineers, setEngineers] = useState([])
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({
    customer_id:  customerId || visit?.customer_id || '',
    engineer_id:  visit?.engineer_id  || '',
    visit_date:   visit?.visit_date   || new Date().toISOString().slice(0, 10),
    problem:      visit?.problem      || '',
    actions_taken:visit?.actions_taken|| '',
    remarks:      visit?.remarks      || '',
    status:       visit?.status       || 'open',
  })
  const [files, setFiles] = useState([])
  const [busy, setBusy]   = useState(false)
  const [err,  setErr]    = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.all([api.getEngineers(), api.getCustomers()]).then(([e, c]) => {
      setEngineers(e); setCustomers(c)
    })
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))
      files.forEach(f => fd.append('attachments', f))

      if (visit) await api.updateVisit(visit.id, fd)
      else       await api.createVisit(fd)
      onSuccess()
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {err && <div className="alert-error">{err}</div>}

      {!customerId && (
        <div className="form-group">
          <label className="form-label">Customer *</label>
          <select
            className="form-control"
            value={form.customer_id}
            onChange={e => set('customer_id', e.target.value)}
            required
          >
            <option value="">Select customer…</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Engineer</label>
          <select
            className="form-control"
            value={form.engineer_id}
            onChange={e => set('engineer_id', e.target.value)}
          >
            <option value="">Unassigned</option>
            {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Visit Date *</label>
          <input
            type="date" className="form-control"
            value={form.visit_date}
            onChange={e => set('visit_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Status</label>
        <select
          className="form-control"
          value={form.status}
          onChange={e => set('status', e.target.value)}
        >
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Problem / Issue</label>
        <textarea
          className="form-control"
          placeholder="Describe the problem…"
          value={form.problem}
          onChange={e => set('problem', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Actions Taken</label>
        <textarea
          className="form-control"
          placeholder="What was done during the visit…"
          value={form.actions_taken}
          onChange={e => set('actions_taken', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Remarks</label>
        <textarea
          className="form-control"
          style={{ minHeight: 62 }}
          placeholder="Follow-up notes, next steps…"
          value={form.remarks}
          onChange={e => set('remarks', e.target.value)}
        />
      </div>

      {/* ── File upload ── */}
      <div className="form-group">
        <label className="form-label">Attachments</label>
        <label className="upload-zone">
          <Upload size={22} color="var(--text-muted)" />
          <div style={{ fontSize: 13, color: 'var(--text-sec)', marginTop: 6 }}>
            Click to attach files (PDF, images, docs — max 10 MB each)
          </div>
          <input
            type="file" multiple style={{ display: 'none' }}
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
            onChange={e => setFiles(p => [...p, ...e.target.files])}
          />
        </label>

        {files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
            {files.map((f, i) => (
              <span key={i} className="chip">
                {f.name}
                <X
                  size={11} style={{ cursor: 'pointer' }}
                  onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Existing attachments (edit mode) */}
      {visit?.attachments?.length > 0 && (
        <div className="form-group">
          <label className="form-label">Existing Attachments</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {visit.attachments.map(a => (
              <a
                key={a.id}
                href={`${uploadsUrl}/${a.filename}`}
                target="_blank" rel="noreferrer"
                className="chip" style={{ textDecoration: 'none' }}
              >
                {a.original_name}
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : (visit ? 'Update Visit' : 'Log Visit')}
        </button>
      </div>
    </form>
  )
}
