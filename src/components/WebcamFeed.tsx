import { useRef, useEffect, useState, useCallback } from 'react'
import type { PoseFrame } from '../types'
import { Camera, CameraOff, Wifi, WifiOff } from 'lucide-react'

interface WebcamFeedProps {
  sessionId: string
  exerciseName: string
  onPoseFrame?: (frame: PoseFrame) => void
  onRepCounted?: (count: number) => void
  onFeedback?: (message: string) => void
}

export default function WebcamFeed({
  sessionId,
  exerciseName,
  onPoseFrame,
  onRepCounted,
  onFeedback,
}: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [currentFrame, setCurrentFrame] = useState<PoseFrame | null>(null)

  // Start camera
  useEffect(() => {
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraActive(true)
        }
      } catch (err) {
        console.error('Camera error:', err)
        setCameraError(
          'Camera access denied. Please allow camera access in your browser settings to use pose tracking.'
        )
      }
    }

    startCamera()

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // WebSocket connection
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'pose_frame':
            setCurrentFrame(msg.data)
            onPoseFrame?.(msg.data)
            break
          case 'feedback':
            onFeedback?.(msg.data.message)
            break
          case 'rep_counted':
            onRepCounted?.(msg.data.count)
            break
        }
      } catch (e) {
        console.error('WS message parse error:', e)
      }
    }

    return () => {
      ws.close()
    }
  }, [sessionId, onPoseFrame, onRepCounted, onFeedback])

  // Send frames to backend
  const sendFrame = useCallback(() => {
    if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(videoRef.current, 0, 0, 640, 480)
    const base64 = canvas.toDataURL('image/jpeg', 0.7).replace('data:image/jpeg;base64,', '')
    wsRef.current.send(JSON.stringify({ type: 'frame', data: { image: base64 } }))
  }, [])

  useEffect(() => {
    if (!cameraActive) return
    const interval = setInterval(sendFrame, 33)
    return () => clearInterval(interval)
  }, [cameraActive, sendFrame])

  // Draw skeleton overlay
  useEffect(() => {
    if (!currentFrame?.landmarks || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 640, 480)

    // Draw landmarks
    currentFrame.landmarks.forEach((lm) => {
      if (lm.visibility < 0.5) return
      ctx.beginPath()
      ctx.arc(lm.x * 640, lm.y * 480, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#00E5A0'
      ctx.fill()
    })

    // Draw joint angles with colors
    currentFrame.joint_angles?.forEach((ja) => {
      const colorMap = { green: '#00C853', yellow: '#FFD600', red: '#D50000' }
      ctx.fillStyle = colorMap[ja.color]
      ctx.font = '12px DM Sans'
      ctx.fillText(`${ja.joint}: ${Math.round(ja.angle)}°`, 10, 20)
    })
  }, [currentFrame])

  if (cameraError) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center gap-4 h-[480px]">
        <CameraOff className="w-16 h-16 text-text-dim" />
        <h3 className="text-lg font-semibold text-text-primary">Camera Access Required</h3>
        <p className="text-text-muted text-center max-w-md">{cameraError}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-dark-card border border-dark-border">
      {/* Status indicators */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
          cameraActive ? 'bg-accent/20 text-accent' : 'bg-danger/20 text-danger'
        }`}>
          {cameraActive ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
          {cameraActive ? 'LIVE' : 'OFF'}
        </span>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
          wsConnected ? 'bg-accent/20 text-accent' : 'bg-warn/20 text-warn'
        }`}>
          {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {wsConnected ? 'Connected' : 'Offline'}
        </span>
      </div>

      {/* Exercise name overlay */}
      <div className="absolute top-3 right-3 z-10">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-dark-page/80 text-text-primary backdrop-blur-sm">
          {exerciseName}
        </span>
      </div>

      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-auto"
        style={{ maxHeight: '480px' }}
      />

      {/* Skeleton overlay canvas */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Rendered frame overlay (if backend sends pre-rendered) */}
      {currentFrame?.rendered_frame && (
        <img
          src={`data:image/jpeg;base64,${currentFrame.rendered_frame}`}
          alt="Pose overlay"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}
    </div>
  )
}
