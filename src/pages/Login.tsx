import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store'
import { mockUser } from '../mockData'
import { LogIn, Eye, EyeOff, Sparkles } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError('')
    try {
      // TODO: Replace with real API call
      await new Promise((r) => setTimeout(r, 800))
      if (data.email && data.password) {
        setUser(mockUser)
        navigate('/dashboard')
      }
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative backgrounds */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-info/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-dark mb-4 shadow-button">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Welcome Back</h1>
          <p className="text-text-muted mt-2">Sign in to continue your recovery journey</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                Email Address
              </label>
              <input id="email" type="email" placeholder="you@example.com" className="input-field" {...register('email')} />
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <input id="password" type={showPw ? 'text' : 'password'} placeholder="••••••••" className="input-field pr-11" {...register('password')} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text-muted transition-colors">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn className="w-5 h-5" /> Sign In</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-text-muted text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent hover:text-accent-dark font-medium transition-colors">Create Account</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
