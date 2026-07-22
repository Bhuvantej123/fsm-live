import { useLocation } from 'react-router-dom'
import { Bell, Settings, Menu, ShieldCheck, HardHat } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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
  const { user, isAdmin } = useAuth()
  const title = PAGE_NAMES[pathname] ?? (pathname.startsWith('/customers/') ? 'Customer Detail' : 'FSM')

  const initials = user?.username?.slice(0, 2).toUpperCase() || '?'

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
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px 4px 4px',
              borderRadius: 99,
              background: isAdmin
                ? 'rgba(99,102,241,.12)'
                : 'rgba(6,182,212,.10)',
              border: '1px solid',
              borderColor: isAdmin ? 'rgba(99,102,241,.25)' : 'rgba(6,182,212,.25)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 99,
                background: isAdmin
                  ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
                  : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#fff',
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {user.username}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                  {isAdmin
                    ? <ShieldCheck size={9} color="#818cf8" />
                    : <HardHat size={9} color="#22d3ee" />
                  }
                  <span style={{ fontSize: 9.5, color: isAdmin ? '#818cf8' : '#22d3ee', fontWeight: 600 }}>
                    {isAdmin ? 'Admin' : 'Engineer'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
