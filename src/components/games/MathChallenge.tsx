import { useState } from 'react'

function randomInt(max: number): number {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % max
}

function randomChance(): number {
  return randomInt(1000) / 1000
}

export default function MathChallenge({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [round, setRound] = useState(0)
  const [equation, setEquation] = useState('')
  const [answer, setAnswer] = useState(0)
  const [choices, setChoices] = useState<number[]>([])
  const [correctCount, setCorrectCount] = useState(0)

  const startRound = (currentRound: number, currentScore: number) => {
    if (currentRound > 5) {
      onComplete(currentScore * 20, (currentScore / 5) * 100)
      return
    }

    const a = randomInt(20) + 1
    const b = randomInt(20) + 1
    const op = randomChance() > 0.5 ? '+' : '-'
    
    let ans = a + b
    let eq = `${a} + ${b} = ?`
    if (op === '-') {
      // Ensure positive result for simplicity
      if (a < b) {
        ans = b - a
        eq = `${b} - ${a} = ?`
      } else {
        ans = a - b
        eq = `${a} - ${b} = ?`
      }
    }

    // Generate distractors
    const opts = [ans]
    while(opts.length < 4) {
      const dist = ans + (randomInt(10) - 5)
      if (dist >= 0 && !opts.includes(dist)) opts.push(dist)
    }

    setEquation(eq)
    setAnswer(ans)
    setChoices(opts.sort(() => 0.5 - Math.random()))
    setRound(currentRound)
  }

  const handleChoice = (val: number) => {
    let newScore = correctCount
    if (val === answer) {
      newScore += 1
    }
    setCorrectCount(newScore)
    startRound(round + 1, newScore)
  }

  if (round === 0) {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Solve the math equations as quickly as you can.</p>
        <button onClick={() => { setCorrectCount(0); startRound(1, 0) }} className="btn-primary">Start Game</button>
      </div>
    )
  }

  return (
    <div className="py-6 flex flex-col items-center">
      <div className="mb-8 text-sm font-bold text-accent uppercase tracking-widest text-center">Round {round} / 5</div>
      
      <div className="flex items-center justify-center h-32 mb-8 bg-page px-12 rounded-2xl border border-border">
        <span className="text-5xl font-black text-text-primary tracking-widest">{equation}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {choices.map((c, i) => (
          <button 
            key={i}
            onClick={() => handleChoice(c)}
            className="py-4 rounded-xl border border-border bg-card text-text-primary font-bold text-2xl hover:bg-page transition-colors"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
