import { useState } from 'react'

const SHAPES = ['⭐', '🌟', '🌙', '☀️', '☁️', '❄️', '🔥', '💧']

export default function ShapeMatch({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [round, setRound] = useState(0)
  const [target, setTarget] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const startRound = (currentRound: number, currentScore: number) => {
    if (currentRound > 5) {
      onComplete(currentScore * 20, (currentScore / 5) * 100)
      return
    }

    const shuffled = [...SHAPES].sort(() => 0.5 - Math.random())
    const t = shuffled[0]
    setTarget(t)
    
    // Pick 3 distractors + target
    const opts = [t, shuffled[1], shuffled[2], shuffled[3]].sort(() => 0.5 - Math.random())
    setOptions(opts)
    
    setRound(currentRound)
  }

  const handleChoice = (c: string) => {
    if (selectedOption) return
    setSelectedOption(c)

    let newScore = correctCount
    if (c === target) {
      newScore += 1
    }
    setCorrectCount(newScore)
    window.setTimeout(() => {
      setSelectedOption(null)
      startRound(round + 1, newScore)
    }, 280)
  }

  if (round === 0) {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Match the exact shape shown in the center.</p>
        <button onClick={() => { setCorrectCount(0); startRound(1, 0) }} className="btn-primary">Start Game</button>
      </div>
    )
  }

  return (
    <div className="py-6 flex flex-col items-center">
      <div className="mb-8 text-sm font-bold text-accent uppercase tracking-widest text-center">Round {round} / 5</div>
      
      <div className="flex items-center justify-center w-32 h-32 mb-8 bg-page rounded-full border border-border shadow-sm">
        <span className="text-6xl">{target}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {options.map((opt, i) => (
          <button 
            key={i}
            onClick={() => handleChoice(opt)}
            disabled={Boolean(selectedOption)}
            className={`h-20 text-4xl flex items-center justify-center rounded-xl border-2 transition-colors ${
              selectedOption === opt
                ? opt === target
                  ? 'bg-success/10 border-success'
                  : 'bg-danger/10 border-danger'
                : selectedOption !== null && opt === target
                  ? 'bg-success/10 border-success'
                  : 'bg-card border-border hover:bg-page'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
