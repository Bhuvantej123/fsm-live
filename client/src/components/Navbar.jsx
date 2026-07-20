import { useLocation } from 'react-router-dom'
import { Bell, Settings, Menu } from 'lucide-react'

const PAGE_NAMES = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/visits':    'All Visits',
  '/engineers': 'Engineers',
  '/reports':   'Monthly Reports',
  '/analytics': 'Analytics',
}

export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const title = PAGE_NAMES[pathname] ?? (pathname.startsWith('/customers/') ? 'Customer Detail' : 'FSM')

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          className="btn btn-icon btn-menu"
          onClick={onMenuClick}
        >
          <Menu size={17} />
        </button>
        <div>
          <div className="navbar-title">{title}</div>
          <div className="navbar-date">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </div>
        </div>
      </div>

      <div className="navbar-actions">
        <button className="btn btn-icon"><Bell size={16} /></button>
        <button className="btn btn-icon"><Settings size={16} /></button>
        <div className="avatar">FM</div>
      </div>
    </header>
  )
}
