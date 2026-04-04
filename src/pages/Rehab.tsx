import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, Dumbbell, Brain, BarChart3, Play, ChevronRight,
  SkipForward, CheckCircle2, Clock, Trophy, Zap, Target,
  History, ArrowLeft, Sparkles, AlertCircle, Plus,
  Activity, Calendar, Medal, WifiOff
} from 'lucide-react'
import { mockExercises, CONDITIONS } from '../mockData'
import type { Exercise } from '../types'
import WebcamFeed from '../components/WebcamFeed'
import OfflineExercisePlayer from '../components/OfflineExercisePlayer'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import SequenceRecall from '../components/games/SequenceRecall'
import PatternMatrix from '../components/games/PatternMatrix'
import WordRecall from '../components/games/WordRecall'
import NumberSpan from '../components/games/NumberSpan'
import GoNoGo from '../components/games/GoNoGo'
import SpatialMemory from '../components/games/SpatialMemory'
import ColorStroop from '../components/games/ColorStroop'
import MathChallenge from '../components/games/MathChallenge'
import OddOneOut from '../components/games/OddOneOut'
import ShapeMatch from '../components/games/ShapeMatch'

// ─── Types ─────────────────────────────────────────────────────────────────

type SessionPhase = 'hub' | 'setup' | 'physical' | 'cognitive' | 'report'
type Severity = 'Mild' | 'Moderate' | 'Severe'

interface ExerciseResult {
  id: string
  name: string
  reps: number
  duration: number
  skipped: boolean
}

interface GameResult {
  type: string
  name: string
  score: number
  accuracy: number
  skipped: boolean
}

interface SessionRecord {
  id: string
  date: string
  disease: string
  severity: Severity
  exerciseResults: ExerciseResult[]
  gameResults: GameResult[]
  physicalScore: number
  cognitiveScore: number
  overallScore: number
  xpEarned: number
}

// ─── Game configs ───────────────────────────────────────────────────────────

const ALL_GAMES = [
  { type: 'sequence_recall', name: 'Sequence Recall', domain: 'Memory' },
  { type: 'pattern_matrix', name: 'Pattern Matrix', domain: 'Visual' },
  { type: 'delayed_word_recall', name: 'Word Recall', domain: 'Language' },
  { type: 'number_span', name: 'Number Span', domain: 'Working Memory' },
  { type: 'go_no_go', name: 'Go / No-Go', domain: 'Inhibition' },
  { type: 'spatial_memory_grid', name: 'Spatial Memory', domain: 'Spatial' },
  { type: 'color_word_stroop', name: 'Color Stroop', domain: 'Attention' },
  { type: 'math_challenge', name: 'Math Challenge', domain: 'Calculation' },
  { type: 'odd_one_out', name: 'Odd One Out', domain: 'Visual' },
  { type: 'shape_match', name: 'Shape Match', domain: 'Recognition' },
]

const LS_KEY = 'neurorehab_sessions'

function loadHistory(): SessionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(sessions: SessionRecord[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(sessions))
}

// ─── Inline game renderer ───────────────────────────────────────────────────

function GameComponent({ type, onComplete }: { type: string; onComplete: (score: number, accuracy: number) => void }) {
  switch (type) {
    case 'sequence_recall': return <SequenceRecall onComplete={onComplete} />
    case 'pattern_matrix': return <PatternMatrix onComplete={onComplete} />
    case 'delayed_word_recall': return <WordRecall onComplete={onComplete} />
    case 'number_span': return <NumberSpan onComplete={onComplete} />
    case 'go_no_go': return <GoNoGo onComplete={onComplete} />
    case 'spatial_memory_grid': return <SpatialMemory onComplete={onComplete} />
    case 'color_word_stroop': return <ColorStroop onComplete={onComplete} />
    case 'math_challenge': return <MathChallenge onComplete={onComplete} />
    case 'odd_one_out': return <OddOneOut onComplete={onComplete} />
    case 'shape_match': return <ShapeMatch onComplete={onComplete} />
    default: return <div className="p-8 text-center text-text-muted">Game not found</div>
  }
}

// ─── Progress Stepper ──────────────────────────────────────────────────────

