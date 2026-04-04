import { useRef, useEffect, useState, useCallback } from 'react'
import { Camera, CameraOff, Wifi, WifiOff, Activity, Brain, Heart, Zap, AlertCircle } from 'lucide-react'
import type { Exercise } from '../types'

interface InferenceResult {
  landmarks_px?: Array<{ x: number; y: number; z: number; visibility: number }>
  exercise?: string
  confidence?: number
  rep_count?: number
  angles?: Record<string, number | string | null>
  feedback?: { status: string; color: string; message: string }
  digital_twin?: { predicted_rom: number; fatigue_score: number; target_angle: number; deviation_score: number }
  cognitive_engagement?: { cognitive_lstm: { score: number; trend: string }; face_m12: { engagement: number; pain: number; emotion: string } }
  form?: { is_correct: boolean; anomaly_score: number | null }
  metrics?: { latency_ms: number; frame_num: number }
}

// MediaPipe Pose connections (33 landmarks)
const POSE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],
  [9,10],[11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28],[27,29],[28,30],[29,31],[30,32]
]

const FEEDBACK_COLORS: Record<string, string> = {
  correct: '#00E5A0',
  warning: '#FFD600',
  incorrect: '#FF4444',
}

interface WebcamFeedProps {
  sessionId: string
  exercise: Exercise
  onPoseFrame?: (result: InferenceResult) => void
  onRepCounted?: (count: number) => void
  onFeedback?: (message: string) => void
}

