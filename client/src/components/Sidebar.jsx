import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, ClipboardList,
  UserCog, BarChart3, FileText, Wrench, Wifi, X
} from 'lucide-react'
import { getServerUrl, setServerUrl } from '../api'

const NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
      { to: '/analytics', icon: BarChart3,        label: 'Analytics'  },
    ]
  },
  {
    section: 'Management',
    items: [
      { to: '/customers', icon: Users,         label: 'Customers' },
      { to: '/visits',    icon: ClipboardList, label: 'Visits'    },
      { to: '/engineers', icon: UserCog,       label: 'Engineers' },
    ]
  },
  {
    section: 'Reports',
    items: [
      { to: '/reports', icon: FileText, label: 'Monthly Reports' },
    ]
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const [showServerModal, setShowServerModal] = useState(false)
  const [serverIpInput, setServerIpInput] = useState('')

  const openServerModal = () => {
    setServerIpInput(getServerUrl())
    setShowServerModal(true)
  }

  const handleSaveServerIp = (e) => {
    e.preventDefault()
    setServerUrl(serverIpInput)
    setShowServerModal(false)
    window.location.reload()
  }

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.6)',
            zIndex: 199,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-icon">
              <Wrench size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.02em' }}>FSM</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Field Service Mgmt</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <div className="nav-section">{section}</div>
              {items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to} to={to}
                  onClick={onClose}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <button
            onClick={openServerModal}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', fontSize: 11, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Wifi size={13} color="var(--primary-light)" />
            <span>Server IP Config</span>
          </button>
          <div>FSM v1.0 &nbsp;·&nbsp; © {new Date().getFullYear()}</div>
        </div>
      </aside>

      {showServerModal && (
        <div className="modal-overlay" onClick={() => setShowServerModal(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wifi size={20} color="var(--primary-light)" />
                Backend Server IP
              </h3>
              <button className="btn-icon" onClick={() => setShowServerModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveServerIp}>
              <div className="form-group">
                <label className="form-label">Server Connection URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. http://192.168.1.100:3001 or http://10.0.2.2:3001"
                  value={serverIpInput}
                  onChange={e => setServerIpInput(e.target.value)}
                  required
                />
                <div style={{ fontSize: 11, color: 'var(--text-sec)', marginTop: 6, lineHeight: 1.4 }}>
                  • Android Emulator standard loopback: <code>http://10.0.2.2:3001</code><br />
                  • Physical Wi-Fi device: Use your host computer IP (e.g. <code>http://192.168.1.X:3001</code>)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowServerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Reload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
