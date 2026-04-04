import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockExercises } from '../mockData'
import type { Exercise } from '../types'
import WebcamFeed from '../components/WebcamFeed'
import OfflineExercisePlayer from '../components/OfflineExercisePlayer'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import {
  Dumbbell, Play, Square, Clock, Zap, Award, X, ArrowLeft, WifiOff,
} from 'lucide-react'

export default function PhysicalSession() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionId] = useState('session-demo-001')
  const [repCount, setRepCount] = useState(0)
  const [timer, setTimer] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [quality] = useState(85)
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (!sessionActive) return
    const interval = setInterval(() => setTimer((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [sessionActive])

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(t)
  }, [feedback])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  const startExercise = (ex: Exercise) => {
    setSelectedExercise(ex)
    setSessionActive(true)
    setRepCount(0)
    setTimer(0)
  }

  const endExerciseSession = () => {
    setSessionActive(false)
    setShowSummary(true)
  }

  const closeSummary = () => {
    setShowSummary(false)
    setSelectedExercise(null)
  }

  const handleRepCounted = useCallback((count: number) => setRepCount(count), [])
  const handleFeedback = useCallback((msg: string) => setFeedback(msg), [])

  const difficultyBadge = (d: 1 | 2 | 3) => {
    const map = {
      1: { label: 'Easy', cls: 'bg-success-light text-success-dark' },
      2: { label: 'Medium', cls: 'bg-warn-light text-warn-dark' },
      3: { label: 'Hard', cls: 'bg-danger-light text-danger-dark' },
    }
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[d].cls}`}>{map[d].label}</span>
  }

  // Active session view
  if (sessionActive && selectedExercise) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl bg-success-light border border-success/30 text-success-dark text-sm font-medium shadow-card"
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <button onClick={endExerciseSession} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="flex items-center gap-3">
            {!isOnline && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warn/10 border border-warn/30 text-warn-dark text-xs font-semibold">
                <WifiOff className="w-3.5 h-3.5" /> Reference Mode
              </div>
            )}
            <button onClick={endExerciseSession} className="btn-secondary flex items-center gap-2 text-danger border-danger/30 hover:bg-danger-light">
              <Square className="w-4 h-4" /> End Session
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {!isOnline ? (
              <OfflineExercisePlayer exercise={selectedExercise} onRepCounted={handleRepCounted} />
            ) : (
              <WebcamFeed sessionId={sessionId} exercise={selectedExercise} onRepCounted={handleRepCounted} onFeedback={handleFeedback} />
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-card p-6 text-center">
              <p className="text-text-muted text-sm mb-2">Reps Completed</p>
              <p className="text-5xl font-bold text-accent">{repCount}</p>
              <p className="text-text-light text-sm mt-1">/ {selectedExercise.default_reps} target</p>
              <div className="w-full h-2.5 rounded-full bg-page mt-4">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-dark transition-all duration-500" style={{ width: `${Math.min((repCount / selectedExercise.default_reps) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="glass-card p-6 text-center">
              <Clock className="w-6 h-6 text-text-muted mx-auto mb-2" />
              <p className="text-3xl font-bold text-text-primary font-mono">{formatTime(timer)}</p>
              <p className="text-text-light text-sm">Session Duration</p>
            </div>

            <div className="glass-card p-6 space-y-3">
              <h4 className="font-semibold text-text-primary">Exercise Details</h4>
              <p className="text-sm text-text-muted">{selectedExercise.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-light">Target ROM</span>
                <span className="text-text-primary font-medium">{selectedExercise.target_rom_min}°–{selectedExercise.target_rom_max}°</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-light">Joints</span>
                <span className="text-text-primary font-medium capitalize">{selectedExercise.primary_joints.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-light">Difficulty</span>
                {difficultyBadge(selectedExercise.difficulty)}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Dumbbell className="w-7 h-7 text-accent" />
          Physical Session
        </h1>
        <p className="text-text-muted mt-1 text-sm">Choose an exercise and start your AI-guided session</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockExercises.map((ex, i) => (
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-6 group cursor-pointer"
            onClick={() => startExercise(ex)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-pastel-peach">
                <Dumbbell className="w-5 h-5 text-accent" />
              </div>
              {difficultyBadge(ex.difficulty)}
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">{ex.name}</h3>
            <p className="text-sm text-text-muted mb-4 line-clamp-2">{ex.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-text-light">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {ex.default_reps} reps</span>
                <span>{ex.target_rom_max}° ROM</span>
              </div>
              <div className="flex items-center gap-1 text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-4 h-4" /> Start
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeSummary}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-card space-y-6 relative"
            >
              <button onClick={closeSummary} className="absolute top-4 right-4 text-text-light hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
              <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center mx-auto">
                <Award className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary">Session Complete!</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-page">
                  <p className="text-2xl font-bold text-accent">{repCount}</p>
                  <p className="text-xs text-text-light">Reps</p>
                </div>
                <div className="p-3 rounded-xl bg-page">
                  <p className="text-2xl font-bold text-warn">{formatTime(timer)}</p>
                  <p className="text-xs text-text-light">Duration</p>
                </div>
                <div className="p-3 rounded-xl bg-page">
                  <p className="text-2xl font-bold text-info">{quality}%</p>
                  <p className="text-xs text-text-light">Quality</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-accent-light border border-accent-200">
                <p className="text-accent-dark font-bold text-lg">+120 XP earned! 🎉</p>
              </div>
              <button onClick={closeSummary} className="btn-primary w-full">Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
