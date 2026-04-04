import { useState, useEffect, useRef } from 'react'
import type { Exercise } from '../types'
import { Play, Pause, RotateCcw, Plus, CheckCircle2 } from 'lucide-react'

interface Props {
  exercise: Exercise
  onRepCounted?: (count: number) => void
}

// Map joint/exercise names to an animation style
function getExerciseAnimation(ex: Exercise): string {
  const name = ex.name.toLowerCase()
  const joint = ex.primary_joints[0]?.toLowerCase() || ''

  if (name.includes('shoulder') || joint === 'shoulder') return 'shoulder'
  if (name.includes('elbow') || joint === 'elbow') return 'elbow'
  if (name.includes('knee') || joint === 'knee') return 'knee'
  if (name.includes('hip') || joint === 'hip') return 'hip'
  if (name.includes('wrist') || joint === 'wrist') return 'wrist'
  if (name.includes('ankle') || joint === 'ankle') return 'ankle'
  return 'generic'
}

// Step instructions per animation type
const STEPS: Record<string, string[]> = {
  shoulder: ['Stand tall with feet shoulder-width apart.', 'Keep your elbow straight throughout.', 'Slowly raise your arm forward and up.', 'Reach overhead then lower back down slowly.', 'Breathe out as you lift, breathe in as you lower.'],
  elbow: ['Sit or stand comfortably.', 'Start with arm fully extended.', 'Bend your elbow, bringing your hand toward your shoulder.', 'Squeeze at the top, then slowly extend back.', 'Keep upper arm still throughout the movement.'],
  knee: ['Stand or sit as prescribed.', 'Start with your leg extended.', 'Slowly bend the knee, bringing your heel toward you.', 'Pause at maximum bend without forcing pain.', 'Slowly straighten back to the start position.'],
  hip: ['Stand with light support nearby for balance.', 'Keep your core engaged and back straight.', 'Slowly move your leg outward, away from your body.', 'Keep your toes pointing forward, not outward.', 'Slowly bring your leg back to center.'],
  wrist: ['Rest your forearm on a flat surface.', 'Let your hand hang off the edge.', 'Rotate your wrist clockwise in a smooth circle.', 'Reverse the direction after 5 rotations.', 'Keep the movement slow and controlled.'],
  ankle: ['Sit with your foot off the floor.', 'Pull your toes up toward your shin (dorsiflexion).', 'Hold for 2 seconds at the top.', 'Point your toes down (plantarflexion).', 'Repeat in a smooth, rhythmic motion.'],
  generic: ['Position yourself comfortably.', 'Begin the movement slowly and in a controlled manner.', 'Breathe steadily throughout the exercise.', 'Stop if you feel sharp pain.', 'Focus on quality over quantity.'],
}

