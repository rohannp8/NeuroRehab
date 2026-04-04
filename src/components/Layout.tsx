import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  LayoutDashboard,
  Activity,
  Brain,
  Trophy,
  LogOut,
  Bell,
  Menu,
  X,
  Sparkles,
  Leaf,
  BotMessageSquare,
} from 'lucide-react'
import { mockNotifications } from '../mockData'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/rehab', icon: Activity, label: 'Rehabilitation' },
  { to: '/meditation', icon: Leaf, label: 'Meditation' },
  { to: '/physical', icon: Activity, label: 'Physical Session' },
  { to: '/cognitive', icon: Brain, label: 'Cognitive Session' },
  { to: '/chatbot', icon: BotMessageSquare, label: 'NeuroAI Assistant' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
]

export default function Layout() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)

  const handleLogout = () => {
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[240px] bg-sidebar border-r border-border shadow-sidebar
          flex flex-col transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-button">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary leading-tight">NeuroRehab</h1>
            <p className="text-[10px] text-accent font-medium tracking-wider uppercase">AI Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 pb-4 space-y-2">
          <div 
            onClick={() => {
              setSidebarOpen(false)
              navigate('/profile')
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-page cursor-pointer transition-colors hover:bg-card-hover"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-sm shadow-soft">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-text-muted truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-link w-full text-danger hover:text-danger-dark hover:bg-danger-light"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0 shadow-soft">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-text-muted hover:bg-page"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="hidden lg:block">
            {/* Empty space for header as requested */}
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2.5 rounded-xl text-text-muted hover:bg-page transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-danger animate-pulse" />
              </button>

              <AnimatePresence>
                {showNotifs && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-2xl shadow-card z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {mockNotifications.map((n) => (
                        <div
                          key={n.id}
                          className="px-4 py-3 hover:bg-page transition-colors border-b border-border last:border-0"
                        >
                          <p className="text-sm text-text-primary">{n.message}</p>
                          <p className="text-xs text-text-muted mt-1">
                            {new Date(n.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* XP Badge */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-light border border-accent-200">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent-dark">{user?.xp_total || 0} XP</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
