import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Modal from './Modal'

/**
 * ConfirmDialog — drop-in replacement for window.confirm()
 *
 * Usage:
 *   const { dialog, confirm } = useConfirm()
 *   ...
 *   await confirm('Are you sure?')   // returns true / false
 *   ...
 *   {dialog}
 */
export function useConfirm() {
  const [state, setState] = useState({ open: false, message: '', resolve: null })

  const confirm = (message) =>
    new Promise(resolve => {
      setState({ open: true, message, resolve })
    })

  const handleYes = () => {
    state.resolve(true)
    setState(s => ({ ...s, open: false }))
  }

  const handleNo = () => {
    state.resolve(false)
    setState(s => ({ ...s, open: false }))
  }

  const dialog = (
    <Modal isOpen={state.open} onClose={handleNo} title="" maxWidth="420px">
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(239,68,68,.14)', border: '1px solid rgba(239,68,68,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px'
        }}>
          <AlertTriangle size={26} color="#f87171" />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Confirm Action</h3>
        <p style={{ fontSize: 14, color: 'var(--text-sec)', lineHeight: 1.6, marginBottom: 26 }}>
          {state.message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-secondary" style={{ minWidth: 90 }} onClick={handleNo}>
            Cancel
          </button>
          <button className="btn btn-danger" style={{ minWidth: 90, background: '#ef4444', color: '#fff' }} onClick={handleYes}>
            Delete
          </button>
        </div>
      </div>
    </Modal>
  )

  return { confirm, dialog }
}
