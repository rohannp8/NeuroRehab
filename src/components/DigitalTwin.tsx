/**
 * DigitalTwin.tsx
 * Animated SVG mannequin that mirrors the prescribed exercise in real-time.
 * - Detects exercise type from name/joints
 * - Animates the relevant limb in a smooth demo loop
 * - Overlays live ROM arc and target angle from backend digital_twin data
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface DigitalTwinData {
  predicted_rom?: number
  fatigue_score?: number
  target_angle?: number
  deviation_score?: number
}

interface DigitalTwinProps {
  exerciseName: string
  primaryJoints: string[]
  targetRomMin: number
  targetRomMax: number
  repCount: number
  targetReps: number
  liveData?: DigitalTwinData
  isActive: boolean
}

// ── Determine animation type from exercise ───────────────────────────────────
function getAnimType(name: string, joints: string[]): string {
  const n = name.toLowerCase()
  const j = (joints[0] || '').toLowerCase()
  if (n.includes('finger tapping') || n.includes('finger tap')) return 'finger_tap'
  if (n.includes('fist stretch') || n.includes('fist')) return 'fist_stretch'
  if (j.includes('finger')) return 'finger_tap'
  if (n.includes('shoulder') || j === 'shoulder') return 'shoulder'
  if (n.includes('elbow') || n.includes('extension') || j === 'elbow') return 'elbow'
  if (n.includes('knee') || j === 'knee') return 'knee'
  if (n.includes('hip') || j === 'hip') return 'hip'
  if (n.includes('wrist') || j === 'wrist') return 'wrist'
  if (n.includes('ankle') || j === 'ankle') return 'ankle'
  return 'generic'
}

// ── Phase labels for each exercise ────────────────────────────────────────────
const PHASE_LABELS: Record<string, string[]> = {
  finger_tap:['Open Hand', 'Move Thumb In', 'Thumb + Index Touch', 'Open Again'],
  fist_stretch: ['Open Fingers', 'Start Curl', 'Full Fist', 'Open Again'],
  shoulder:  ['Rest', 'Lift Forward', 'Full Flexion', 'Lower Down'],
  elbow:     ['Extended', 'Begin Bend', 'Full Curl', 'Extend Back'],
  knee:      ['Seated', 'Extend Leg', 'Hold', 'Lower Down'],
  hip:       ['Rest', 'Lift Sideways', 'Hold', 'Return'],
  wrist:     ['Neutral', 'Extend Up', 'Flex Down', 'Neutral'],
  ankle:     ['Neutral', 'Dorsiflexion', 'Hold', 'Plantarflex'],
  generic:   ['Start', 'Move', 'Peak', 'Return'],
}

function HandGuideSVG({ type, phase }: { type: string; phase: number }) {
  const accent = '#f97316'
  const skin = '#f4d6bc'
  const stroke = '#334155'

  const fingerTapThumbX = [162, 150, 138, 150][phase] ?? 150
  const fingerTapThumbY = [176, 174, 170, 174][phase] ?? 174
  const fingerTapPulse = phase === 2

  const fistScaleY = [1, 0.88, 0.74, 0.88][phase] ?? 0.88
  const fistTranslateY = [0, 6, 12, 6][phase] ?? 6

  return (
    <svg viewBox="0 0 220 320" width="100%" height="100%" style={{ maxHeight: 280 }}>
      <defs>
        <radialGradient id="handBg" cx="50%" cy="52%" r="52%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <filter id="tapGlow">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <ellipse cx="110" cy="164" rx="94" ry="86" fill="url(#handBg)" />

      {/* Palm */}
      <rect x="70" y="140" width="80" height="108" rx="28" fill={skin} stroke={stroke} strokeWidth="2" />

      {type === 'finger_tap' ? (
        <>
          {/* Fingers */}
          <rect x="78" y="86" width="15" height="70" rx="8" fill={skin} stroke={stroke} strokeWidth="2" />
          <rect x="96" y="82" width="15" height="74" rx="8" fill={skin} stroke={stroke} strokeWidth="2" />
          <rect x="114" y="84" width="15" height="72" rx="8" fill={skin} stroke={stroke} strokeWidth="2" />
          <rect x="132" y="90" width="14" height="66" rx="8" fill={skin} stroke={stroke} strokeWidth="2" />

          {/* Thumb moving toward index */}
          <g transform={`translate(${fingerTapThumbX - 150}, ${fingerTapThumbY - 174})`}>
            <ellipse cx="150" cy="174" rx="18" ry="10" fill={skin} stroke={stroke} strokeWidth="2" />
          </g>

          {/* Tap target */}
          <circle cx="103" cy="155" r={fingerTapPulse ? 10 : 6} fill="none" stroke={accent} strokeWidth="2" opacity={fingerTapPulse ? 0.95 : 0.5} filter={fingerTapPulse ? 'url(#tapGlow)' : undefined} />
          <path d="M166 168 L141 158" stroke={accent} strokeWidth="2.5" strokeDasharray="5,4" strokeLinecap="round" />
          <text x="110" y="275" textAnchor="middle" fill="#ffd1b3" fontSize="12" fontWeight="bold">Touch thumb to index fingertip</text>
        </>
      ) : (
        <>
          {/* Fist stretch: finger curl guide */}
          <g transform={`translate(0, ${fistTranslateY})`}>
            <rect x="78" y="92" width="15" height="70" rx="8" fill={skin} stroke={stroke} strokeWidth="2" transform={`translate(85.5 160) scale(1 ${fistScaleY}) translate(-85.5 -160)`} />
            <rect x="96" y="88" width="15" height="74" rx="8" fill={skin} stroke={stroke} strokeWidth="2" transform={`translate(103.5 160) scale(1 ${fistScaleY}) translate(-103.5 -160)`} />
            <rect x="114" y="90" width="15" height="72" rx="8" fill={skin} stroke={stroke} strokeWidth="2" transform={`translate(121.5 160) scale(1 ${fistScaleY}) translate(-121.5 -160)`} />
            <rect x="132" y="96" width="14" height="66" rx="8" fill={skin} stroke={stroke} strokeWidth="2" transform={`translate(139 160) scale(1 ${fistScaleY}) translate(-139 -160)`} />
            <ellipse cx="150" cy="178" rx="18" ry="10" fill={skin} stroke={stroke} strokeWidth="2" transform={`translate(-8, ${fistTranslateY * 0.4}) rotate(-14 150 178)`} />
          </g>
          <text x="110" y="275" textAnchor="middle" fill="#ffd1b3" fontSize="12" fontWeight="bold">Open fully, then close to fist</text>
        </>
      )}

      {/* Phase dots */}
      <g transform="translate(80, 296)">
        {[0, 1, 2, 3].map(i => (
          <circle key={i} cx={i * 20} cy="0" r="4"
            fill={i === phase ? accent : '#444'}
            opacity={i === phase ? 1 : 0.4}
          />
        ))}
      </g>
    </svg>
  )
}

