import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { CONDITIONS } from '../mockData'
import { getLanguageOptions, translateCondition, type LanguageCode, useI18n } from '../i18n'
import { ArrowLeft, Save, UserRoundCog, Bell, Trophy } from 'lucide-react'

const PREFS_KEY = 'neurorehab_profile_prefs'

interface ProfilePrefs {
  notificationTime: string
  leaderboardOptIn: boolean
}

function loadPrefs(): ProfilePrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as Partial<ProfilePrefs>
    return {
      notificationTime: parsed.notificationTime || '09:00',
      leaderboardOptIn: parsed.leaderboardOptIn ?? true,
    }
  } catch {
    return { notificationTime: '09:00', leaderboardOptIn: true }
  }
}

export default function EditProfile() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const { language: appLanguage, setLanguage: setAppLanguage, t } = useI18n()

  const initialPrefs = useMemo(() => loadPrefs(), [])

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [language, setLanguageValue] = useState(user?.language_code || 'en')
  const [condition, setCondition] = useState(user?.condition_id || 'stroke')
  const [fitness, setFitness] = useState<'Low' | 'Med' | 'High'>(user?.fitness_level || 'Med')
  const [notificationTime, setNotificationTime] = useState(initialPrefs.notificationTime)
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(initialPrefs.leaderboardOptIn)
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const onSave = async () => {
    setSaving(true)

    updateUser({
      name: name.trim() || user.name,
      email: email.trim() || user.email,
      language_code: language,
      condition_id: condition,
      fitness_level: fitness,
    })

    setAppLanguage(language as LanguageCode)

    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        notificationTime,
        leaderboardOptIn,
      }),
    )

    await new Promise((resolve) => setTimeout(resolve, 500))
    setSaving(false)
    navigate('/profile')
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <UserRoundCog className="w-7 h-7 text-accent" /> {t('editProfile.title')}
          </h1>
          <p className="text-text-muted mt-1 text-sm">{t('editProfile.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t('editProfile.fullName')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t('editProfile.email')}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t('editProfile.language')}</label>
            <select value={language} onChange={(e) => setLanguageValue(e.target.value)} className="input-field">
              {getLanguageOptions(appLanguage).map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t('editProfile.condition')}</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="input-field">
              {CONDITIONS.map((c) => (
                <option key={c.id} value={c.id}>{translateCondition(c.id, appLanguage)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t('editProfile.fitness')}</label>
            <select value={fitness} onChange={(e) => setFitness(e.target.value as 'Low' | 'Med' | 'High')} className="input-field">
              <option value="Low">{t('register.low')}</option>
              <option value="Med">{t('register.medium')}</option>
              <option value="High">{t('register.high')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
              <Bell className="w-4 h-4" /> {t('editProfile.notificationTime')}
            </label>
            <input type="time" value={notificationTime} onChange={(e) => setNotificationTime(e.target.value)} className="input-field" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer mt-7 md:mt-8">
            <input
              type="checkbox"
              checked={leaderboardOptIn}
              onChange={(e) => setLeaderboardOptIn(e.target.checked)}
              className="w-5 h-5 rounded border-border accent-accent"
            />
            <span className="text-sm text-text-primary flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-accent" /> {t('editProfile.leaderboard')}
            </span>
          </label>
        </div>

        <div className="pt-2">
          <button onClick={onSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            {t('editProfile.save')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
