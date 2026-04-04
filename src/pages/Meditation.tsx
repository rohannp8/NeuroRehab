import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Leaf, Play, Pause, RotateCcw, Volume2, VolumeX,
  CloudRain, Waves, Wind, Music, Bird, Moon, Upload,
} from 'lucide-react'

interface SoundOption {
  id: string
  name: string
  icon: typeof Waves
  color: string
  bgColor: string
  // We'll use Web Audio API to generate ambient tones
  frequency: number
  type: OscillatorType
}

const sounds: SoundOption[] = [
  { id: 'white', name: 'White Noise', icon: Wind, color: 'text-text-muted', bgColor: 'bg-gray-50', frequency: 0, type: 'sawtooth' },
  { id: 'rain', name: 'Gentle Rain', icon: CloudRain, color: 'text-info', bgColor: 'bg-pastel-sky', frequency: 220, type: 'sine' },
  { id: 'ocean', name: 'Ocean Waves', icon: Waves, color: 'text-info-dark', bgColor: 'bg-blue-50', frequency: 174, type: 'sine' },
  { id: 'forest', name: 'Forest Birds', icon: Bird, color: 'text-success', bgColor: 'bg-pastel-mint', frequency: 396, type: 'sine' },
  { id: 'ambient', name: 'Ambient Hum', icon: Music, color: 'text-purple-500', bgColor: 'bg-pastel-lilac', frequency: 432, type: 'sine' },
  { id: 'night', name: 'Night Calm', icon: Moon, color: 'text-indigo-500', bgColor: 'bg-indigo-50', frequency: 285, type: 'sine' },
]

const durations = [
  { mins: 5, label: '5 min' },
  { mins: 10, label: '10 min' },
  { mins: 15, label: '15 min' },
  { mins: 20, label: '20 min' },
]

