import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Heart, Dumbbell, Brain, BarChart3, Lock, CheckCircle2,
  ArrowRight,
} from 'lucide-react'

type RehabPhase = 'overview' | 'physical' | 'cognitive' | 'report'

const phases = [
  {
    id: 'physical' as const,
    level: 1,
    title: 'Physical Assessment',
    desc: 'Complete AI-guided exercises with real-time pose tracking',
    icon: Dumbbell,
    bgColor: 'bg-accent/10 border border-accent/20',
    iconColor: 'text-accent',
    accentColor: 'border-accent/50',
  },
  {
    id: 'cognitive' as const,
    level: 2,
    title: 'Cognitive Training',
    desc: 'Brain games targeting memory, attention & processing speed',
    icon: Brain,
    bgColor: 'bg-info/10 border border-info/20',
    iconColor: 'text-info',
    accentColor: 'border-info/50',
  },
  {
    id: 'report' as const,
    level: 3,
    title: 'Report Analysis',
    desc: 'AI-generated recovery report with detailed insights & next steps',
    icon: BarChart3,
    bgColor: 'bg-success/10 border border-success/20',
    iconColor: 'text-success',
    accentColor: 'border-success/50',
  },
]

export default function Rehab() {
  const navigate = useNavigate()
  const [completedPhases, setCompletedPhases] = useState<string[]>([])
  const [activePhase, setActivePhase] = useState<RehabPhase>('overview')

  const isUnlocked = (id: string) => {
    if (id === 'physical') return true
    if (id === 'cognitive') return completedPhases.includes('physical')
    if (id === 'report') return completedPhases.includes('cognitive')
    return false
  }

  const startPhase = (id: string) => {
    if (!isUnlocked(id)) return
    if (id === 'physical') navigate('/physical')
    else if (id === 'cognitive') navigate('/cognitive')
    else if (id === 'report') {
      // Show report inline
      setActivePhase('report')
    }
  }

  const completePhase = (id: string) => {
    if (!completedPhases.includes(id)) {
      setCompletedPhases([...completedPhases, id])
    }
  }

  // Demo: mark phases complete
  const quickComplete = (id: string) => {
    completePhase(id)
  }

  if (activePhase === 'report') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <button onClick={() => setActivePhase('overview')} className="text-text-muted hover:text-text-primary flex items-center gap-2 text-sm">
          ← Back to Rehab Journey
        </button>
        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-pastel-mint">
              <BarChart3 className="w-6 h-6 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Recovery Report</h2>
              <p className="text-sm text-text-muted">AI-generated analysis of your rehabilitation session</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-pastel-peach text-center">
              <p className="text-3xl font-bold text-accent">85%</p>
              <p className="text-sm text-text-muted">Physical Score</p>
            </div>
            <div className="p-4 rounded-2xl bg-pastel-lilac text-center">
              <p className="text-3xl font-bold text-purple-500">78%</p>
              <p className="text-sm text-text-muted">Cognitive Score</p>
            </div>
            <div className="p-4 rounded-2xl bg-pastel-mint text-center">
              <p className="text-3xl font-bold text-success">82%</p>
              <p className="text-sm text-text-muted">Overall Recovery</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-text-primary">Key Insights</h3>
            <div className="space-y-3">
              {[
                { emoji: '💪', text: 'Shoulder ROM improved by 12° from last session' },
                { emoji: '🧠', text: 'Cognitive response time improved by 15%' },
                { emoji: '📈', text: 'Overall recovery trajectory is on track' },
                { emoji: '🎯', text: 'Recommended: Focus on elbow extension exercises next' },
              ].map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-page">
                  <span className="text-xl">{insight.emoji}</span>
                  <p className="text-sm text-text-secondary">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-accent-light border border-accent-200">
            <p className="text-accent-dark font-bold text-center">+200 XP earned for completing the journey! 🏆</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Heart className="w-7 h-7 text-danger" />
          Rehabilitation Journey
        </h1>
        <p className="text-text-muted mt-1 text-sm">Progress through structured levels for complete recovery</p>
      </div>

      {/* Progress bar */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-secondary">Journey Progress</span>
          <span className="text-sm font-bold text-accent">{completedPhases.length}/3 Complete</span>
        </div>
        <div className="w-full h-3 rounded-full bg-page overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedPhases.length / 3) * 100}%` }}
            className="h-full rounded-full bg-gradient-to-r from-accent via-purple-400 to-success"
          />
        </div>
      </div>

      {/* Phase cards */}
      <div className="space-y-4">
        {phases.map((phase, i) => {
          const unlocked = isUnlocked(phase.id)
          const completed = completedPhases.includes(phase.id)
          const Icon = phase.icon

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`glass-card p-6 relative overflow-hidden transition-all ${
                unlocked ? `cursor-pointer hover:shadow-card-hover hover:${phase.accentColor}` : 'opacity-60'
              } ${completed ? 'border-success/30' : ''}`}
              onClick={() => unlocked && !completed ? startPhase(phase.id) : null}
            >
              <div className="flex items-center gap-5">
                {/* Level indicator */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  completed ? 'bg-success-light' : phase.bgColor
                }`}>
                  {completed ? (
                    <CheckCircle2 className="w-7 h-7 text-success" />
                  ) : unlocked ? (
                    <Icon className={`w-7 h-7 ${phase.iconColor}`} />
                  ) : (
                    <Lock className="w-6 h-6 text-text-light" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-text-light uppercase">Level {phase.level}</span>
                    {completed && <span className="text-xs font-semibold text-success bg-success-light px-2 py-0.5 rounded-full">✓ Done</span>}
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">{phase.title}</h3>
                  <p className="text-sm text-text-muted mt-0.5">{phase.desc}</p>
                </div>

                {/* Action */}
                <div className="flex items-center gap-2">
                  {/* Demo quick-complete button */}
                  {unlocked && !completed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        quickComplete(phase.id)
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-page text-text-muted hover:text-text-primary border border-border"
                      title="Demo: Mark complete"
                    >
                      ✓ Mark Done
                    </button>
                  )}
                  {unlocked && !completed ? (
                    <div className="flex items-center gap-1 text-accent font-medium text-sm">
                      Start <ArrowRight className="w-4 h-4" />
                    </div>
                  ) : !unlocked ? (
                    <Lock className="w-5 h-5 text-text-light" />
                  ) : null}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