export default function WebcamFeed({ sessionId, exercise, onPoseFrame, onRepCounted, onFeedback }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const animFrameRef = useRef<number>(0)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const frameCountRef = useRef<number>(0)
  const reconnectAttemptsRef = useRef(0)
  const reconnectFnRef = useRef<(() => void) | null>(null)
  const awaitingInferenceRef = useRef(false)
  const isMountedRef = useRef(true)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [wsError, setWsError] = useState<string | null>(null)
  const [result, setResult] = useState<InferenceResult | null>(null)
  const [latencyMs, setLatencyMs] = useState<number>(0)
  const [frameRate, setFrameRate] = useState<number>(0)
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0)
  const exerciseName = exercise.name
  const wsUrl = (() => {
    const envUrl = import.meta.env.VITE_BACKEND_WS_URL as string | undefined
    if (envUrl) return envUrl
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${window.location.host}/ws/pose`
  })()

  // ────────────────────────────────────────────────────────────────
  // START CAMERA
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true
    let stream: MediaStream | null = null
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraActive(true)
          setCameraError(null)
          console.log('✅ Camera started successfully')
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const message = errorMsg.includes('NotAllowedError')
          ? 'Camera access denied. Please allow camera access in your browser settings.'
          : 'Failed to access camera. Make sure it\'s not in use by another application.'
        setCameraError(message)
        setCameraActive(false)
        console.error('❌ Camera error:', message)
      }
    }
    
    startCamera()
    
    return () => {
      isMountedRef.current = false
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // ────────────────────────────────────────────────────────────────
  // WEBSOCKET CONNECTION WITH AUTO-RECONNECT
  // ────────────────────────────────────────────────────────────────
  const connectWebSocket = useCallback(() => {
    const current = wsRef.current
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return
    }

    console.log(`🔗 Connecting to WebSocket: ${wsUrl}`)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      setWsError(null)
      reconnectAttemptsRef.current = 0
      awaitingInferenceRef.current = false
      setReconnectAttempts(0)
      frameCountRef.current = 0
      console.log('✅ WebSocket connected')
    }

    ws.onclose = (event) => {
      setWsConnected(false)
      awaitingInferenceRef.current = false
      console.log(`🔌 WebSocket closed (code: ${event.code}, reason: ${event.reason || 'no reason'})`)

      if (!isMountedRef.current) return
      if (reconnectAttemptsRef.current >= 5) {
        setWsError('Failed to connect after 5 attempts. Please refresh the page.')
        console.error('❌ Max reconnect attempts reached')
        return
      }

      const nextAttempt = reconnectAttemptsRef.current + 1
      reconnectAttemptsRef.current = nextAttempt
      setReconnectAttempts(nextAttempt)

      const delay = Math.min(1000 * Math.pow(2, nextAttempt - 1), 10000)
      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectFnRef.current?.()
      }, delay)
    }

    ws.onerror = (event) => {
      setWsConnected(false)
      awaitingInferenceRef.current = false
      setWsError('WebSocket error occurred')
      console.error('❌ WebSocket error:', event)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)

        if (msg.event === 'inference_result') {
          awaitingInferenceRef.current = false
          const r: InferenceResult = msg.data
          setResult(r)
          setLatencyMs(r.metrics?.latency_ms ?? 0)

          frameCountRef.current++
          if (frameCountRef.current % 30 === 0) {
            const estimatedFps = 1000 / Math.max(r.metrics?.latency_ms ?? 50, 1)
            setFrameRate(Math.round(estimatedFps * 10) / 10)
          }

          onPoseFrame?.(r)
          if (r.feedback?.message) onFeedback?.(r.feedback.message)
          if (r.rep_count !== undefined) onRepCounted?.(r.rep_count)
        } else if (msg.event === 'audio_stream') {
          try {
            const audio = new Audio(`data:audio/wav;base64,${msg.data.audio_base64}`)
            audio.play().catch(err => console.debug('Audio play error:', err))
          } catch (err) {
            console.debug('Audio processing error:', err)
          }
        }
      } catch (e) {
        awaitingInferenceRef.current = false
        console.error('❌ Message parse error:', e)
      }
    }
  }, [onFeedback, onPoseFrame, onRepCounted, wsUrl])

  useEffect(() => {
    reconnectFnRef.current = connectWebSocket
  }, [connectWebSocket])

  useEffect(() => {
    connectWebSocket()

    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connectWebSocket, sessionId])

  // ────────────────────────────────────────────────────────────────
  // SEND FRAMES AT ~10 FPS
  // ────────────────────────────────────────────────────────────────
  const sendFrame = useCallback(() => {
    const video = videoRef.current
    const ws = wsRef.current
    
    if (!video || !ws || ws.readyState !== WebSocket.OPEN) return
    if (video.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA) return
    if (awaitingInferenceRef.current) return

    try {
      const canvas = captureCanvasRef.current ?? document.createElement('canvas')
      captureCanvasRef.current = canvas
      canvas.width = 320
      canvas.height = 240
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      ctx.drawImage(video, 0, 0, 320, 240)
      const base64 = canvas.toDataURL('image/jpeg', 0.5)
      awaitingInferenceRef.current = true
      ws.send(JSON.stringify({
        payload: base64,
        session_id: sessionId,
        exercise_name: exercise.name,
        primary_joint: exercise.primary_joints[0] ?? '',
        target_rom_min: exercise.target_rom_min,
        target_rom_max: exercise.target_rom_max,
        target_reps: exercise.default_reps,
        lang: 'en'
      }))
    } catch (error) {
      awaitingInferenceRef.current = false
      console.error('Frame send error:', error)
    }
  }, [exercise.default_reps, exercise.name, exercise.primary_joints, exercise.target_rom_max, exercise.target_rom_min, sessionId])

  useEffect(() => {
    if (!cameraActive || !wsConnected) return
    
    // Send frame every 100ms (~10 FPS)
    const frameInterval = setInterval(sendFrame, 100)
    return () => clearInterval(frameInterval)
  }, [cameraActive, wsConnected, sendFrame])

  // ────────────────────────────────────────────────────────────────
  // DRAW SKELETON ON CANVAS
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(draw)
        return
      }

      // Setup canvas dimensions
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      // Mirror video (flip horizontally)
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      ctx.restore()

      // Draw skeleton landmarks
      const lms = result?.landmarks_px
      if (lms && lms.length > 0) {
        const W = canvas.width
        const H = canvas.height
        const feedbackStatus = result?.feedback?.status || 'correct'
        const skeletonColor = FEEDBACK_COLORS[feedbackStatus] || '#00E5A0'

        // Draw connections (bones)
        ctx.lineWidth = 3
        ctx.strokeStyle = skeletonColor + 'CC'
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        POSE_CONNECTIONS.forEach(([a, b]) => {
          const lmA = lms[a]
          const lmB = lms[b]
          if (!lmA || !lmB) return
          
          const visibilityA = lmA.visibility ?? 0
          const visibilityB = lmB.visibility ?? 0
          if (visibilityA < 0.4 || visibilityB < 0.4) return
          
          // Mirror x coordinates (1 - x) to match flipped video
          ctx.beginPath()
          ctx.moveTo((1 - lmA.x) * W, lmA.y * H)
          ctx.lineTo((1 - lmB.x) * W, lmB.y * H)
          ctx.stroke()
        })

        // Draw landmark dots
        lms.forEach((lm) => {
          if ((lm.visibility ?? 0) < 0.4) return
          
          ctx.beginPath()
          ctx.arc((1 - lm.x) * W, lm.y * H, 5, 0, Math.PI * 2)
          ctx.fillStyle = skeletonColor
          ctx.fill()
          ctx.strokeStyle = '#000000AA'
          ctx.lineWidth = 1
          ctx.stroke()
        })
      }

      // Draw HUD metrics
      if (wsConnected) {
        const metrics = result?.metrics
        const latency = latencyMs
        
        // Latency indicator
        const latencyColor = latency < 100 ? '#00E5A0AA' : latency < 150 ? '#FFD600AA' : '#FF4444AA'
        ctx.fillStyle = latencyColor
        ctx.font = 'bold 14px monospace'
        ctx.fillText(`${latency}ms`, (canvas.width || 640) - 70, 24)
        
        // Frame counter
        ctx.fillStyle = '#FFFFFF88'
        ctx.font = '12px monospace'
        if (metrics?.frame_num) {
          ctx.fillText(`Frame: ${metrics.frame_num}`, 10, 24)
        }
        
        // FPS indicator
        if (frameRate > 0) {
          ctx.fillStyle = frameRate >= 8 ? '#00E5A0AA' : '#FFD600AA'
          ctx.font = 'bold 12px monospace'
          ctx.fillText(`${frameRate.toFixed(1)} FPS`, (canvas.width || 640) - 70, 45)
        }
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [result, wsConnected, latencyMs, frameRate])

  // ────────────────────────────────────────────────────────────────
  // RENDER ERROR STATE
  // ────────────────────────────────────────────────────────────────
  if (cameraError) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center gap-4 h-[400px]">
        <CameraOff className="w-16 h-16 text-red-400" />
        <h3 className="text-lg font-semibold text-text-primary">Camera Access Required</h3>
        <p className="text-text-muted text-center max-w-md text-sm">{cameraError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent text-black font-semibold rounded-lg hover:opacity-90 transition"
        >
          Try Again
        </button>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────
  // RENDER MAIN COMPONENT
  // ────────────────────────────────────────────────────────────────
  const feedbackColor = result?.feedback?.color ?? '#00E5A0'
  const borderColorMap: Record<string, string> = {
    '#00E5A0': '#00E5A0',
    '#FFD600': '#FFD600',
    '#FF4444': '#FF4444',
    'green': '#00E5A0',
    'yellow': '#FFD600',
    'red': '#FF4444'
  }
  const borderColor = borderColorMap[feedbackColor] || '#00E5A0'

  const isWristExercise =
    exercise.primary_joints.some((joint) => joint.toLowerCase().includes('wrist')) ||
    exerciseName.toLowerCase().includes('wrist')

  let wristCalibrationHint: string | null = null
  if (isWristExercise) {
    if (!wsConnected) {
      wristCalibrationHint = 'Connecting to AI... hold your forearm in frame.'
    } else if (!result?.landmarks_px?.length) {
      wristCalibrationHint = 'Move closer and show shoulder-to-hand so wrist can calibrate.'
    } else {
      const lms = result.landmarks_px
      const leftWristVis = lms[15]?.visibility ?? 0
      const rightWristVis = lms[16]?.visibility ?? 0
      const leftElbowVis = lms[13]?.visibility ?? 0
      const rightElbowVis = lms[14]?.visibility ?? 0

      const wristVis = Math.max(leftWristVis, rightWristVis)
      const elbowVis = Math.max(leftElbowVis, rightElbowVis)

      if (wristVis < 0.45 || elbowVis < 0.45) {
        wristCalibrationHint = 'Keep elbow and wrist visible, palm facing camera.'
      } else if ((result.metrics?.latency_ms ?? 0) > 180) {
        wristCalibrationHint = 'Move slower: bend wrist, pause briefly, then return.'
      } else {
        wristCalibrationHint = 'Calibration OK: flex wrist forward and return to neutral.'
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* WebSocket Error Alert */}
      {wsError && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">{wsError}</p>
          </div>
        </div>
      )}

      {/* Main Camera Feed */}
      <div
        className="relative rounded-xl overflow-hidden bg-black"
        style={{
          border: `2px solid ${borderColor}55`,
          transition: 'border-color 0.3s ease'
        }}
      >
        {/* Hidden video element (used as drawing source) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute opacity-0 w-0 h-0"
        />

        {/* Canvas for skeleton visualization */}
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ maxHeight: '400px', display: 'block' }}
        />

        {/* Status Badges */}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          {/* Camera Status */}
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
              cameraActive
                ? 'bg-black/60 text-[#00E5A0]'
                : 'bg-black/60 text-orange-400'
            }`}
          >
            {cameraActive ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
            {cameraActive ? 'LIVE' : 'OFFLINE'}
          </span>

          {/* WebSocket Status */}
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
              wsConnected
                ? 'bg-black/60 text-[#00E5A0]'
                : 'bg-black/60 text-yellow-400'
            }`}
          >
            {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {wsConnected ? 'AI Connected' : reconnectAttempts > 0 ? `Reconnecting (${reconnectAttempts}/5)...` : 'Connecting...'}
          </span>
        </div>

        {/* Exercise Name Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-sm">
            {exerciseName}
          </span>
        </div>

        {/* Wrist Calibration Hint */}
        {isWristExercise && wristCalibrationHint && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-black/70 text-cyan-200 backdrop-blur-sm border border-cyan-300/30 whitespace-nowrap">
              {wristCalibrationHint}
            </span>
          </div>
        )}

        {/* Feedback Message */}
        {result?.feedback && (
          <div
            className="absolute bottom-0 left-0 right-0 px-4 py-2.5 text-center text-sm font-bold backdrop-blur-sm"
            style={{
              background: `${borderColor}22`,
              color: borderColor,
              borderTop: `1px solid ${borderColor}44`
            }}
          >
            {result.feedback.message}
          </div>
        )}

        {/* "Pose Not Detected" Hint */}
        {wsConnected && result && !result.landmarks_px?.length && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-black/70 text-white/60 text-xs px-3 py-1.5 rounded-full">
              Move into frame to detect pose...
            </span>
          </div>
        )}
      </div>

      {/* Live Metrics Panel */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Exercise Detection */}
          <div className="glass-card p-3 text-center">
            <Activity className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-xs text-text-muted">Exercise</p>
            <p className="text-sm font-bold text-text-primary truncate">{result.exercise || '—'}</p>
            {result.confidence !== undefined && (
              <p className="text-[10px] text-text-muted">{(result.confidence * 100).toFixed(0)}% conf</p>
            )}
          </div>

          {/* Fatigue Score */}
          <div className="glass-card p-3 text-center">
            <Zap className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
            <p className="text-xs text-text-muted">Fatigue</p>
            <p className="text-sm font-bold text-text-primary">
              {result.digital_twin?.fatigue_score?.toFixed(0) ?? '—'}
            </p>
            <p className="text-[10px] text-text-muted">/ 100</p>
          </div>

          {/* Cognitive Engagement */}
          <div className="glass-card p-3 text-center">
            <Brain className="w-4 h-4 text-purple-500 mx-auto mb-1" />
            <p className="text-xs text-text-muted">Cognitive</p>
            <p className="text-sm font-bold text-text-primary">
              {result.cognitive_engagement?.cognitive_lstm?.score?.toFixed(0) ?? '—'}
            </p>
            <p className="text-[10px] text-text-muted">
              {result.cognitive_engagement?.cognitive_lstm?.trend ?? ''}
            </p>
          </div>

          {/* Form Correctness */}
          <div className="glass-card p-3 text-center">
            <Heart className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <p className="text-xs text-text-muted">Form</p>
            <p
              className={`text-sm font-bold ${
                result.form?.is_correct ? 'text-[#00E5A0]' : 'text-red-400'
              }`}
            >
              {result.form?.is_correct ? '✓ Good' : '✗ Fix'}
            </p>
            <p className="text-[10px] text-text-muted">
              ROM: {result.digital_twin?.predicted_rom?.toFixed(0) ?? '—'}°
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
