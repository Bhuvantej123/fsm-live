import { useState } from 'react'
import { ChevronDown, ChevronUp, Edit2, Trash2, Calendar, User, Paperclip } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { uploadsUrl } from '../api'

export default function VisitCard({ visit, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card visit-card">
      {/* ── Header (always visible) ── */}
      <div className="visit-card-header" onClick={() => setOpen(o => !o)}>
        <div className="visit-date-icon">
          <Calendar size={20} color="var(--primary-light)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>{visit.visit_date}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--text-sec)' }}>
              <User size={12} /> {visit.engineer_name || 'Unassigned'}
            </span>
            <StatusBadge status={visit.status} />
            {visit.attachments?.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                <Paperclip size={11} /> {visit.attachments.length}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onEdit && (
            <button
              className="btn btn-icon btn-sm"
              onClick={e => { e.stopPropagation(); onEdit(visit) }}
              title="Edit"
            >
              <Edit2 size={13} />
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-danger btn-sm"
              onClick={e => { e.stopPropagation(); onDelete(visit.id) }}
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          )}
          {open
            ? <ChevronUp size={17} color="var(--text-muted)" />
            : <ChevronDown size={17} color="var(--text-muted)" />
          }
        </div>
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div className="visit-body">
          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {visit.problem && (
              <div>
                <div className="visit-field-label">Problem / Issue</div>
                <div className="visit-field-value">{visit.problem}</div>
              </div>
            )}
            {visit.actions_taken && (
              <div>
                <div className="visit-field-label">Actions Taken</div>
                <div className="visit-field-value">{visit.actions_taken}</div>
              </div>
            )}
            {visit.remarks && (
              <div>
                <div className="visit-field-label">Remarks</div>
                <div className="visit-field-value">{visit.remarks}</div>
              </div>
            )}
            {visit.attachments?.length > 0 && (
              <div>
                <div className="visit-field-label">Attachments</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {visit.attachments.map(att => (
                    <a
                      key={att.id}
                      href={`${uploadsUrl}/${att.filename}`}
                      target="_blank"
                      rel="noreferrer"
                      className="chip"
                      style={{ textDecoration: 'none' }}
                    >
                      <Paperclip size={11} /> {att.original_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