export default function Meditation() {
  const [selectedSound, setSelectedSound] = useState<SoundOption>(sounds[0])
  const [selectedDuration, setSelectedDuration] = useState(10)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeLeft, setTimeLeft] = useState(10 * 60)
  const [isMuted, setIsMuted] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const totalSeconds = selectedDuration * 60

  // Generate white noise buffer
  const createWhiteNoise = useCallback((ctx: AudioContext) => {
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    return source
  }, [])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const customAudioRef = useRef<HTMLAudioElement | null>(null)

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (customAudioRef.current) {
      customAudioRef.current.pause()
      customAudioRef.current.src = url
    } else {
      const audio = new Audio(url)
      audio.loop = true
      customAudioRef.current = audio
    }
    const customSound: SoundOption = { id: 'custom', name: file.name.slice(0, 15) + '...', icon: Music, color: 'text-accent', bgColor: 'bg-page', frequency: 0, type: 'sine' }
    if (isPlaying) {
      stopAudio()
      setSelectedSound(customSound)
      setTimeout(() => startAudio(customSound), 100)
    } else {
      setSelectedSound(customSound)
    }
  }

  const startAudio = useCallback((soundToPlay = selectedSound) => {
    if (soundToPlay.id === 'custom' && customAudioRef.current) {
      customAudioRef.current.volume = isMuted ? 0 : 0.5
      customAudioRef.current.play()
      return
    }

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const gain = ctx.createGain()
    gain.gain.value = 0.15
    gainRef.current = gain

    let source: AudioBufferSourceNode | OscillatorNode

    if (soundToPlay.id === 'white') {
      source = createWhiteNoise(ctx)
    } else {
      const osc = ctx.createOscillator()
      osc.type = soundToPlay.type
      osc.frequency.setValueAtTime(soundToPlay.frequency, ctx.currentTime)
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.2
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 5
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()
      source = osc
    }

    source.connect(gain)
    gain.connect(ctx.destination)
    source.start()
    sourceRef.current = source
  }, [selectedSound, createWhiteNoise, isMuted])

  const stopAudio = useCallback(() => {
    if (customAudioRef.current) {
      customAudioRef.current.pause()
      customAudioRef.current.currentTime = 0
    }
    try {
      sourceRef.current?.stop()
    } catch { /* already stopped */ }
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    sourceRef.current = null
  }, [])

  // Timer countdown
  useEffect(() => {
    if (!isPlaying) return
    if (timeLeft <= 0) {
      setIsPlaying(false)
      setSessionComplete(true)
      stopAudio()
      return
    }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [isPlaying, timeLeft, stopAudio])

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false)
      stopAudio()
    } else {
      if (sessionComplete) {
        setTimeLeft(selectedDuration * 60)
        setSessionComplete(false)
      }
      setIsPlaying(true)
      startAudio()
    }
  }

  const reset = () => {
    setIsPlaying(false)
    stopAudio()
    setTimeLeft(selectedDuration * 60)
    setSessionComplete(false)
  }

  const toggleMute = () => {
    if (gainRef.current) {
      gainRef.current.gain.value = isMuted ? 0.15 : 0
    }
    if (customAudioRef.current) {
      customAudioRef.current.volume = isMuted ? 0.5 : 0
    }
    setIsMuted(!isMuted)
  }

  const handleDurationChange = (mins: number) => {
    if (isPlaying) return
    setSelectedDuration(mins)
    setTimeLeft(mins * 60)
  }

  const handleSoundChange = (sound: SoundOption) => {
    if (isPlaying) {
      stopAudio()
      setSelectedSound(sound)
      setTimeout(() => startAudio(sound), 100)
    } else {
      setSelectedSound(sound)
    }
  }

  // Cleanup
  useEffect(() => () => stopAudio(), [stopAudio])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Leaf className="w-7 h-7 text-success" />
          Meditation & Relaxation
        </h1>
        <p className="text-text-muted mt-1 text-sm">Find your calm with guided soundscapes</p>
      </div>

      {/* Timer Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border shadow-card rounded-3xl p-8 lg:p-12 text-center relative overflow-hidden"
      >
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-success/10 animate-breathe" />
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-info/10 animate-breathe" style={{ animationDelay: '2s' }} />

        <div className="relative z-10">
          {/* Circular progress */}
          <div className="relative w-56 h-56 mx-auto mb-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="#E0F2E9" strokeWidth="6" />
              <circle
                cx="100" cy="100" r="90" fill="none"
                stroke="#34C759" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-text-primary font-mono">{formatTime(timeLeft)}</span>
              <span className="text-sm text-text-muted mt-1">
                {isPlaying ? 'Breathing...' : sessionComplete ? 'Session Complete 🎉' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={reset} className="p-3 rounded-full bg-white/60 text-text-muted hover:bg-white transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-success text-white flex items-center justify-center shadow-lg hover:bg-success-dark transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
            </button>
            <button onClick={toggleMute} className="p-3 rounded-full bg-white/60 text-text-muted hover:bg-white transition-colors">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Duration selector */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Duration</h3>
        <div className="flex gap-3">
          {durations.map((d) => (
            <button
              key={d.mins}
              onClick={() => handleDurationChange(d.mins)}
              disabled={isPlaying}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedDuration === d.mins
                  ? 'bg-success text-white shadow-sm'
                  : 'bg-white border border-border text-text-secondary hover:border-success/30 disabled:opacity-50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sound options */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Soundscape</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sounds.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => handleSoundChange(s)}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all hover:-translate-y-1 ${
                  selectedSound.id === s.id
                    ? `bg-page border-success shadow-soft`
                    : 'bg-card border-border hover:border-success/50 hover:shadow-soft'
                }`}
              >
                <div className={`p-2 rounded-xl ${s.bgColor}`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <span className="text-sm font-medium text-text-primary">{s.name}</span>
              </button>
            )
          })}
          
          {/* Custom Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all hover:-translate-y-1 ${
              selectedSound.id === 'custom'
                ? `bg-page border-accent shadow-soft`
                : 'bg-card border-border border-dashed hover:border-accent hover:shadow-soft'
            }`}
          >
            <div className="p-2 rounded-xl bg-page">
              <Upload className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm font-medium text-text-primary">
               {selectedSound.id === 'custom' ? selectedSound.name : 'Upload Sound'}
            </span>
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleCustomAudioUpload}
            />
          </button>
        </div>
      </div>

      {/* Completion modal */}
      <AnimatePresence>
        {sessionComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={reset}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-card space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-success-light flex items-center justify-center mx-auto">
                <Leaf className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary">Session Complete!</h2>
              <p className="text-text-muted">You meditated for {selectedDuration} minutes. Great job taking care of your mind! 🧘</p>
              <div className="p-4 rounded-2xl bg-success-light">
                <p className="text-success-dark font-bold text-lg">+{selectedDuration * 5} XP earned! 🎉</p>
              </div>
              <button onClick={reset} className="btn-primary w-full">Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
