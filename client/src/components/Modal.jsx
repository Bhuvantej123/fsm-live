import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = '560px' }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" style={{ maxWidth }}>
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
