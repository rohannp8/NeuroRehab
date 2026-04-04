import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { jsPDF } from 'jspdf'
import {
  Heart, Dumbbell, Brain, BarChart3, Play, ChevronRight,
  SkipForward, CheckCircle2, Trophy, Zap, Target,
  History, ArrowLeft, Sparkles, AlertCircle, Plus,
  Activity, Calendar, Medal
} from 'lucide-react'
import { mockExercises, CONDITIONS } from '../mockData'
import type { Exercise } from '../types'
import WebcamFeed from '../components/WebcamFeed'
import DigitalTwin from '../components/DigitalTwin'
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
  repQuality: number
  avgFatigue: number | null
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

interface PoseFramePayload {
  rep_count?: number
  digital_twin?: {
    predicted_rom?: number
    fatigue_score?: number
    target_angle?: number
    deviation_score?: number
  }
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
  const [currentSessionId, setCurrentSessionId] = useState('')
  const [repCount, setRepCount] = useState(0)
  const [timer, setTimer] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [liveData, setLiveData] = useState<PoseFramePayload['digital_twin'] | null>(null)
  const fatigueSamplesRef = useRef<number[]>([])

  // Cognitive phase
  const [games, setGames] = useState<typeof ALL_GAMES>([])
  const [currentGameIdx, setCurrentGameIdx] = useState(0)
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [gameKey, setGameKey] = useState(0)

  // History
  const [history, setHistory] = useState<SessionRecord[]>(loadHistory)
  const [viewingSession, setViewingSession] = useState<SessionRecord | null>(null)

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
  const handlePoseFrame = useCallback((result: PoseFramePayload) => {
    if (result?.digital_twin) {
      setLiveData(result.digital_twin)
      if (typeof result.digital_twin.fatigue_score === 'number') {
        fatigueSamplesRef.current.push(result.digital_twin.fatigue_score)
      }
    }
    if (result?.rep_count !== undefined) setRepCount(result.rep_count)
  }, [])

  // ── Start session ──────────────────────────────────────────────────────

  const startSession = () => {
    const requestedOrder = ['Finger Tapping', 'Fist Stretch', 'Arm Extension', 'Wrist Flexion']
    const selected = requestedOrder
      .map(name => mockExercises.find(e => e.name === name))
      .filter((e): e is Exercise => Boolean(e))
    setExercises(selected)
    setCurrentExIdx(0)
    setExerciseResults([])
    setSessionActive(false)
    setCurrentSessionId('')
    setRepCount(0)
    setTimer(0)
    fatigueSamplesRef.current = []

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
    setCurrentSessionId(`zen-${Date.now()}`)
    setSessionActive(true)
    setRepCount(0)
    setTimer(0)
    setLiveData(null)
    fatigueSamplesRef.current = []
  }

