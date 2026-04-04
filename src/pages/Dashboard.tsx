import { useAuthStore } from '../store'
import { mockROMData, mockNotifications, mockExercises } from '../mockData'
import MetricCard from '../components/MetricCard'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Activity, Trophy, Flame, Target, Dumbbell, Brain, Bell,
  ChevronRight, Leaf, ArrowRight,
  Heart, BarChart3,
} from 'lucide-react'

const rehabLevels = [
  {
    level: 1,
    title: 'Physical Assessment',
    desc: 'AI-guided pose tracking exercises tailored to your condition',
    icon: Dumbbell,
    color: 'bg-pastel-peach',
    iconColor: 'text-accent',
    status: 'start',
  },
  {
    level: 2,
    title: 'Cognitive Training',
    desc: 'Brain games targeting memory, attention & processing speed',
    icon: Brain,
    color: 'bg-pastel-lilac',
    iconColor: 'text-purple-500',
    status: 'locked',
  },
  {
    level: 3,
    title: 'Report Analysis',
    desc: 'AI-generated recovery report with detailed insights',
    icon: BarChart3,
    color: 'bg-pastel-mint',
    iconColor: 'text-success',
    status: 'locked',
  },
]

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 max-w-6xl mx-auto">

      {/* ── GREETING ── */}
      <motion.div variants={item}>
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
          {greeting}, <span className="text-accent">{user?.name || 'User'}</span> 👋
        </h1>
        <p className="text-text-muted mt-1 text-sm">{dateStr}</p>
      </motion.div>

      {/* ── HEALTH OVERVIEW CARDS ── */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity className="w-5 h-5 text-accent" />}
          label="Total Sessions"
          value={28}
          trend={{ value: 12, positive: true }}
          bgColor="bg-pastel-peach"
        />
        <MetricCard
          icon={<Trophy className="w-5 h-5 text-info" />}
          label="Global Rank"
          value={`#${user?.rank_global || 42}`}
          trend={{ value: 5, positive: true }}
          bgColor="bg-pastel-sky"
        />
        <MetricCard
          icon={<Flame className="w-5 h-5 text-warn" />}
          label="Current Streak"
          value="7 days"
          trend={{ value: 40, positive: true }}
          bgColor="bg-pastel-lemon"
        />
        <MetricCard
          icon={<Target className="w-5 h-5 text-success" />}
          label="Avg Quality"
          value="85%"
          trend={{ value: 8, positive: true }}
          bgColor="bg-pastel-mint"
        />
      </motion.div>

      {/* ── ACTIVITY CHART ── */}
      <motion.div variants={item} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Activity Growth</h3>
          <select className="input-field w-auto py-1.5 px-3 text-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={mockROMData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF1" />
            <XAxis dataKey="date" stroke="#8C92A4" fontSize={12} />
            <YAxis stroke="#8C92A4" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8ECF1',
                borderRadius: '12px',
                color: '#1A1D26',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}
            />
            <Line type="monotone" dataKey="shoulder" stroke="#D4956B" strokeWidth={2.5} dot={{ fill: '#D4956B', r: 4, strokeWidth: 2, stroke: '#fff' }} name="Shoulder" />
            <Line type="monotone" dataKey="elbow" stroke="#5B8DEF" strokeWidth={2.5} dot={{ fill: '#5B8DEF', r: 4, strokeWidth: 2, stroke: '#fff' }} name="Elbow" />
            <Line type="monotone" dataKey="knee" stroke="#34C759" strokeWidth={2.5} dot={{ fill: '#34C759', r: 4, strokeWidth: 2, stroke: '#fff' }} name="Knee" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── REHABILITATION JOURNEY ── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Heart className="w-5 h-5 text-danger" />
              Rehabilitation Journey
            </h2>
            <p className="section-subtitle">Progress through levels: Physical → Cognitive → Report</p>
          </div>
          <button onClick={() => navigate('/rehab')} className="btn-ghost text-sm flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rehabLevels.map((lvl, i) => (
            <motion.div
              key={lvl.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => lvl.status === 'start' ? navigate('/rehab') : null}
              className={`${lvl.color} rounded-2xl p-6 relative overflow-hidden transition-all duration-300 ${
                lvl.status === 'start' ? 'cursor-pointer hover:shadow-card' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-white/60">
                  <lvl.icon className={`w-6 h-6 ${lvl.iconColor}`} />
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  lvl.status === 'start' ? 'bg-accent text-white' : 'bg-white/60 text-text-muted'
                }`}>
                  {lvl.status === 'start' ? 'Start' : `Level ${lvl.level}`}
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-1">{lvl.title}</h3>
              <p className="text-sm text-text-secondary">{lvl.desc}</p>

              {lvl.status === 'locked' && (
                <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-center justify-center">
                  <span className="text-sm font-medium text-text-muted">🔒 Complete Level {lvl.level - 1} first</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── MEDITATION ── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Leaf className="w-5 h-5 text-success" />
              Meditation & Relaxation
            </h2>
            <p className="section-subtitle">Calm your mind with guided meditation sessions</p>
          </div>
          <button onClick={() => navigate('/meditation')} className="btn-ghost text-sm flex items-center gap-1">
            Open <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div
          onClick={() => navigate('/meditation')}
          className="relative rounded-2xl overflow-hidden cursor-pointer group"
        >
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-success/20 to-teal-200/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Leaf className="w-10 h-10 text-success" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-1">Start a Meditation Session</h3>
                <p className="text-sm text-text-secondary">Choose from relaxing soundscapes — White noise, Rain, Ocean waves & more</p>
                <div className="flex items-center gap-3 mt-3">
                  {['5 min', '10 min', '15 min', '20 min'].map((t) => (
                    <span key={t} className="text-xs px-3 py-1 rounded-full bg-white/70 text-text-secondary font-medium">{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-success font-medium">
              <span>Begin</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── QUICK SESSIONS ── */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Physical Session */}
          <div
            onClick={() => navigate('/physical')}
            className="glass-card p-6 flex items-center gap-5 group cursor-pointer hover:border-accent/30"
          >
            <div className="p-4 rounded-2xl bg-pastel-peach group-hover:scale-105 transition-transform">
              <Dumbbell className="w-8 h-8 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-text-primary">Physical Session</h3>
              <p className="text-sm text-text-muted mt-0.5">Choose exercises & start AI-guided pose tracking</p>
              <p className="text-xs text-accent font-medium mt-2">{mockExercises.length} exercises available</p>
            </div>
            <ChevronRight className="w-5 h-5 text-text-light group-hover:text-accent transition-colors" />
          </div>

          {/* Cognitive Session */}
          <div
            onClick={() => navigate('/cognitive')}
            className="glass-card p-6 flex items-center gap-5 group cursor-pointer hover:border-info/30"
          >
            <div className="p-4 rounded-2xl bg-pastel-lilac group-hover:scale-105 transition-transform">
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-text-primary">Cognitive Session</h3>
              <p className="text-sm text-text-muted mt-0.5">Pick brain games & improve cognitive function</p>
              <p className="text-xs text-purple-500 font-medium mt-2">7 games available</p>
            </div>
            <ChevronRight className="w-5 h-5 text-text-light group-hover:text-purple-500 transition-colors" />
          </div>
        </div>
      </motion.div>

      {/* ── NOTIFICATIONS ── */}
      <motion.div variants={item} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-warn" />
          <h3 className="section-title">Recent Notifications</h3>
        </div>
        <div className="space-y-3">
          {mockNotifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-page hover:bg-card-hover transition-colors">
              <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm text-text-primary">{n.message}</p>
                <p className="text-xs text-text-light mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
