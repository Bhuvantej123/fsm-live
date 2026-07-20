const CFG = {
  open:     { label: 'Open',     cls: 'badge-open'     },
  resolved: { label: 'Resolved', cls: 'badge-resolved' },
  pending:  { label: 'Pending',  cls: 'badge-pending'  },
  closed:   { label: 'Closed',   cls: 'badge-closed'   },
}

export default function StatusBadge({ status }) {
  const { label, cls } = CFG[status] || CFG.open
  return (
    <span className={`badge ${cls}`}>
      <span style={{ fontSize: 7 }}>●</span> {label}
    </span>
  )
}
