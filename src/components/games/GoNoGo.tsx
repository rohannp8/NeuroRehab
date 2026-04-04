import { useState, useRef } from 'react'

function randomInt(max: number): number {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % max
}

function randomChance(): number {
  return randomInt(1000) / 1000
}

export default function GoNoGo({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [color, setColor] = useState<'red' | 'green' | 'none'>('none')
  const [score, setScore] = useState(0)
  const [trials, setTrials] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startGame = () => {
    setIsPlaying(true)
    setScore(0)
    setTrials(0)
    nextTrial(0)
  }

  const nextTrial = (currentTrials: number) => {
    if (currentTrials >= 10) {
      setIsPlaying(false)
      onComplete(score * 10, currentTrials > 0 ? (score / currentTrials) * 100 : 0)
      return
    }

    setColor('none')
    const delay = randomInt(1000) + 500
    timerRef.current = setTimeout(() => {
      setColor(randomChance() > 0.3 ? 'green' : 'red')
      setTrials(t => t + 1)
      
      timerRef.current = setTimeout(() => {
        nextTrial(currentTrials + 1)
      }, 1000)
    }, delay)
  }

  const handleClick = () => {
    if (color === 'green') {
      setScore(s => s + 1)
      if (timerRef.current) clearTimeout(timerRef.current)
      nextTrial(trials)
    } else if (color === 'red') {
      if (timerRef.current) clearTimeout(timerRef.current)
      nextTrial(trials)
    }
  }

  if (!isPlaying) {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Click anywhere when you see the <b className="text-success">GREEN</b> circle. DO NOT click when it is <b className="text-danger">RED</b>.</p>
        <button onClick={startGame} className="btn-primary">Start Game</button>
      </div>
    )
  }

  return (
    <div className="py-12 flex flex-col items-center justify-center cursor-pointer select-none" onClick={handleClick}>
      <div className="mb-8 text-sm font-bold text-accent uppercase tracking-widest text-center">Trial {trials} / 10</div>
      
      <div className={`w-32 h-32 rounded-full transition-colors duration-100 ${
        color === 'green' ? 'bg-success shadow-glow' : color === 'red' ? 'bg-danger' : 'bg-page'
      }`} />
      
      <p className="mt-8 text-text-muted text-sm">Click to react!</p>
    </div>
  )
}
