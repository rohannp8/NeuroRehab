import { useState, useEffect } from 'react'

export default function NumberSpan({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [phase, setPhase] = useState<'intro' | 'show' | 'input'>('intro')
  const [sequence, setSequence] = useState<number[]>([])
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [userInput, setUserInput] = useState('')
  const [round, setRound] = useState(1)

  const startRound = () => {
    // Generate 4 to 6 digit sequence based on round
    const length = 3 + round
    const seq = Array.from({ length }, () => Math.floor(Math.random() * 10))
    setSequence(seq)
    setPhase('show')
    setCurrentIdx(0)
    setUserInput('')
  }

  useEffect(() => {
    if (phase !== 'show' || currentIdx < 0) return

    const timer = setTimeout(() => {
      if (currentIdx >= sequence.length - 1) {
        setPhase('input')
      } else {
        setCurrentIdx(c => c + 1)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [phase, currentIdx, sequence.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const correctStr = sequence.join('')
    if (userInput === correctStr) {
      if (round === 3) {
        onComplete(100, 100)
      } else {
        setRound(r => r + 1)
        setTimeout(startRound, 500)
      }
    } else {
      onComplete(round * 25, 50)
    }
  }

  if (phase === 'intro') {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Remember the sequence of numbers as they appear, then type them out.</p>
        <button onClick={startRound} className="btn-primary">Start Game</button>
      </div>
    )
  }

  return (
    <div className="py-6 flex flex-col items-center">
      <div className="mb-8 text-sm font-bold text-accent uppercase tracking-widest text-center">Round {round} / 3</div>
      
      {phase === 'show' ? (
        <div className="h-32 flex items-center justify-center">
          <span className="text-6xl font-bold text-accent">
            {currentIdx < sequence.length ? sequence[currentIdx] : ''}
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <p className="mb-4 text-text-primary">Enter the sequence:</p>
          <input
            type="number"
            autoFocus
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            className="px-6 py-4 rounded-xl border border-border bg-page text-center text-3xl font-bold tracking-widest outline-none focus:border-accent w-64 mb-6"
          />
          <button type="submit" className="btn-primary w-full">Submit</button>
        </form>
      )}
    </div>
  )
}