  const finishExercise = (skipped: boolean) => {
    setSessionActive(false)
    setCurrentSessionId('')
    const ex = exercises[currentExIdx]
    const repQuality = skipped || ex.default_reps <= 0
      ? 0
      : Math.min(100, Math.round((repCount / ex.default_reps) * 100))
    const avgFatigue = skipped || fatigueSamplesRef.current.length === 0
      ? null
      : Math.round(
          fatigueSamplesRef.current.reduce((sum, val) => sum + val, 0) /
          fatigueSamplesRef.current.length,
        )
    const result: ExerciseResult = {
      id: ex.id,
      name: ex.name,
      reps: skipped ? 0 : repCount,
      duration: skipped ? 0 : timer,
      skipped,
      repQuality,
      avgFatigue,
    }
    const newResults = [...exerciseResults, result]
    setExerciseResults(newResults)
    setRepCount(0)
    setTimer(0)
    fatigueSamplesRef.current = []

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

  const computeSessionMetrics = () => {
    const totalEx = exerciseResults.length
    const completedExercises = exerciseResults.filter(r => !r.skipped)
    const completionRate = totalEx > 0 ? (completedExercises.length / totalEx) * 100 : 0

    const avgRepQuality = completedExercises.length > 0
      ? completedExercises.reduce((sum, r) => sum + r.repQuality, 0) / completedExercises.length
      : 0

    const fatigueValues = completedExercises
      .map(r => r.avgFatigue)
      .filter((v): v is number => typeof v === 'number')
    const avgFatigue = fatigueValues.length > 0
      ? fatigueValues.reduce((sum, v) => sum + v, 0) / fatigueValues.length
      : null

    const completedGames = gameResults.filter(g => !g.skipped)
    const avgCognitiveAccuracy = completedGames.length > 0
      ? completedGames.reduce((sum, g) => sum + g.accuracy, 0) / completedGames.length
      : 0

    return {
      completionRate,
      avgRepQuality,
      avgFatigue,
      avgCognitiveAccuracy,
    }
  }

  const getProgressInsights = (
    currentPhysical: number,
    currentCognitive: number,
    currentOverall: number,
  ) => {
    const metrics = computeSessionMetrics()
    const previous = history.length > 0 ? history[0] : null

    const progress = {
      previousDate: previous?.date ?? null,
      physicalDelta: previous ? currentPhysical - previous.physicalScore : null,
      cognitiveDelta: previous ? currentCognitive - previous.cognitiveScore : null,
      overallDelta: previous ? currentOverall - previous.overallScore : null,
      completionRate: Math.round(metrics.completionRate),
      repQuality: Math.round(metrics.avgRepQuality),
      cognitiveAccuracy: Math.round(metrics.avgCognitiveAccuracy),
      fatigue: metrics.avgFatigue !== null ? Math.round(metrics.avgFatigue) : null,
      messages: [] as string[],
    }

    if (!previous) {
      progress.messages.push('This is your first recorded session. Future reports will include trend comparisons.')
      return progress
    }

    if ((progress.overallDelta ?? 0) > 0) {
      progress.messages.push(`Overall score improved by +${progress.overallDelta}% compared to ${previous.date}.`)
    } else if ((progress.overallDelta ?? 0) < 0) {
      progress.messages.push(`Overall score changed by ${progress.overallDelta}% compared to ${previous.date}.`)
    } else {
      progress.messages.push(`Overall score is unchanged from ${previous.date}.`)
    }

    if (progress.completionRate < 100) {
      progress.messages.push(`Exercise completion is ${progress.completionRate}%. Completing all physical tasks will improve recovery trends.`)
    }

    if (progress.repQuality < 70) {
      progress.messages.push(`Rep quality is ${progress.repQuality}%. Focus on full-range, slower reps for better motor gains.`)
    }

    if (progress.fatigue !== null && progress.fatigue > 70) {
      progress.messages.push(`Average fatigue is high (${progress.fatigue}/100). Add short rest intervals between sets.`)
    }

    if (progress.cognitiveAccuracy < 70) {
      progress.messages.push(`Cognitive accuracy is ${progress.cognitiveAccuracy}%. Prioritize accuracy before speed.`)
    }

    return progress
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

  const getDynamicTip = (overallScore: number) => {
    const { completionRate, avgRepQuality, avgFatigue, avgCognitiveAccuracy } = computeSessionMetrics()

    if (completionRate < 70) {
      return `You completed ${Math.round(completionRate)}% of physical exercises. Finish all 3 next session for faster recovery progress.`
    }

    if (avgRepQuality < 60) {
      return `Rep quality is ${Math.round(avgRepQuality)}%. Slow down and aim for fuller range on each rep before increasing speed.`
    }

    if (avgFatigue !== null && avgFatigue > 70) {
      return `Average fatigue is ${Math.round(avgFatigue)}/100. Add 45-60 second rest breaks between sets and keep movement controlled.`
    }

    if (avgCognitiveAccuracy < 65) {
      return `Cognitive accuracy is ${Math.round(avgCognitiveAccuracy)}%. Reduce distractions and focus on accuracy before speed in games.`
    }

    if (overallScore >= 85 && avgRepQuality >= 80 && avgCognitiveAccuracy >= 80) {
      return `Excellent session: ${overallScore}% overall with strong physical and cognitive performance. Keep this consistency for the next 7 days.`
    }

    return `Overall score is ${overallScore}%. Keep daily practice with controlled reps and steady pacing to keep improving week by week.`
  }

  const downloadReportPdf = () => {
    const { physicalScore, cognitiveScore, overallScore, xpEarned } = computeScores()
    const tip = getDynamicTip(overallScore)
    const progress = getProgressInsights(physicalScore, cognitiveScore, overallScore)
    const diseaseName = disease === 'other' ? customDisease : (CONDITIONS.find(c => c.id === disease)?.label || disease)
    const sessionDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const left = 42
    const contentWidth = pageWidth - left * 2
    let y = 42

    const ensureSpace = (needed: number) => {
      if (y + needed > 790) {
        doc.addPage()
        y = 42
      }
    }

    const sectionHeader = (title: string, color: [number, number, number]) => {
      ensureSpace(30)
      doc.setFillColor(color[0], color[1], color[2])
      doc.roundedRect(left, y, contentWidth, 24, 6, 6, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(title, left + 10, y + 16)
      y += 34
      doc.setTextColor(40, 48, 64)
    }

    const metricCard = (x: number, title: string, value: string, bg: [number, number, number]) => {
      doc.setFillColor(bg[0], bg[1], bg[2])
      doc.roundedRect(x, y, 160, 60, 8, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(30, 40, 55)
      doc.text(value, x + 12, y + 28)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(title, x + 12, y + 46)
    }

    const drawTable = (headers: string[], rows: string[][]) => {
      ensureSpace(32 + rows.length * 24)
      const tableWidth = contentWidth
      const colWidths = headers.map(() => tableWidth / headers.length)

      doc.setFillColor(245, 248, 252)
      doc.rect(left, y, tableWidth, 24, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      headers.forEach((h, i) => {
        doc.text(h, left + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 8, y + 16)
      })
      y += 24

      doc.setFont('helvetica', 'normal')
      rows.forEach((row, idx) => {
        const rowBg = idx % 2 === 0 ? [255, 255, 255] as [number, number, number] : [250, 252, 255] as [number, number, number]
        doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
        doc.rect(left, y, tableWidth, 24, 'F')
        row.forEach((cell, i) => {
          doc.setFontSize(9)
          const x = left + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 8
          doc.text(doc.splitTextToSize(cell, colWidths[i] - 12), x, y + 15)
        })
        y += 24
      })

      doc.setDrawColor(220, 227, 238)
      doc.rect(left, y - (24 * (rows.length + 1)), tableWidth, 24 * (rows.length + 1))
      y += 10
    }

    doc.setFillColor(33, 44, 86)
    doc.roundedRect(left, y, contentWidth, 56, 10, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('NeuroRehab Medical Session Report', left + 14, y + 24)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`${sessionDate}   |   ${diseaseName}   |   Severity: ${severity}`, left + 14, y + 42)
    y += 72
    doc.setTextColor(40, 48, 64)

    sectionHeader('Score Summary', [233, 141, 88])
    metricCard(left, 'Physical Score', `${physicalScore}%`, [255, 243, 236])
    metricCard(left + 170, 'Cognitive Score', `${cognitiveScore}%`, [241, 238, 255])
    metricCard(left + 340, 'Overall / XP', `${overallScore}%  |  +${xpEarned} XP`, [232, 252, 242])
    y += 72

    sectionHeader('Progress vs Previous Session', [108, 135, 196])
    const delta = (val: number | null) => (val === null ? 'N/A' : `${val > 0 ? '+' : ''}${val}%`)
    const previousLabel = progress.previousDate ? `Compared to ${progress.previousDate}` : 'No previous session available'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(previousLabel, left + 2, y)
    y += 16
    drawTable(
      ['Metric', 'Current', 'Delta'],
      [
        ['Physical', `${physicalScore}%`, delta(progress.physicalDelta)],
        ['Cognitive', `${cognitiveScore}%`, delta(progress.cognitiveDelta)],
        ['Overall', `${overallScore}%`, delta(progress.overallDelta)],
        ['Exercise Completion', `${progress.completionRate}%`, '—'],
        ['Rep Quality', `${progress.repQuality}%`, '—'],
        ['Cognitive Accuracy', `${progress.cognitiveAccuracy}%`, '—'],
        ['Avg Fatigue', progress.fatigue === null ? 'N/A' : `${progress.fatigue}/100`, '—'],
      ],
    )

    sectionHeader('Exercise Breakdown', [92, 168, 122])
    drawTable(
      ['Exercise', 'Reps', 'Duration', 'Quality', 'Status'],
      exerciseResults.map((r) => [
        r.name,
        `${r.reps}`,
        formatTime(r.duration),
        `${r.repQuality}%`,
        r.skipped ? 'Skipped' : 'Done',
      ]),
    )

    sectionHeader('Cognitive Breakdown', [138, 112, 199])
    drawTable(
      ['Game', 'Score', 'Accuracy', 'Status'],
      gameResults.map((g) => [
        g.name,
        `${g.score}`,
        `${Math.round(g.accuracy)}%`,
        g.skipped ? 'Skipped' : 'Done',
      ]),
    )

    sectionHeader('Clinical Notes', [93, 79, 172])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Dynamic Recovery Tip', left + 4, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(doc.splitTextToSize(tip, contentWidth - 8), left + 4, y)
    y += 26
    progress.messages.slice(0, 3).forEach((msg) => {
      ensureSpace(24)
      doc.setFontSize(9)
      doc.text(`- ${msg}`, left + 6, y)
      y += 14
    })

    const fileDate = sessionDate.replace(/\s+/g, '-').toLowerCase()
    doc.save(`neurorehab-report-${fileDate}.pdf`)
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
            <p className="text-sm text-accent-dark">You'll complete <b>3 physical exercises</b> via webcam, then <b>4 cognitive games</b>. You can skip any step — but it will affect your score.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webcam — left 2 cols */}
          <div className="lg:col-span-2">
            {sessionActive ? (
              <WebcamFeed
                sessionId={currentSessionId}
                exercise={currentEx}
                onPoseFrame={handlePoseFrame}
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

          {/* Digital Twin + Actions — right col */}
          <div className="space-y-3">
            <DigitalTwin
              exerciseName={currentEx.name}
              primaryJoints={currentEx.primary_joints}
              targetRomMin={currentEx.target_rom_min}
              targetRomMax={currentEx.target_rom_max}
              repCount={repCount}
              targetReps={currentEx.default_reps}
              liveData={liveData ?? undefined}
              isActive={sessionActive}
            />

            {/* Action buttons */}
            <div className="space-y-2">
              {!sessionActive ? (
                <button onClick={beginExercise} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Play className="w-4 h-4 fill-white" /> Start Webcam
                </button>
              ) : (
                <button onClick={() => finishExercise(false)} className="btn-primary w-full flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Mark Complete
                </button>
              )}
              <button onClick={() => finishExercise(true)} className="btn-secondary w-full flex items-center justify-center gap-2 text-danger border-danger/30 hover:bg-danger/5">
                <SkipForward className="w-4 h-4" /> Skip Exercise (−15%)
              </button>
            </div>

            {/* Exercise info */}
            <div className="glass-card p-3 text-center">
              <p className="text-3xl font-black text-accent">{formatTime(timer)}</p>
              <p className="text-xs text-text-muted mt-1">Session Duration</p>
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
    const tip = getDynamicTip(overallScore)
    const progress = getProgressInsights(physicalScore, cognitiveScore, overallScore)
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

          {/* Progress vs Previous Sessions */}
          <div className="space-y-3 p-5 rounded-2xl bg-blue-50 border border-blue-100">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-blue-700 uppercase tracking-widest">Progress vs Previous Session</p>
              <p className="text-xs text-blue-700/80">{progress.previousDate ? `Compared to ${progress.previousDate}` : 'First session baseline'}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white border border-blue-100">
                <p className="text-[11px] text-text-muted">Physical</p>
                <p className="text-lg font-bold text-text-primary">{physicalScore}%</p>
                <p className={`text-xs font-semibold ${(progress.physicalDelta ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {progress.physicalDelta === null ? 'N/A' : `${progress.physicalDelta > 0 ? '+' : ''}${progress.physicalDelta}%`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-blue-100">
                <p className="text-[11px] text-text-muted">Cognitive</p>
                <p className="text-lg font-bold text-text-primary">{cognitiveScore}%</p>
                <p className={`text-xs font-semibold ${(progress.cognitiveDelta ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {progress.cognitiveDelta === null ? 'N/A' : `${progress.cognitiveDelta > 0 ? '+' : ''}${progress.cognitiveDelta}%`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-blue-100">
                <p className="text-[11px] text-text-muted">Overall</p>
                <p className="text-lg font-bold text-text-primary">{overallScore}%</p>
                <p className={`text-xs font-semibold ${(progress.overallDelta ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {progress.overallDelta === null ? 'N/A' : `${progress.overallDelta > 0 ? '+' : ''}${progress.overallDelta}%`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-blue-100">
                <p className="text-[11px] text-text-muted">Rep Quality</p>
                <p className="text-lg font-bold text-text-primary">{progress.repQuality}%</p>
                <p className="text-xs font-semibold text-blue-700">Fatigue: {progress.fatigue === null ? 'N/A' : `${progress.fatigue}/100`}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {progress.messages.slice(0, 3).map((msg, idx) => (
                <p key={idx} className="text-xs text-text-secondary">• {msg}</p>
              ))}
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={downloadReportPdf} className="btn-secondary w-full py-4 text-base flex items-center justify-center gap-2">
              Download PDF Report
            </button>
            <button onClick={endSession} className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
              End Session & Save Report <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}
