import { useState } from 'react'
import { motion } from 'framer-motion'
import { mockLeaderboard } from '../mockData'
import { useAuthStore } from '../store'
import { Trophy, Flame, Globe, Calendar, Users, Heart } from 'lucide-react'

const tabs = [
  { id: 'global', label: 'Global', icon: Globe },
  { id: 'weekly', label: 'Weekly', icon: Calendar },
  { id: 'condition', label: 'My Condition', icon: Heart },
  { id: 'friends', label: 'Friends', icon: Users },
]

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('global')
  const user = useAuthStore((s) => s.user)
  const myEntry = mockLeaderboard.find((e) => e.is_current_user)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Trophy className="w-7 h-7 text-warn" /> Leaderboard
        </h1>
        <p className="text-text-muted mt-1 text-sm">See where you stand among other patients</p>
      </div>

      {myEntry && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border-accent/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-xl shadow-button">
                #{myEntry.rank}
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Your Ranking</h3>
                <p className="text-sm text-text-muted">{user?.name || myEntry.display_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-center">
              <div><p className="text-2xl font-bold text-accent">{myEntry.xp_total.toLocaleString()}</p><p className="text-xs text-text-light">XP</p></div>
              <div><p className="text-2xl font-bold text-warn flex items-center gap-1"><Flame className="w-5 h-5" /> {myEntry.current_streak}</p><p className="text-xs text-text-light">Streak</p></div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 bg-white rounded-2xl p-1 border border-border shadow-soft">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === t.id ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-page'}`}>
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">Rank</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">Player</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider hidden sm:table-cell">Condition</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">XP</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider hidden sm:table-cell">Streak</th>
              </tr>
            </thead>
            <tbody>
              {mockLeaderboard.map((entry, i) => (
                <motion.tr key={entry.rank} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className={`border-b border-border-light transition-colors ${entry.is_current_user ? 'bg-accent-50 hover:bg-accent-100' : 'hover:bg-page'}`}>
                  <td className="px-6 py-4">{entry.rank <= 3 ? <span className="text-2xl">{medals[entry.rank - 1]}</span> : <span className="text-sm font-bold text-text-muted">#{entry.rank}</span>}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${entry.is_current_user ? 'bg-gradient-to-br from-accent to-accent-dark text-white' : 'bg-page text-text-muted'}`}>{entry.display_name.charAt(0)}</div>
                      <div>
                        <p className={`text-sm font-medium ${entry.is_current_user ? 'text-accent-dark' : 'text-text-primary'}`}>{entry.display_name}{entry.is_current_user && <span className="text-xs ml-2 text-accent/60">(You)</span>}</p>
                        <p className="text-xs text-text-light">{entry.country_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell"><span className="text-xs px-2 py-1 rounded-full bg-page text-text-muted capitalize">{entry.condition_id.replace(/_/g, ' ')}</span></td>
                  <td className="px-6 py-4 text-right"><span className="text-sm font-bold text-text-primary">{entry.xp_total.toLocaleString()}</span></td>
                  <td className="px-6 py-4 text-right hidden sm:table-cell"><span className="flex items-center justify-end gap-1 text-sm text-warn"><Flame className="w-3.5 h-3.5" /> {entry.current_streak}</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
