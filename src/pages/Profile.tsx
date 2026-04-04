import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store'
import { mockBadges, LANGUAGES, CONDITIONS } from '../mockData'
import { User, Mail, Calendar, Award, Settings, Save, Sparkles, Shield, Bell } from 'lucide-react'

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const [editing, setEditing] = useState(false)
  const [language, setLanguage] = useState(user?.language_code || 'en')
  const [notifTime, setNotifTime] = useState('09:00')
  const [leaderboardOptin, setLeaderboardOptin] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => { setSaving(true); await new Promise((r) => setTimeout(r, 800)); setSaving(false); setEditing(false) }

  const xp = user?.xp_total || 0
  const level = Math.floor(xp / 500) + 1
  const xpInLevel = xp % 500
  const xpPercent = (xpInLevel / 500) * 100
  const conditionLabel = CONDITIONS.find((c) => c.id === user?.condition_id)?.label || user?.condition_id

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div><h1 className="text-2xl font-bold text-text-primary flex items-center gap-2"><User className="w-7 h-7 text-accent" /> Profile</h1><p className="text-text-muted mt-1 text-sm">Manage your account and preferences</p></div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-3xl shadow-button">{user?.name?.charAt(0) || 'U'}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text-primary">{user?.name || 'User'}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-muted">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {user?.email || 'email@example.com'}</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> {conditionLabel}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Member since Mar 2026</span>
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="btn-secondary flex items-center gap-2"><Settings className="w-4 h-4" /> {editing ? 'Cancel' : 'Edit'}</button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /><h3 className="font-semibold text-text-primary">Level {level}</h3></div>
          <span className="text-sm text-text-muted">{xp.toLocaleString()} XP total</span>
        </div>
        <div className="w-full h-3 rounded-full bg-page overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-accent to-accent-dark" />
        </div>
        <p className="text-xs text-text-light mt-2">{xpInLevel} / 500 XP to Level {level + 1}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-warn" /><h3 className="font-semibold text-text-primary">Badges</h3><span className="text-xs text-text-light ml-auto">{mockBadges.filter((b) => b.unlocked).length}/{mockBadges.length} unlocked</span></div>
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

      {editing && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-accent" /> Preferences</h3>
          <div className="space-y-4 max-w-md">
            <div><label className="block text-sm font-medium text-text-secondary mb-2">Language</label><select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field">{LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-2"><Bell className="w-4 h-4 inline mr-1" />Notification Time</label><input type="time" value={notifTime} onChange={(e) => setNotifTime(e.target.value)} className="input-field" /></div>
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={leaderboardOptin} onChange={(e) => setLeaderboardOptin(e.target.checked)} className="w-5 h-5 rounded border-border accent-accent" /><span className="text-sm text-text-primary">Show me on the leaderboard</span></label>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />} Save Changes
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
