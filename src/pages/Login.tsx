import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store'
import { mockUser } from '../mockData'
import { LogIn, Eye, EyeOff, Sparkles } from 'lucide-react'
import { getLanguageOptions, type LanguageCode, useI18n } from '../i18n'

type LoginForm = {
  email: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { language, setLanguage, t } = useI18n()
  const languageOptions = getLanguageOptions(language)

  const loginSchema = useMemo(
    () => z.object({
      email: z.string().email(t('login.email') === 'ईमेल पता' ? 'कृपया मान्य ईमेल दर्ज करें' : t('login.email') === 'ईमेल' ? 'कृपया वैध ईमेल प्रविष्ट करा' : 'Please enter a valid email'),
      password: z.string().min(6, language === 'en' ? 'Password must be at least 6 characters' : language === 'hi' ? 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए' : 'पासवर्ड किमान 6 अक्षरांचा असावा'),
    }),
    [language, t],
  )

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
        setLanguage((mockUser.language_code as LanguageCode) || language)
        navigate('/dashboard')
      }
    } catch {
      setError(language === 'en' ? 'Invalid email or password. Please try again.' : language === 'hi' ? 'ईमेल या पासवर्ड गलत है। कृपया पुनः प्रयास करें।' : 'ईमेल किंवा पासवर्ड चुकीचा आहे. कृपया पुन्हा प्रयत्न करा.')
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
          <div className="flex justify-end mb-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="input-field w-auto py-2 px-3 text-sm"
              aria-label={t('common.selectLanguage')}
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-dark mb-4 shadow-button">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">{t('login.title')}</h1>
          <p className="text-text-muted mt-2">{t('login.subtitle')}</p>
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
                {t('login.email')}
              </label>
              <input id="email" type="email" placeholder={t('login.emailPlaceholder')} className="input-field" {...register('email')} />
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                {t('login.password')}
              </label>
              <div className="relative">
                <input id="password" type={showPw ? 'text' : 'password'} placeholder={t('login.passwordPlaceholder')} className="input-field pr-11" {...register('password')} />
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
                <><LogIn className="w-5 h-5" /> {t('login.button')}</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-text-muted text-sm">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="text-accent hover:text-accent-dark font-medium transition-colors">{t('login.createAccount')}</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
