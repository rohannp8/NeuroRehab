import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Exercise } from '../types'
import { Play, Pause, RotateCcw, Plus, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  exercise: Exercise
  onRepCounted?: (count: number) => void
}

// ─── Determine animation type from exercise ────────────────────────────────

function getAnimType(ex: Exercise): string {
  const n = ex.name.toLowerCase()
  const j = (ex.primary_joints[0] || '').toLowerCase()
  if (n.includes('shoulder') || j === 'shoulder') return 'shoulder'
  if (n.includes('elbow') || j === 'elbow') return 'elbow'
  if (n.includes('knee') || j === 'knee') return 'knee'
  if (n.includes('hip') || j === 'hip') return 'hip'
  if (n.includes('wrist') || j === 'wrist') return 'wrist'
  if (n.includes('ankle') || j === 'ankle') return 'ankle'
  return 'generic'
}

// ─── Exercise steps ────────────────────────────────────────────────────────

const STEPS: Record<string, { title: string; desc: string; tip: string }[]> = {
  shoulder: [
    { title: 'Start Position', desc: 'Stand tall, feet shoulder-width apart, arm resting at your side.', tip: '💡 Relax your neck and shoulders' },
    { title: 'Initiate Lift', desc: 'Slowly raise your arm straight forward with elbow fully extended.', tip: '💡 Breathe out as you lift' },
    { title: 'Full Flexion', desc: 'Reach arm overhead to full range — aim for 150° or as far as comfortable.', tip: '💡 No arching your back' },
    { title: 'Lower Down', desc: 'Slowly lower your arm back to the starting position.', tip: '💡 Control the descent — 3 seconds down' },
  ],
  elbow: [
    { title: 'Start Position', desc: 'Sit or stand with arm extended at your side, palm facing up.', tip: '💡 Keep your upper arm still' },
    { title: 'Bend', desc: 'Slowly curl your forearm upward by bending at the elbow.', tip: '💡 Breathe out during the lift' },
    { title: 'Peak', desc: 'Hold at the top for 1–2 seconds with a gentle squeeze.', tip: '💡 Squeeze your bicep at the top' },
    { title: 'Extend', desc: 'Slowly straighten the arm back to full extension.', tip: '💡 Gravity controls the return — keep it slow' },
  ],
  knee: [
    { title: 'Start Position', desc: 'Sit upright in a chair with feet flat on the floor.', tip: '💡 Hold the sides of the chair for support' },
    { title: 'Extend', desc: 'Slowly straighten your knee, lifting your foot off the ground.', tip: '💡 Breathe out as you straighten' },
    { title: 'Hold', desc: 'Hold the extended position for 2 seconds. Feel the quad engagement.', tip: '💡 Keep your thigh on the seat' },
    { title: 'Flex', desc: 'Slowly lower your foot back down, bending your knee.', tip: '💡 Control the descent — resist gravity' },
  ],
  hip: [
    { title: 'Start Position', desc: 'Stand upright next to a wall or chair for balance support.', tip: '💡 Keep your core lightly engaged' },
    { title: 'Abduction', desc: 'Slowly lift your leg out sideways, keeping toes pointed forward.', tip: '💡 Do not lean your body — isolate the hip' },
    { title: 'Hold', desc: 'Hold at the top for 1–2 seconds.', tip: '💡 Aim for 30–45° if possible' },
    { title: 'Return', desc: 'Slowly bring your leg back to the midline.', tip: '💡 Control the return — do not let it drop' },
  ],
  wrist: [
    { title: 'Start Position', desc: 'Rest your forearm on a table with your hand hanging off the edge.', tip: '💡 Keep forearm flat and steady' },
    { title: 'Extend', desc: 'Gently bend your wrist upward (extension), fingers pointing to the ceiling.', tip: '💡 Breathe steadily' },
    { title: 'Flex', desc: 'Bend your wrist downward (flexion), fingers pointing to the floor.', tip: '💡 Keep it slow and pain-free' },
    { title: 'Neutral', desc: 'Return to the neutral midpoint and relax before the next rep.', tip: '💡 Never force past pain' },
  ],
  ankle: [
    { title: 'Start Position', desc: 'Sit with your foot elevated or hang it off the edge of a chair.', tip: '💡 Relax your calf and shin' },
    { title: 'Dorsiflex', desc: 'Pull your toes up toward your shin as far as comfortable.', tip: '💡 Feel the stretch in your calf' },
    { title: 'Hold', desc: 'Hold the dorsiflexed position for 2–3 seconds.', tip: '💡 Breathe normally' },
    { title: 'Plantarflex', desc: 'Point your toes down away from you, hold 2 seconds, then return.', tip: '💡 Full smooth arc of motion' },
  ],
  generic: [
    { title: 'Prepare', desc: 'Position yourself comfortably with good posture.', tip: '💡 Take a deep breath and relax' },
    { title: 'Begin Movement', desc: 'Start the prescribed movement slowly and with full control.', tip: '💡 Quality over speed' },
    { title: 'Peak', desc: 'Pause at the end of the range. Never force into pain.', tip: '💡 Feel the muscle engaging' },
    { title: 'Return', desc: 'Slowly return to the start position, resisting gravity.', tip: '💡 The return motion is just as important' },
  ],
}

