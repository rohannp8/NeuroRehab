import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Rehab from './pages/Rehab'
import Meditation from './pages/Meditation'
import PhysicalSession from './pages/PhysicalSession'
import Cognitive from './pages/Cognitive'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Chatbot from './pages/Chatbot'
import { Loader2 } from 'lucide-react'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function AppLoader({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await new Promise((r) => setTimeout(r, 500))
      } catch {
        // Not authenticated
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [setUser])

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-button animate-pulse">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-text-muted text-sm font-medium animate-pulse">Loading NeuroRehab...</p>
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLoader>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/rehab" element={<Rehab />} />
              <Route path="/meditation" element={<Meditation />} />
              <Route path="/physical" element={<PhysicalSession />} />
              <Route path="/cognitive" element={<Cognitive />} />
              <Route path="/chatbot" element={<Chatbot />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLoader>
    </BrowserRouter>
  )
}
