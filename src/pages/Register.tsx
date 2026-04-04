import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store'
import { mockUser, CONDITIONS, LANGUAGES } from '../mockData'
import { ArrowLeft, ArrowRight, Check, Sparkles, UserPlus } from 'lucide-react'

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
  date_of_birth: z.string().min(1, 'Required'),
  biological_sex: z.enum(['M', 'F', 'Other']),
  language_code: z.string().min(1, 'Required'),
  fitness_level: z.enum(['Low', 'Med', 'High']),
  condition_id: z.string().min(1, 'Required'),
  injury_onset_date: z.string().min(1, 'Required'),
  notification_time: z.string().min(1, 'Required'),
  leaderboard_optin: z.boolean(),
  terms_accepted: z.boolean().refine((v) => v, 'You must accept the terms'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>
const steps = ['Account', 'Personal', 'Medical', 'Preferences']

export default function Register() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, trigger, watch } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { biological_sex: 'M', fitness_level: 'Med', language_code: 'en', leaderboard_optin: true, terms_accepted: false },
  })

  const stepsFields: (keyof RegisterForm)[][] = [
    ['name', 'email', 'password', 'confirmPassword'],
    ['date_of_birth', 'biological_sex', 'language_code', 'fitness_level'],
    ['condition_id', 'injury_onset_date'],
    ['notification_time', 'leaderboard_optin', 'terms_accepted'],
  ]

  const goNext = async () => { const valid = await trigger(stepsFields[step]); if (valid && step < 3) setStep(step + 1) }
  const goBack = () => { if (step > 0) setStep(step - 1) }

  const onSubmit = async (_data: RegisterForm) => {
    setLoading(true)
    try { await new Promise((r) => setTimeout(r, 1000)); setUser(mockUser); navigate('/dashboard') }
    catch { /* handle error */ }
    finally { setLoading(false) }
  }

  const labelCls = "block text-sm font-medium text-text-secondary mb-2"
  const errCls = "text-danger text-xs mt-1"

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-success/5 rounded-full blur-3xl" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dark mb-3 shadow-button">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create Your Account</h1>
          <p className="text-text-muted mt-1 text-sm">Start your AI-powered recovery journey</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < step ? 'bg-accent text-white' : i === step ? 'bg-accent-light text-accent border-2 border-accent' : 'bg-page text-text-light border border-border'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] mt-1 ${i === step ? 'text-accent' : 'text-text-light'}`}>{s}</span>
              </div>
              {i < 3 && <div className={`w-12 h-0.5 rounded-full mb-4 transition-colors ${i < step ? 'bg-accent' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                {step === 0 && (<>
                  <div><label className={labelCls}>Full Name</label><input placeholder="John Doe" className="input-field" {...register('name')} />{errors.name && <p className={errCls}>{errors.name.message}</p>}</div>
                  <div><label className={labelCls}>Email Address</label><input type="email" placeholder="you@example.com" className="input-field" {...register('email')} />{errors.email && <p className={errCls}>{errors.email.message}</p>}</div>
                  <div><label className={labelCls}>Password</label><input type="password" placeholder="••••••••" className="input-field" {...register('password')} />{errors.password && <p className={errCls}>{errors.password.message}</p>}</div>
                  <div><label className={labelCls}>Confirm Password</label><input type="password" placeholder="••••••••" className="input-field" {...register('confirmPassword')} />{errors.confirmPassword && <p className={errCls}>{errors.confirmPassword.message}</p>}</div>
                </>)}
                {step === 1 && (<>
                  <div><label className={labelCls}>Date of Birth</label><input type="date" className="input-field" {...register('date_of_birth')} />{errors.date_of_birth && <p className={errCls}>{errors.date_of_birth.message}</p>}</div>
                  <div><label className={labelCls}>Biological Sex</label><select className="input-field" {...register('biological_sex')}><option value="M">Male</option><option value="F">Female</option><option value="Other">Other</option></select></div>
                  <div><label className={labelCls}>Language</label><select className="input-field" {...register('language_code')}>{LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}</select></div>
                  <div><label className={labelCls}>Fitness Level</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Low', 'Med', 'High'] as const).map((level) => (
                        <label key={level} className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                          watch('fitness_level') === level ? 'border-accent bg-accent-light text-accent-dark' : 'border-border bg-white text-text-muted hover:border-accent/30'}`}>
                          <input type="radio" value={level} className="sr-only" {...register('fitness_level')} />
                          <span className="text-sm font-medium">{level === 'Low' ? '🌱 Low' : level === 'Med' ? '⚡ Medium' : '🔥 High'}</span>
                        </label>))}
                    </div>
                  </div>
                </>)}
                {step === 2 && (<>
                  <div><label className={labelCls}>Condition</label><select className="input-field" {...register('condition_id')}><option value="">Select your condition...</option>{CONDITIONS.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}</select>{errors.condition_id && <p className={errCls}>{errors.condition_id.message}</p>}</div>
                  <div><label className={labelCls}>Injury / Onset Date</label><input type="date" className="input-field" {...register('injury_onset_date')} />{errors.injury_onset_date && <p className={errCls}>{errors.injury_onset_date.message}</p>}</div>
                </>)}
                {step === 3 && (<>
                  <div><label className={labelCls}>Daily Reminder Time</label><input type="time" className="input-field" {...register('notification_time')} />{errors.notification_time && <p className={errCls}>{errors.notification_time.message}</p>}</div>
                  <label className="flex items-center gap-3 p-4 rounded-xl bg-page border border-border cursor-pointer hover:border-accent/30 transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded border-border accent-accent" {...register('leaderboard_optin')} />
                    <div><p className="text-sm font-medium text-text-primary">Join Leaderboard</p><p className="text-xs text-text-light">Compete with others and earn rewards</p></div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl bg-page border border-border cursor-pointer hover:border-accent/30 transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded border-border accent-accent" {...register('terms_accepted')} />
                    <div><p className="text-sm font-medium text-text-primary">Accept Terms & Conditions</p><p className="text-xs text-text-light">I agree to the terms of service and privacy policy</p></div>
                  </label>
                  {errors.terms_accepted && <p className={errCls}>{errors.terms_accepted.message}</p>}
                </>)}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              {step > 0 ? <button type="button" onClick={goBack} className="btn-secondary flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button> : <div />}
              {step < 3 ? <button type="button" onClick={goNext} className="btn-primary flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></button>
                : <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus className="w-5 h-5" /> Create Account</>}
                </button>}
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-text-muted text-sm">Already have an account?{' '}<Link to="/login" className="text-accent hover:text-accent-dark font-medium transition-colors">Sign In</Link></p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