function Stepper({ phase }: { phase: SessionPhase }) {
  const steps = [
    { key: 'setup', label: 'Setup', icon: Sparkles },
    { key: 'physical', label: 'Physical', icon: Dumbbell },
    { key: 'cognitive', label: 'Cognitive', icon: Brain },
    { key: 'report', label: 'Report', icon: BarChart3 },
  ]
  const order = ['setup', 'physical', 'cognitive', 'report']
  const currentIdx = order.indexOf(phase)

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        const Icon = step.icon
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done ? 'bg-success border-success' : active ? 'bg-accent border-accent' : 'bg-page border-border'
              }`}>
                {done
                  ? <CheckCircle2 className="w-5 h-5 text-white" />
                  : <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-text-muted'}`} />
                }
              </div>
              <span className={`text-[10px] font-semibold mt-1 uppercase tracking-wider ${active ? 'text-accent' : done ? 'text-success' : 'text-text-muted'}`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-500 ${i < currentIdx ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Rehab Component ──────────────────────────────────────────────────

export default function Rehab() {
  const [phase, setPhase] = useState<SessionPhase>('hub')

  // Setup state
  const [disease, setDisease] = useState('')
  const [customDisease, setCustomDisease] = useState('')
  const [severity, setSeverity] = useState<Severity>('Moderate')

  // Physical phase
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([])
  const [sessionActive, setSessionActive] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [timer, setTimer] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Cognitive phase
  const [games, setGames] = useState<typeof ALL_GAMES>([])
  const [currentGameIdx, setCurrentGameIdx] = useState(0)
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [gameKey, setGameKey] = useState(0)

  // History
  const [history, setHistory] = useState<SessionRecord[]>(loadHistory)
  const [viewingSession, setViewingSession] = useState<SessionRecord | null>(null)

  const isOnline = useOnlineStatus()

  // Timer effect during exercise
  useEffect(() => {
    if (!sessionActive) return
    const interval = setInterval(() => setTimer(t => t + 1), 1000)
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

  const handleRepCounted = useCallback((count: number) => setRepCount(count), [])
  const handleFeedback = useCallback((msg: string) => setFeedback(msg), [])

  // ── Start session ──────────────────────────────────────────────────────

  const startSession = () => {
    const conditionId = disease === 'other' ? 'other' : disease
    // Pick 4 exercises (prefer ones matching condition, then fill from all)
    const matching = mockExercises.filter(e => e.condition_ids.includes(conditionId))
    const others = mockExercises.filter(e => !e.condition_ids.includes(conditionId))
    const pool = [...matching, ...others]
    const selected = pool.slice(0, 4)
    setExercises(selected)
    setCurrentExIdx(0)
    setExerciseResults([])
    setSessionActive(false)
    setRepCount(0)
    setTimer(0)

    // Pick 4 random games
    const shuffled = [...ALL_GAMES].sort(() => 0.5 - Math.random())
    setGames(shuffled.slice(0, 4))
    setCurrentGameIdx(0)
    setGameResults([])
    setGameKey(k => k + 1)

    setPhase('physical')
  }

  // ── Physical flow ──────────────────────────────────────────────────────

  const beginExercise = () => {
    setSessionActive(true)
    setRepCount(0)
    setTimer(0)
  }

  const finishExercise = (skipped: boolean) => {
    setSessionActive(false)
    const ex = exercises[currentExIdx]
    const result: ExerciseResult = {
      id: ex.id,
      name: ex.name,
      reps: skipped ? 0 : repCount,
      duration: skipped ? 0 : timer,
      skipped,
    }
    const newResults = [...exerciseResults, result]
    setExerciseResults(newResults)
    setRepCount(0)
    setTimer(0)

    if (currentExIdx + 1 < exercises.length) {
      setCurrentExIdx(i => i + 1)
    } else {
      setPhase('cognitive')
    }
  }

  // ── Cognitive flow ─────────────────────────────────────────────────────

  const handleGameComplete = (score: number, accuracy: number) => {
    const game = games[currentGameIdx]
    const result: GameResult = { type: game.type, name: game.name, score, accuracy, skipped: false }
    advanceGame(result)
  }

  const skipGame = () => {
    const game = games[currentGameIdx]
    const result: GameResult = { type: game.type, name: game.name, score: 0, accuracy: 0, skipped: true }
    advanceGame(result)
  }

  const advanceGame = (result: GameResult) => {
    const newResults = [...gameResults, result]
    setGameResults(newResults)
    if (currentGameIdx + 1 < games.length) {
      setCurrentGameIdx(i => i + 1)
      setGameKey(k => k + 1)
    } else {
      buildReport(newResults)
    }
  }

  // ── Build Report ────────────────────────────────────────────────────────

  const buildReport = (finalGameResults: GameResult[]) => {
    setGameResults(finalGameResults)
    setPhase('report')
  }

  const computeScores = () => {
    const totalEx = exerciseResults.length
    const doneEx = exerciseResults.filter(r => !r.skipped).length
    const physicalScore = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0

    const totalGames = gameResults.length
    const avgGameAccuracy = totalGames > 0
      ? gameResults.reduce((sum, g) => sum + (g.skipped ? 0 : g.accuracy), 0) / totalGames
      : 0
    const cognitiveScore = Math.round(avgGameAccuracy)
    const overallScore = Math.round((physicalScore + cognitiveScore) / 2)
    const xpEarned = Math.round(overallScore * 2.5)
    return { physicalScore, cognitiveScore, overallScore, xpEarned }
  }

  const endSession = () => {
    const { physicalScore, cognitiveScore, overallScore, xpEarned } = computeScores()
    const record: SessionRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      disease: disease === 'other' ? customDisease : (CONDITIONS.find(c => c.id === disease)?.label || disease),
      severity,
      exerciseResults,
      gameResults,
      physicalScore,
      cognitiveScore,
      overallScore,
      xpEarned,
    }
    const updated = [record, ...history]
    setHistory(updated)
    saveHistory(updated)
    setPhase('hub')
  }

  const getTips = () => {
    const tips: Record<string, string> = {
      stroke: 'Focus on repetitive arm and leg movements every day to rebuild motor pathways.',
      parkinsons: 'Tai chi and balance exercises significantly reduce fall risk. Try daily.',
      acl_rehab: 'Quad-strengthening and balance training are key during this phase.',
      frozen_shoulder: 'Pendulum exercises twice a day will gradually restore your ROM.',
      knee_replacement: 'Short walks and stair practice are your best friends right now.',
      default: 'Consistency beats intensity. Even 20 mins daily will create lasting results.',
    }
    return tips[disease] || tips['default']
  }

  // ─── Render: Hub ──────────────────────────────────────────────────────

  if (phase === 'hub') {
    if (viewingSession) {
      const s = viewingSession
      return (
        <div className="space-y-6 max-w-3xl mx-auto">
          <button onClick={() => setViewingSession(null)} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>
          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Session Report</h2>
                <p className="text-sm text-text-muted">{s.date} · {s.disease} · {s.severity}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-pastel-peach text-center">
                <p className="text-3xl font-bold text-accent">{s.physicalScore}%</p>
                <p className="text-xs text-text-muted mt-1">Physical</p>
              </div>
              <div className="p-4 rounded-2xl bg-pastel-lilac text-center">
                <p className="text-3xl font-bold text-purple-500">{s.cognitiveScore}%</p>
                <p className="text-xs text-text-muted mt-1">Cognitive</p>
              </div>
              <div className="p-4 rounded-2xl bg-pastel-mint text-center">
                <p className="text-3xl font-bold text-success">{s.overallScore}%</p>
                <p className="text-xs text-text-muted mt-1">Overall</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">Exercises</h3>
              <div className="space-y-2">
                {s.exerciseResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-page">
                    <span className="text-sm text-text-primary">{r.name}</span>
                    {r.skipped ? <span className="text-xs text-danger font-semibold">Skipped</span> : <span className="text-xs text-success font-semibold">{r.reps} reps</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">Cognitive Games</h3>
              <div className="space-y-2">
                {s.gameResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-page">
                    <span className="text-sm text-text-primary">{r.name}</span>
                    {r.skipped ? <span className="text-xs text-danger font-semibold">Skipped</span> : <span className="text-xs text-success font-semibold">{Math.round(r.accuracy)}% acc</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-accent-light border border-accent-200 flex items-center justify-between">
              <span className="text-accent-dark font-bold">XP Earned</span>
              <span className="text-2xl font-black text-accent">+{s.xpEarned}</span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        {/* Hero */}
        <div className="glass-card p-8 bg-gradient-to-br from-accent/5 via-white to-purple-500/5 border border-accent/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-button">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">Rehabilitation Center</h1>
                <p className="text-text-muted text-sm">Your guided Zen recovery journey</p>
              </div>
            </div>
            <p className="text-text-secondary max-w-xl mb-6">Start a personalized Zen Session — physical exercises tailored to your condition, followed by cognitive brain training, and a detailed recovery report.</p>
            <button onClick={() => setPhase('setup')} className="btn-primary flex items-center gap-2 text-base px-8 py-3">
              <Plus className="w-5 h-5" /> Start New Zen Session
            </button>
          </div>
        </div>

        {/* Session History */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-text-muted" />
            <h2 className="text-lg font-bold text-text-primary">Session History</h2>
            {history.length > 0 && <span className="text-xs bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded-full">{history.length}</span>}
          </div>

          {history.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Activity className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-text-muted font-medium">No sessions yet. Start your first Zen Session!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(s => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 flex items-center gap-4 hover:shadow-card transition-shadow"
                >
                  <div className="w-12 h-12 rounded-2xl bg-pastel-mint flex items-center justify-center flex-shrink-0">
                    <Medal className="w-6 h-6 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-text-primary">{s.disease}</p>
                      <span className="text-xs bg-page border border-border px-2 py-0.5 rounded-full text-text-muted">{s.severity}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-text-muted"><Calendar className="w-3 h-3" />{s.date}</span>
                      <span className="text-xs font-semibold text-accent">{s.overallScore}% overall</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="hidden sm:flex gap-3 text-center">
                      <div><p className="text-lg font-bold text-accent">{s.physicalScore}%</p><p className="text-[10px] text-text-muted">Physical</p></div>
                      <div><p className="text-lg font-bold text-purple-500">{s.cognitiveScore}%</p><p className="text-[10px] text-text-muted">Cognitive</p></div>
                    </div>
                    <button onClick={() => setViewingSession(s)} className="btn-secondary text-sm py-2 px-4">View Report</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Render: Setup ────────────────────────────────────────────────────

  if (phase === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        <button onClick={() => setPhase('hub')} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Stepper phase="setup" />

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center mx-auto mb-4 shadow-button">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Set Up Your Zen Session</h2>
            <p className="text-text-muted mt-1.5 text-sm">We'll personalize exercises and games based on your condition.</p>
          </div>

          {/* Disease dropdown */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">Select Your Condition</label>
            <select
              value={disease}
              onChange={e => setDisease(e.target.value)}
              className="w-full bg-page border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
            >
              <option value="">— Choose a condition —</option>
              {CONDITIONS.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
              <option value="other">Other (specify below)</option>
            </select>
          </div>

          {/* Custom disease input */}
          {disease === 'other' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="block text-sm font-semibold text-text-primary mb-2">Describe Your Condition</label>
              <input
                type="text"
                value={customDisease}
                onChange={e => setCustomDisease(e.target.value)}
                placeholder="e.g., Rotator cuff tear, Balance disorder..."
                className="w-full bg-page border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </motion.div>
          )}

          {/* Severity */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-3">Severity Level</label>
            <div className="grid grid-cols-3 gap-3">
              {(['Mild', 'Moderate', 'Severe'] as Severity[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                    severity === s
                      ? s === 'Mild' ? 'border-success bg-success/10 text-success-dark'
                        : s === 'Moderate' ? 'border-warn bg-warn/10 text-warn-dark'
                        : 'border-danger bg-danger/10 text-danger-dark'
                      : 'border-border bg-page text-text-muted hover:border-accent/30'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Info box */}
          <div className="flex gap-3 p-4 rounded-xl bg-accent-light border border-accent-200">
            <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-accent-dark">You'll complete <b>4 physical exercises</b> via webcam, then <b>4 cognitive games</b>. You can skip any step — but it will affect your score.</p>
          </div>

          <button
            onClick={startSession}
            disabled={!disease || (disease === 'other' && !customDisease.trim())}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Zen Session <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    )
  }

  // ─── Render: Physical ────────────────────────────────────────────────

  if (phase === 'physical') {
    const currentEx = exercises[currentExIdx]
    if (!currentEx) return null

    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <Stepper phase="physical" />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-accent" />
              Level 1 — Physical Training
            </h2>
            <p className="text-text-muted text-sm mt-0.5">Exercise {currentExIdx + 1} of {exercises.length}</p>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: exercises.length }, (_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < currentExIdx ? 'bg-success' : i === currentExIdx ? 'bg-accent' : 'bg-border'
              }`} />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-page border border-border">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-purple-400 transition-all duration-500"
            style={{ width: `${((currentExIdx) / exercises.length) * 100}%` }} />
        </div>

        {/* Feedback toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl bg-success-light border border-success/30 text-success-dark text-sm font-semibold shadow-card">
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline banner */}
        {!isOnline && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-warn/10 border border-warn/30 mb-2">
            <WifiOff className="w-4 h-4 text-warn flex-shrink-0" />
            <p className="text-sm text-warn-dark font-medium">You're offline — using Reference Mode. Follow the animated guide and tap to count your reps manually.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webcam (online) or Offline Reference Player */}
          <div className="lg:col-span-2">
            {!isOnline ? (
              <OfflineExercisePlayer exercise={currentEx} onRepCounted={handleRepCounted} />
            ) : sessionActive ? (
              <WebcamFeed
                sessionId={`zen-${Date.now()}`}
                exerciseName={currentEx.name}
                onRepCounted={handleRepCounted}
                onFeedback={handleFeedback}
              />
            ) : (
              <div className="glass-card h-80 flex flex-col items-center justify-center gap-5 bg-page">
                <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Dumbbell className="w-10 h-10 text-accent" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-text-primary">{currentEx.name}</h3>
                  <p className="text-text-muted text-sm mt-1 max-w-xs">{currentEx.description}</p>
                </div>
                <button onClick={beginExercise} className="btn-primary flex items-center gap-2 px-8">
                  <Play className="w-4 h-4 fill-white" /> Start Webcam
                </button>
              </div>
            )}
          </div>

          {/* Stats panel */}
          <div className="space-y-4">
            <div className="glass-card p-5 text-center">
              <p className="text-text-muted text-sm mb-1">Reps Completed</p>
              <p className="text-5xl font-black text-accent">{repCount}</p>
              <p className="text-text-muted text-xs mt-1">/ {currentEx.default_reps} target</p>
              <div className="w-full h-2 rounded-full bg-page mt-3 border border-border">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min((repCount / currentEx.default_reps) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="glass-card p-5 text-center">
              <Clock className="w-5 h-5 text-text-muted mx-auto mb-1" />
              <p className="text-3xl font-bold font-mono text-text-primary">{formatTime(timer)}</p>
              <p className="text-xs text-text-muted">Duration</p>
            </div>
            <div className="glass-card p-4 space-y-2">
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Exercise Info</p>
              <div className="flex justify-between text-sm"><span className="text-text-muted">Target ROM</span><span className="font-medium text-text-primary">{currentEx.target_rom_min}°–{currentEx.target_rom_max}°</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-muted">Primary Joints</span><span className="font-medium text-text-primary capitalize">{currentEx.primary_joints.join(', ')}</span></div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              {sessionActive && (
                <button onClick={() => finishExercise(false)} className="btn-primary w-full flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Mark Complete
                </button>
              )}
              <button onClick={() => finishExercise(true)} className="btn-secondary w-full flex items-center justify-center gap-2 text-danger border-danger/30 hover:bg-danger/5">
                <SkipForward className="w-4 h-4" /> Skip Exercise (−15%)
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Cognitive ────────────────────────────────────────────────

  if (phase === 'cognitive') {
    const currentGame = games[currentGameIdx]
    if (!currentGame) return null

    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
        <Stepper phase="cognitive" />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-500" />
              Level 2 — Cognitive Training
            </h2>
            <p className="text-text-muted text-sm mt-0.5">Game {currentGameIdx + 1} of {games.length}</p>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: games.length }, (_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < currentGameIdx ? 'bg-success' : i === currentGameIdx ? 'bg-purple-500' : 'bg-border'
              }`} />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-page border border-border">
          <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-accent transition-all duration-500"
            style={{ width: `${((currentGameIdx) / games.length) * 100}%` }} />
        </div>

        <motion.div key={gameKey} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 bg-white">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-pastel-lilac">
                <Brain className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">{currentGame.name}</h3>
                <p className="text-xs text-text-muted">{currentGame.domain}</p>
              </div>
            </div>
            <button onClick={skipGame} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger font-semibold border border-border rounded-lg px-3 py-1.5 hover:border-danger/30 transition-colors">
              <SkipForward className="w-3.5 h-3.5" /> Skip (−15%)
            </button>
          </div>
          <GameComponent key={gameKey} type={currentGame.type} onComplete={handleGameComplete} />
        </motion.div>
      </div>
    )
  }

  // ─── Render: Report ───────────────────────────────────────────────────

  if (phase === 'report') {
    const { physicalScore, cognitiveScore, overallScore, xpEarned } = computeScores()
    const tip = getTips()
    const diseaseName = disease === 'other' ? customDisease : (CONDITIONS.find(c => c.id === disease)?.label || disease)

    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
        <Stepper phase="report" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 space-y-7">
          {/* Trophy header */}
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-pastel-lemon flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-12 h-12 text-warn" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Session Complete!</h2>
            <p className="text-text-muted text-sm mt-1">{diseaseName} · {severity} · {new Date().toLocaleDateString()}</p>
          </div>

          {/* Score grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-pastel-peach text-center">
              <Target className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-3xl font-black text-accent">{physicalScore}%</p>
              <p className="text-xs text-text-muted mt-1">Physical Score</p>
            </div>
            <div className="p-5 rounded-2xl bg-pastel-lilac text-center">
              <Brain className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-3xl font-black text-purple-500">{cognitiveScore}%</p>
              <p className="text-xs text-text-muted mt-1">Cognitive Score</p>
            </div>
            <div className="p-5 rounded-2xl bg-pastel-mint text-center">
              <Zap className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-3xl font-black text-success">{overallScore}%</p>
              <p className="text-xs text-text-muted mt-1">Overall</p>
            </div>
          </div>

          {/* XP Banner */}
          <div className="flex items-center justify-between p-5 rounded-2xl bg-accent-light border border-accent-200">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-accent" />
              <span className="font-bold text-accent-dark">XP Earned This Session</span>
            </div>
            <span className="text-3xl font-black text-accent">+{xpEarned}</span>
          </div>

          {/* Exercise breakdown */}
          <div>
            <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-accent" /> Exercise Breakdown
            </h3>
            <div className="space-y-2">
              {exerciseResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-page border border-border">
                  <span className="text-sm text-text-primary font-medium">{r.name}</span>
                  <div className="flex items-center gap-3">
                    {!r.skipped && <span className="text-xs text-text-muted">{r.reps} reps · {formatTime(r.duration)}</span>}
                    {r.skipped
                      ? <span className="text-xs text-danger bg-danger/10 font-semibold px-2 py-0.5 rounded-full">Skipped</span>
                      : <span className="text-xs text-success bg-success/10 font-semibold px-2 py-0.5 rounded-full">✓ Done</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game breakdown */}
          <div>
            <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" /> Cognitive Game Breakdown
            </h3>
            <div className="space-y-2">
              {gameResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-page border border-border">
                  <span className="text-sm text-text-primary font-medium">{r.name}</span>
                  <div className="flex items-center gap-3">
                    {!r.skipped && <span className="text-xs text-text-muted">{Math.round(r.accuracy)}% accuracy</span>}
                    {r.skipped
                      ? <span className="text-xs text-danger bg-danger/10 font-semibold px-2 py-0.5 rounded-full">Skipped</span>
                      : <span className="text-xs text-success bg-success/10 font-semibold px-2 py-0.5 rounded-full">✓ Done</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Tip */}
          <div className="flex gap-3 p-4 rounded-xl bg-purple-50 border border-purple-100">
            <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-0.5">Recovery Tip</p>
              <p className="text-sm text-text-secondary">{tip}</p>
            </div>
          </div>

          <button onClick={endSession} className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
            End Session & Save Report <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    )
  }

  return null
}