// ── Main SVG Mannequin ────────────────────────────────────────────────────────
function MannequinSVG({ type, phase, live }: { type: string; phase: number; live?: DigitalTwinData }) {
  if (type === 'finger_tap' || type === 'fist_stretch') {
    return <HandGuideSVG type={type} phase={phase} />
  }

  const accent = '#f97316'     // orange highlight on active limb
  const body   = '#c8cdd6'     // grey body
  const joint  = '#e2e5eb'     // lighter joint caps

  // Compute angles from phase (0=start, 1=moving, 2=peak, 3=return)
  const rightShoulderAngle = type === 'shoulder' ? [0, -50, -155, -80][phase] ?? 0 : 0
  const rightElbowBend     = type === 'elbow'    ? [0, 40, 90, 40][phase]    ?? 0 : 0
  const rightKneeAngle     = type === 'knee'     ? [80, 40, 5, 40][phase]    ?? 80 : 80
  const rightHipAbdAngle   = type === 'hip'      ? [0, 15, 32, 15][phase]    ?? 0 : 0
  const rightWristAngle    = type === 'wrist'    ? [0, 25, -25, 0][phase]    ?? 0 : 0
  const rightAnkleAngle    = type === 'ankle'    ? [0, 20, -20, 10][phase]   ?? 0 : 0

  // Live predicted ROM arc radius (normalize 0-180 → 30-90 px)
  const romRadius = live?.predicted_rom ? Math.max(28, Math.min(80, live.predicted_rom * 0.5)) : 55

  return (
    <svg viewBox="0 0 220 320" width="100%" height="100%" style={{ maxHeight: 280 }}>
      {/* Background glow */}
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx="110" cy="160" rx="90" ry="80" fill="url(#bgGlow)" />

      {/* Ground shadow */}
      <ellipse cx="110" cy="308" rx="50" ry="8" fill="#00000040" />

      {/* ── HEAD ── */}
      <circle cx="110" cy="30" r="20" fill={joint} />
      {/* Face details */}
      <circle cx="103" cy="27" r="2.5" fill="#2a2e3e" />
      <circle cx="117" cy="27" r="2.5" fill="#2a2e3e" />
      <path d="M103 36 Q110 41 117 36" stroke="#2a2e3e" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* ── NECK ── */}
      <rect x="105" y="49" width="10" height="12" rx="4" fill={body} />

      {/* ── TORSO ── */}
      <rect x="82" y="60" width="56" height="78" rx="14" fill={body} />
      {/* Torso shading */}
      <rect x="82" y="60" width="28" height="78" rx="14" fill="#00000015" />
      {/* Chest line */}
      <line x1="110" y1="65" x2="110" y2="132" stroke="#b0b5c0" strokeWidth="1.5" strokeDasharray="3,3" />

      {/* ── HIPS ── */}
      <ellipse cx="110" cy="140" rx="30" ry="12" fill={body} />

      {/* ────── LEFT ARM (static reference) ────── */}
      <g opacity="0.5">
        {/* Left upper arm */}
        <line x1="82" y1="72" x2="58" y2="110" stroke={body} strokeWidth="10" strokeLinecap="round" />
        {/* Left forearm */}
        <line x1="58" y1="110" x2="44" y2="148" stroke={body} strokeWidth="8" strokeLinecap="round" />
        {/* Left hand */}
        <ellipse cx="40" cy="158" rx="8" ry="11" fill={body} />
        {/* Left joint caps */}
        <circle cx="58" cy="110" r="6" fill={joint} opacity="0.6" />
      </g>

      {/* ────── RIGHT ARM (animated) ────── */}
      <g transform={`rotate(${rightShoulderAngle}, 138, 72)`}>
        {/* Upper arm */}
        <line x1="138" y1="72" x2="162" y2="112"
          stroke={type === 'shoulder' ? accent : body}
          strokeWidth="10" strokeLinecap="round"
          filter={type === 'shoulder' ? 'url(#glow)' : undefined}
        />
        {/* Elbow joint cap */}
        <circle cx="162" cy="112" r="7" fill={type === 'shoulder' || type === 'elbow' ? accent : joint} />

        {/* Forearm (elbow bend) */}
        <g transform={`rotate(${rightElbowBend}, 162, 112)`}>
          <line x1="162" y1="112" x2="176" y2="150"
            stroke={type === 'elbow' ? accent : body}
            strokeWidth="8" strokeLinecap="round"
            filter={type === 'elbow' ? 'url(#glow)' : undefined}
          />
          {/* Wrist */}
          <g transform={`rotate(${rightWristAngle}, 176, 150)`}>
            <ellipse cx="181" cy="162" rx="8" ry="11"
              fill={type === 'wrist' ? accent : body}
              filter={type === 'wrist' ? 'url(#glow)' : undefined}
            />
          </g>
        </g>
      </g>

      {/* ────── LEFT LEG (static) ────── */}
      <g opacity="0.5">
        <line x1="96" y1="144" x2="86" y2="210" stroke={body} strokeWidth="12" strokeLinecap="round" />
        <line x1="86" y1="210" x2="82" y2="265" stroke={body} strokeWidth="10" strokeLinecap="round" />
        <ellipse cx="74" cy="278" rx="18" ry="8" fill={body} />
        <circle cx="86" cy="210" r="8" fill={joint} opacity="0.6" />
      </g>

      {/* ────── RIGHT LEG (animated for knee/hip/ankle) ────── */}
      <g transform={`rotate(${rightHipAbdAngle}, 124, 144)`}>
        {/* Thigh */}
        <line x1="124" y1="144" x2="134" y2="210"
          stroke={type === 'hip' ? accent : body}
          strokeWidth="12" strokeLinecap="round"
          filter={type === 'hip' ? 'url(#glow)' : undefined}
        />
        {/* Knee cap */}
        <circle cx="134" cy="210" r="9" fill={type === 'knee' || type === 'hip' ? accent : joint} />

        {/* Lower leg (knee bend) */}
        <g transform={`rotate(${type === 'knee' ? (rightKneeAngle - 80) : 0}, 134, 210)`}>
          <line x1="134" y1="210" x2="138" y2="265"
            stroke={type === 'knee' ? accent : body}
            strokeWidth="10" strokeLinecap="round"
            filter={type === 'knee' ? 'url(#glow)' : undefined}
          />
          {/* Ankle */}
          <g transform={`rotate(${rightAnkleAngle}, 138, 265)`}>
            <ellipse cx="150" cy="276" rx="20" ry="8"
              fill={type === 'ankle' ? accent : body}
              filter={type === 'ankle' ? 'url(#glow)' : undefined}
            />
          </g>
        </g>
      </g>

      {/* ────── Active Joint Callout & ROM Arc ────── */}
      {type === 'shoulder' && (
        <>
          <path
            d={`M 138 72 A ${romRadius} ${romRadius} 0 0 0 ${138 - romRadius * 0.7} ${72 - romRadius * 0.7}`}
            stroke={accent} strokeWidth="2" fill="none" strokeDasharray="5,4" opacity="0.7"
          />
          <text x="145" y="35" fill={accent} fontSize="11" fontWeight="bold">{live?.predicted_rom?.toFixed(0) ?? '—'}°</text>
        </>
      )}
      {type === 'elbow' && (
        <>
          <path d={`M 162 112 A 36 36 0 0 0 ${162 + 30} 135`} stroke={accent} strokeWidth="2" fill="none" strokeDasharray="5,4" opacity="0.7" />
          <text x="172" y="108" fill={accent} fontSize="11" fontWeight="bold">{live?.predicted_rom?.toFixed(0) ?? '—'}°</text>
        </>
      )}
      {type === 'knee' && (
        <>
          <path d={`M 134 210 A 36 36 0 0 1 ${134 + 28} 190`} stroke={accent} strokeWidth="2" fill="none" strokeDasharray="5,4" opacity="0.7" />
          <text x="148" y="208" fill={accent} fontSize="11" fontWeight="bold">{live?.predicted_rom?.toFixed(0) ?? '—'}°</text>
        </>
      )}

      {/* ── Phase step dots at bottom ── */}
      <g transform="translate(80, 296)">
        {[0, 1, 2, 3].map(i => (
          <circle key={i} cx={i * 20} cy="0" r="4"
            fill={i === phase ? accent : '#444'}
            opacity={i === phase ? 1 : 0.4}
          />
        ))}
      </g>
    </svg>
  )
}

