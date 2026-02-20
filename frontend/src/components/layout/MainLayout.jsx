import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Server,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/logs', icon: FileText, label: 'Logs' },
  { to: '/services', icon: Server, label: 'Services' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function MainLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0B0F1A' }}>
      <aside
        className="w-64 flex flex-col shrink-0"
        style={{ backgroundColor: '#1A1D27' }}
      >
        <div className="p-6 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline">
            <span
              className="font-bold tracking-tight"
              style={{
                fontSize: '22px',
                background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              LogTrace
            </span>
            <span
              className="rounded-full shrink-0"
              style={{
                width: 8,
                height: 8,
                background: '#22c55e',
                boxShadow: '0 0 12px rgba(34, 197, 94, 0.8)',
                animation: 'logtrace-dot-pulse 2s ease-in-out infinite',
              }}
            />
          </Link>
          <style>{`
            @keyframes logtrace-dot-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.15); }
            }
          `}</style>
          <p className="text-xs text-gray-400 mt-0.5">Log Management</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-300 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8" style={{ backgroundColor: '#0B0F1A' }}>
        <Outlet />
      </main>
    </div>
  )
}