// ─── Improved Animated SVG Figure ─────────────────────────────────────────

function ExerciseFigure({ type, phase }: { type: string; phase: number }) {
  // phase 0=start, 1=moving, 2=peak, 3=return
  const accent = '#6366f1'
  const highlight = '#f59e0b'
  const muted = '#c7d2fe'

  // All figures share the same base body
  // We animate specific limbs based on type
  const upperArmAngle = (() => {
    if (type === 'shoulder') return [0, -60, -150, -60][phase] ?? 0
    return 0
  })()
  const foreArmAngle = (() => {
    if (type === 'elbow') return [0, 35, 80, 35][phase] ?? 0
    return 0
  })()
  const kneeAngle = (() => {
    if (type === 'knee') return [90, 45, 10, 45][phase] ?? 90
    return 90
  })()
  const hipAbdAngle = (() => {
    if (type === 'hip') return [0, 15, 30, 15][phase] ?? 0
    return 0
  })()
  const wristAngle = (() => {
    if (type === 'wrist') return [0, 20, -20, 0][phase] ?? 0
    return 0
  })()
  const ankleAngle = (() => {
    if (type === 'ankle') return [0, 20, -20, 10][phase] ?? 0
    return 0
  })()

  const isActive = (limb: string) => {
    const map: Record<string, string[]> = {
      shoulder: ['rightUpperArm'],
      elbow: ['rightForeArm'],
      knee: ['rightLowerLeg'],
      hip: ['rightLeg'],
      wrist: ['rightHand'],
      ankle: ['rightFoot'],
      generic: [],
    }
    return (map[type] || []).includes(limb)
  }

  return (
    <svg viewBox="0 0 200 280" className="w-full h-full" style={{ maxHeight: 260 }}>
      {/* Ground */}
      <line x1="20" y1="268" x2="180" y2="268" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />

      {/* Head */}
      <circle cx="100" cy="28" r="18" fill={accent} opacity="0.9" />
      {/* Face dots */}
      <circle cx="93" cy="26" r="2.5" fill="white" />
      <circle cx="107" cy="26" r="2.5" fill="white" />
      <path d="M93 34 Q100 39 107 34" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Neck */}
      <line x1="100" y1="46" x2="100" y2="58" stroke={accent} strokeWidth="6" strokeLinecap="round" />

      {/* Torso */}
      <rect x="76" y="58" width="48" height="70" rx="12" fill={muted} opacity="0.6" />
      <line x1="100" y1="58" x2="100" y2="128" stroke={accent} strokeWidth="8" strokeLinecap="round" />

      {/* LEFT ARM (static) */}
      <line x1="76" y1="68" x2="48" y2="110" stroke={muted} strokeWidth="6" strokeLinecap="round" />
      <line x1="48" y1="110" x2="34" y2="144" stroke={muted} strokeWidth="5" strokeLinecap="round" />

      {/* RIGHT UPPER ARM */}
      <g transform={`rotate(${upperArmAngle}, 124, 68)`}>
        <line x1="124" y1="68" x2="152" y2="110"
          stroke={isActive('rightUpperArm') ? highlight : accent}
          strokeWidth="6" strokeLinecap="round" />
        {/* RIGHT FOREARM */}
        <g transform={`rotate(${foreArmAngle}, 152, 110)`}>
          <line x1="152" y1="110" x2="166" y2="144"
            stroke={isActive('rightForeArm') ? highlight : accent}
            strokeWidth="5" strokeLinecap="round" />
          {/* RIGHT HAND */}
          <g transform={`rotate(${wristAngle}, 166, 144)`}>
            <ellipse cx="170" cy="152" rx="7" ry="10"
              fill={isActive('rightHand') ? highlight : muted} opacity="0.8" />
          </g>
        </g>
      </g>

      {/* HIPS */}
      <ellipse cx="100" cy="134" rx="24" ry="10" fill={muted} opacity="0.5" />

      {/* LEFT LEG (static) */}
      <line x1="88" y1="134" x2="78" y2="198" stroke={muted} strokeWidth="7" strokeLinecap="round" />
      <line x1="78" y1="198" x2="74" y2="240" stroke={muted} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="68" cy="248" rx="14" ry="6" fill={muted} opacity="0.5" />

      {/* RIGHT LEG (animated for knee/hip/ankle) */}
      <g transform={`rotate(${hipAbdAngle}, 112, 134)`}>
        <line x1="112" y1="134" x2="122" y2="198"
          stroke={isActive('rightLeg') ? highlight : accent}
          strokeWidth="7" strokeLinecap="round" />
        {/* RIGHT LOWER LEG */}
        <g transform={`rotate(${type === 'knee' ? (kneeAngle - 90) : 0}, 122, 198)`}>
          <line x1="122" y1="198" x2="126" y2="240"
            stroke={isActive('rightLowerLeg') ? highlight : accent}
            strokeWidth="6" strokeLinecap="round" />
          {/* FOOT */}
          <g transform={`rotate(${ankleAngle}, 126, 240)`}>
            <ellipse cx="136" cy="248" rx="16" ry="6"
              fill={isActive('rightFoot') ? highlight : muted} opacity="0.7" />
          </g>
        </g>
      </g>

      {/* Motion arc indicator for active figure type */}
      {type === 'shoulder' && (
        <path d="M 152 68 A 36 36 0 0 0 124 32" stroke={highlight} strokeWidth="2" fill="none" strokeDasharray="5,4" opacity="0.6" />
      )}
      {type === 'elbow' && (
        <path d="M 166 144 A 40 40 0 0 0 152 110" stroke={highlight} strokeWidth="2" fill="none" strokeDasharray="5,4" opacity="0.6" />
      )}
      {type === 'knee' && (
        <path d="M 126 240 A 44 44 0 0 1 122 198" stroke={highlight} strokeWidth="2" fill="none" strokeDasharray="5,4" opacity="0.6" />
      )}
    </svg>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function OfflineExercisePlayer({ exercise, onRepCounted }: Props) {
  const type = getAnimType(exercise)
  const steps = STEPS[type]

  const [repCount, setRepCount] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [timer, setTimer] = useState(0)
  const [figurePhase, setFigurePhase] = useState(0)   // 0→1→2→3→0→…
  const [stepIdx, setStepIdx] = useState(0)

  // Timer
  useEffect(() => {
    if (!isRunning) return
    const t = setInterval(() => setTimer(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [isRunning])

  // Animate figure phase (one phase per 1.5 s)
  useEffect(() => {
    if (!isRunning) return
    const t = setInterval(() => {
      setFigurePhase(p => {
        const next = (p + 1) % 4
        setStepIdx(next)
        return next
      })
    }, 1500)
    return () => clearInterval(t)
  }, [isRunning])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const countRep = () => {
    const n = repCount + 1
    setRepCount(n)
    onRepCounted?.(n)
  }

  const reset = () => {
    setRepCount(0)
    setTimer(0)
    setFigurePhase(0)
    setStepIdx(0)
    setIsRunning(false)
    onRepCounted?.(0)
  }

  const pct = Math.min((repCount / exercise.default_reps) * 100, 100)

  return (
    <div className="glass-card overflow-hidden bg-white h-full flex flex-col">
      {/* Banner */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-accent/10 to-purple-500/10 border-b border-border">
        <div>
          <p className="font-bold text-text-primary text-sm">{exercise.name}</p>
          <p className="text-xs text-purple-500 font-semibold uppercase tracking-widest">📴 Reference Mode</p>
        </div>
        <span className="text-xs bg-warn/15 text-warn-dark border border-warn/30 px-3 py-1 rounded-full font-semibold">Offline</span>
      </div>

      <div className="flex flex-col md:flex-row gap-0 flex-1">
        {/* Left: animated figure */}
        <div className="flex-1 min-h-[220px] flex items-center justify-center p-4 bg-gradient-to-b from-accent/5 to-page/80 border-b md:border-b-0 md:border-r border-border relative">
          <motion.div
            key={figurePhase}
            initial={{ opacity: 0.6, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-[160px] h-[220px]"
          >
            <ExerciseFigure type={type} phase={figurePhase} />
          </motion.div>

          {/* Phase label */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === figurePhase ? 'bg-accent' : 'bg-border'}`} />
            ))}
          </div>

          {isRunning && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] text-accent font-bold uppercase">Live</span>
            </div>
          )}
        </div>

        {/* Right: step guide + controls */}
        <div className="flex-1 p-4 flex flex-col gap-4">
          {/* Step card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="p-4 rounded-xl bg-accent-light border border-accent-200 space-y-1"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{stepIdx + 1}</div>
                <p className="font-bold text-accent-dark text-sm">{steps[stepIdx]?.title}</p>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed pl-8">{steps[stepIdx]?.desc}</p>
              <p className="text-xs text-accent pl-8 font-medium">{steps[stepIdx]?.tip}</p>
            </motion.div>
          </AnimatePresence>

          {/* Navigate steps manually */}
          <div className="flex items-center gap-2">
            <button onClick={() => setStepIdx(s => Math.max(0, s - 1))} className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-page transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="flex-1 text-center text-xs text-text-muted font-medium">Step {stepIdx + 1} of {steps.length}</span>
            <button onClick={() => setStepIdx(s => Math.min(steps.length - 1, s + 1))} className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-page transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-page border border-border text-center">
              <p className="text-2xl font-black text-accent">{repCount}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Reps Done</p>
              <p className="text-[10px] text-text-light">/ {exercise.default_reps} target</p>
            </div>
            <div className="p-3 rounded-xl bg-page border border-border text-center">
              <p className="text-xl font-bold font-mono text-text-primary">{formatTime(timer)}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Duration</p>
            </div>
          </div>

          {/* Rep progress bar */}
          <div>
            <div className="flex justify-between text-[10px] text-text-muted mb-1">
              <span>Progress</span><span>{Math.round(pct)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-page border border-border">
              <motion.div animate={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-accent to-purple-400" />
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsRunning(r => !r)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                isRunning
                  ? 'bg-warn/10 border border-warn/30 text-warn-dark hover:bg-warn/20'
                  : 'btn-primary'
              }`}
            >
              {isRunning ? <><Pause className="w-4 h-4" />Pause</> : <><Play className="w-4 h-4 fill-white" />Start Guide</>}
            </button>
            <button onClick={reset} className="p-2.5 rounded-xl border border-border text-text-muted hover:text-text-primary hover:bg-page transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Count Rep button */}
          <button
            onClick={countRep}
            className="w-full py-3.5 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 text-accent font-bold flex items-center justify-center gap-2 hover:bg-accent/10 transition-colors active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" /> Tap to Count a Rep
          </button>

          {pct >= 100 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30 text-success-dark">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-sm font-semibold">Target reached! Great work 🎉</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