// ── Main DigitalTwin Component ────────────────────────────────────────────────
export default function DigitalTwin({
  exerciseName, primaryJoints, targetRomMin, targetRomMax,
  repCount, targetReps, liveData, isActive
}: DigitalTwinProps) {
  const type = getAnimType(exerciseName, primaryJoints)
  const labels = PHASE_LABELS[type]
  const [phase, setPhase] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isHandGuide = type === 'finger_tap' || type === 'fist_stretch'

  // Animate through 4 phases only when active
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isActive) return
    intervalRef.current = setInterval(() => {
      setPhase(p => (p + 1) % 4)
    }, isHandGuide ? 850 : 1400)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isActive, type, isHandGuide])

  const currentPhase = isActive ? phase : 0

  const pct = Math.min((repCount / Math.max(targetReps, 1)) * 100, 100)
  const fatigue = liveData?.fatigue_score ?? 0
  const rom = liveData?.predicted_rom ?? 0

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="font-bold text-text-primary text-sm">{exerciseName}</p>
          <p className="text-[10px] text-accent uppercase tracking-widest font-semibold">
            {isActive ? '⚡ AI Digital Twin — Live Guide' : '↓ Click Start Webcam to begin'}
          </p>
        </div>
        {isActive && (
          <span
            className="text-[10px] px-2 py-1 rounded-full font-bold border"
            style={{
              background: fatigue > 70 ? '#ff444420' : '#00e5a020',
              color: fatigue > 70 ? '#ff6060' : '#00e5a0',
              borderColor: fatigue > 70 ? '#ff444440' : '#00e5a040',
            }}
          >
            {fatigue > 70 ? '🔥 High Fatigue' : '✓ Good Effort'}
          </span>
        )}
      </div>

      {/* SVG Mannequin */}
      <div
        className="flex-1 flex items-center justify-center p-3 relative"
        style={{ background: 'linear-gradient(135deg, #0f1118 0%, #1a1d2e 100%)', minHeight: 230 }}
      >
        <motion.div
          key={currentPhase}
          initial={{ opacity: 0.7, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full"
          style={{ maxWidth: 180 }}
        >
          <MannequinSVG type={type} phase={currentPhase} live={liveData} />
        </motion.div>

        {/* Phase label */}
        <motion.div
          key={`label-${currentPhase}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 left-0 right-0 text-center"
        >
          <span
            className="inline-block text-[11px] font-bold px-3 py-1 rounded-full"
            style={{ background: '#f9731620', color: '#f97316', border: '1px solid #f9731630' }}
          >
            Step {currentPhase + 1}: {labels[currentPhase]}
          </span>
        </motion.div>
      </div>

      {/* Live Metrics Bar */}
      <div className="px-4 py-3 border-t border-border space-y-2.5 bg-page">
        {/* Rep progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted font-medium">Reps Completed</span>
            <span className="font-bold text-text-primary">{repCount} / {targetReps}</span>
          </div>
          <div className="w-full h-2 bg-page border border-border rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #f97316, #fb923c)' }}
            />
          </div>
        </div>

        {/* Live ROM gauge */}
        {isActive && !isHandGuide && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted font-medium">Live ROM</span>
              <span className="font-bold text-accent">
                {rom > 0 ? `${rom.toFixed(0)}°` : '—'} / {targetRomMax}°
              </span>
            </div>
            <div className="w-full h-1.5 bg-page border border-border rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${Math.min((rom / targetRomMax) * 100, 100)}%` }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-full"
                style={{
                  background: rom >= targetRomMin
                    ? 'linear-gradient(90deg, #00e5a0, #00c880)'
                    : 'linear-gradient(90deg, #ffb300, #ff9800)',
                }}
              />
            </div>
          </div>
        )}

        {isActive && isHandGuide && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted font-medium">Guide Rhythm</span>
              <span className="font-bold text-accent">{type === 'finger_tap' ? 'Tap and Release' : 'Open and Close'}</span>
            </div>
          </div>
        )}

        {/* Target ROM info */}
        <div className="flex justify-between text-xs text-text-muted">
          <span>Target ROM</span>
          <span className="font-semibold text-text-primary">{isHandGuide ? 'Guided by hand animation' : `${targetRomMin}°–${targetRomMax}°`}</span>
        </div>
        <div className="flex justify-between text-xs text-text-muted">
          <span>Primary Joint</span>
          <span className="font-semibold text-text-primary capitalize">{primaryJoints.join(', ')}</span>
        </div>
      </div>
    </div>
  )
}
