import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { mockBadges, CONDITIONS } from '../mockData'
import { User, Mail, Calendar, Award, Settings, Sparkles, Shield, Bell } from 'lucide-react'
import { getLanguageOptions, translateCondition, useI18n } from '../i18n'

const PREFS_KEY = 'neurorehab_profile_prefs'

export default function Profile() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { language, t } = useI18n()

  const prefs = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as {
        notificationTime?: string
        leaderboardOptIn?: boolean
      }
      return {
        notificationTime: parsed.notificationTime || '09:00',
        leaderboardOptIn: parsed.leaderboardOptIn ?? true,
      }
    } catch {
      return { notificationTime: '09:00', leaderboardOptIn: true }
    }
  }, [])

  const xp = user?.xp_total || 0
  const level = Math.floor(xp / 500) + 1
  const xpInLevel = xp % 500
  const xpPercent = (xpInLevel / 500) * 100
  const conditionLabel = translateCondition(user?.condition_id, language) || CONDITIONS.find((c) => c.id === user?.condition_id)?.label || user?.condition_id
  const languageLabel = getLanguageOptions(language).find((l) => l.code === user?.language_code)?.label || user?.language_code

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div><h1 className="text-2xl font-bold text-text-primary flex items-center gap-2"><User className="w-7 h-7 text-accent" /> {t('profile.title')}</h1><p className="text-text-muted mt-1 text-sm">{t('profile.subtitle')}</p></div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-3xl shadow-button">{user?.name?.charAt(0) || 'U'}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text-primary">{user?.name || 'User'}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-muted">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {user?.email || 'email@example.com'}</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> {conditionLabel}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {t('profile.memberSince')}</span>
            </div>
          </div>
          <button onClick={() => navigate('/profile/edit')} className="btn-secondary flex items-center gap-2"><Settings className="w-4 h-4" /> {t('profile.edit')}</button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /><h3 className="font-semibold text-text-primary">{t('profile.level')} {level}</h3></div>
          <span className="text-sm text-text-muted">{xp.toLocaleString()} {t('profile.xpTotal')}</span>
        </div>
        <div className="w-full h-3 rounded-full bg-page overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-accent to-accent-dark" />
        </div>
        <p className="text-xs text-text-light mt-2">{xpInLevel} / 500 XP to {t('profile.level')} {level + 1}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-warn" /><h3 className="font-semibold text-text-primary">{t('profile.badges')}</h3><span className="text-xs text-text-light ml-auto">{mockBadges.filter((b) => b.unlocked).length}/{mockBadges.length} {t('profile.unlocked')}</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {mockBadges.map((badge, i) => (
            <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
              className={`p-4 rounded-2xl border text-center transition-all ${badge.unlocked ? 'bg-white border-accent/20 hover:shadow-card' : 'bg-page border-border grayscale opacity-50'}`}>
              <span className="text-3xl block mb-2">{badge.icon}</span>
              <p className={`text-sm font-medium ${badge.unlocked ? 'text-text-primary' : 'text-text-light'}`}>{badge.name}</p>
              <p className="text-xs text-text-light mt-1 line-clamp-1">{badge.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-accent" /> {t('profile.preferences')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-page border border-border px-4 py-3">
            <p className="text-text-light text-xs uppercase tracking-wide">{t('common.language')}</p>
            <p className="text-text-primary font-semibold mt-1">{languageLabel}</p>
          </div>
          <div className="rounded-xl bg-page border border-border px-4 py-3">
            <p className="text-text-light text-xs uppercase tracking-wide">{t('profile.notificationTime')}</p>
            <p className="text-text-primary font-semibold mt-1">{prefs.notificationTime}</p>
          </div>
          <div className="rounded-xl bg-page border border-border px-4 py-3">
            <p className="text-text-light text-xs uppercase tracking-wide">{t('profile.leaderboard')}</p>
            <p className="text-text-primary font-semibold mt-1">{prefs.leaderboardOptIn ? t('profile.yes') : t('profile.no')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