// Animated SVG figure for each exercise type
function ExerciseAnimation({ type }: { type: string }) {

  return (
    <div className="flex items-center justify-center h-48">
      <svg viewBox="0 0 120 160" className="w-32 h-48" aria-label="Exercise demonstration">
        {/* Body */}
        <circle cx="60" cy="20" r="12" fill="#6366f1" opacity="0.85" /> {/* Head */}
        <line x1="60" y1="32" x2="60" y2="90" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" /> {/* Torso */}
        {/* Legs */}
        <line x1="60" y1="90" x2="40" y2="130" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" />
        <line x1="60" y1="90" x2="80" y2="130" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" />
        {/* Feet */}
        <line x1="40" y1="130" x2="30" y2="140" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
        <line x1="80" y1="130" x2="90" y2="140" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
        {/* Arms — animated per type */}
        {type === 'shoulder' && (
          <>
            <line x1="60" y1="45" x2="25" y2="75" stroke="#a5b4fc" strokeWidth="5" strokeLinecap="round" />
            <line x1="60" y1="45" x2="95" y2="75" stroke="#6366f1" strokeWidth="5" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 60 45" to="-90 60 45" dur="2s" repeatCount="indefinite" additive="sum" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" keyTimes="0;0.5;1" values="0 60 45; -90 60 45; 0 60 45" />
            </line>
          </>
        )}
        {type === 'elbow' && (
          <>
            <line x1="60" y1="45" x2="25" y2="75" stroke="#a5b4fc" strokeWidth="5" strokeLinecap="round" />
            <g>
              <line x1="95" y1="45" x2="95" y2="75" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" transform="translate(-35 0)">
                <animateTransform attributeName="transform" type="rotate" from="0 60 45" to="70 60 45" dur="1.5s" repeatCount="indefinite" additive="sum" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" keyTimes="0;0.5;1" values="0 60 45; 70 60 45; 0 60 45" />
              </line>
            </g>
          </>
        )}
        {(type === 'knee' || type === 'hip' || type === 'ankle') && (
          <>
            <line x1="60" y1="45" x2="25" y2="75" stroke="#a5b4fc" strokeWidth="5" strokeLinecap="round" />
            <line x1="60" y1="45" x2="95" y2="75" stroke="#a5b4fc" strokeWidth="5" strokeLinecap="round" />
            {/* Animate one leg */}
            <line x1="60" y1="90" x2="80" y2="130" stroke="#6366f1" strokeWidth="5" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 60 90" to={type === 'hip' ? "25 60 90" : "15 60 90"} dur="2s" repeatCount="indefinite" additive="sum" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" keyTimes="0;0.5;1" values={`0 60 90; ${type === 'hip' ? 25 : 15} 60 90; 0 60 90`} />
            </line>
          </>
        )}
        {(type === 'wrist' || type === 'generic') && (
          <>
            <line x1="60" y1="45" x2="25" y2="75" stroke="#a5b4fc" strokeWidth="5" strokeLinecap="round" />
            <line x1="60" y1="45" x2="95" y2="75" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" />
            <circle cx="95" cy="75" r="6" fill="#818cf8">
              <animateTransform attributeName="transform" type="rotate" from="0 95 75" to="360 95 75" dur="3s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
    </div>
  )
}

export default function OfflineExercisePlayer({ exercise, onRepCounted }: Props) {
  const animType = getExerciseAnimation(exercise)
  const steps = STEPS[animType]

  const [repCount, setRepCount] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [timer, setTimer] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimer(t => t + 1)
        setCurrentStep(s => (s + 1) % steps.length)
      }, 3000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, steps.length])

  const countRep = () => {
    const next = repCount + 1
    setRepCount(next)
    onRepCounted?.(next)
  }

  const reset = () => {
    setRepCount(0)
    setTimer(0)
    setCurrentStep(0)
    setIsRunning(false)
    onRepCounted?.(0)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="glass-card overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/10 to-purple-500/10 border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-text-primary">{exercise.name}</h3>
          <p className="text-xs text-accent font-semibold uppercase tracking-widest">📴 Reference Mode (Offline)</p>
        </div>
        <span className="text-xs bg-warn/10 text-warn-dark border border-warn/30 px-3 py-1 rounded-full font-semibold">No Webcam</span>
      </div>

      <div className="p-6 space-y-5">
        {/* Animated figure */}
        <div className="bg-gradient-to-b from-accent/5 to-page rounded-2xl border border-border">
          <ExerciseAnimation type={animType} />
          <p className="text-center text-xs text-text-muted pb-4">Animated reference demonstration</p>
        </div>

        {/* Step guide — cycling through */}
        <div className="p-4 rounded-xl bg-accent-light border border-accent-200 min-h-[64px] flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{currentStep + 1}</div>
          <p className="text-sm text-accent-dark font-medium">{steps[currentStep]}</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-page border border-border text-center">
            <p className="text-3xl font-black text-accent">{repCount}</p>
            <p className="text-xs text-text-muted mt-0.5">Reps Done</p>
            <p className="text-xs text-text-light">/ {exercise.default_reps} target</p>
          </div>
          <div className="p-4 rounded-xl bg-page border border-border text-center">
            <p className="text-2xl font-bold font-mono text-text-primary">{formatTime(timer)}</p>
            <p className="text-xs text-text-muted mt-0.5">Duration</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={() => setIsRunning(r => !r)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors ${
              isRunning ? 'bg-warn/10 border border-warn/30 text-warn-dark hover:bg-warn/20' : 'btn-primary'
            }`}
          >
            {isRunning ? <><Pause className="w-4 h-4" /> Pause Guide</> : <><Play className="w-4 h-4 fill-white" /> Start Guide</>}
          </button>
          <button onClick={reset} className="p-3 rounded-xl border border-border text-text-muted hover:text-text-primary hover:bg-page transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={countRep}
          className="w-full py-4 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 text-accent font-bold text-lg flex items-center justify-center gap-2 hover:bg-accent/10 transition-colors active:scale-95"
        >
          <Plus className="w-5 h-5" /> Tap to Count a Rep
        </button>

        {repCount >= exercise.default_reps && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30 text-success-dark">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <span className="text-sm font-semibold">Target reps reached! Great job 🎉</span>
          </div>
        )}
      </div>
    </div>
  )
}
