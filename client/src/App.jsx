import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Navbar  from './components/Navbar'
import DashboardPage      from './pages/DashboardPage'
import CustomersPage      from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import VisitsPage         from './pages/VisitsPage'
import EngineersPage      from './pages/EngineersPage'
import ReportsPage        from './pages/ReportsPage'
import AnalyticsPage      from './pages/AnalyticsPage'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const isNative = typeof window !== 'undefined' && (
      window.Capacitor?.isNativePlatform?.() ||
      window.location.protocol.startsWith('capacitor')
    )

    if (isNative) {
      let backListener;
      import('@capacitor/app').then(({ App: CapApp }) => {
        backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
          if (sidebarOpen) {
            setSidebarOpen(false)
          } else if (canGoBack && location.pathname !== '/dashboard' && location.pathname !== '/') {
            navigate(-1)
          } else {
            CapApp.exitApp()
          }
        })
      }).catch(() => {})

      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
        StatusBar.setBackgroundColor({ color: '#030712' }).catch(() => {})
      }).catch(() => {})

      return () => {
        if (backListener && typeof backListener.remove === 'function') {
          backListener.remove()
        }
      }
    }
  }, [sidebarOpen, location, navigate])

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar onMenuClick={() => setSidebarOpen(open => !open)} />
      <main className="main-content">
        <div className="page-wrap">
          <Routes>
            <Route path="/"               element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"      element={<DashboardPage />} />
            <Route path="/customers"      element={<CustomersPage />} />
            <Route path="/customers/:id"  element={<CustomerDetailPage />} />
            <Route path="/visits"         element={<VisitsPage />} />
            <Route path="/engineers"      element={<EngineersPage />} />
            <Route path="/reports"        element={<ReportsPage />} />
            <Route path="/analytics"      element={<AnalyticsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
