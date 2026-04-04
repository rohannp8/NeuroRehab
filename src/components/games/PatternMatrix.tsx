import { useState } from 'react'

export default function PatternMatrix({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [round, setRound] = useState(0)

  // Simple hardcoded rounds for Pattern Matrix
  const rounds = [
    { seq: ['⬜', '⬛', '⬜', '⬛'], answer: '⬜', choices: ['⬜', '⬛', '🔴', '🔵'] },
    { seq: ['🔴', '🔴', '🔵', '🔴', '🔴'], answer: '🔵', choices: ['🔴', '🔵', '⬛', '⬜'] },
    { seq: ['🔼', '🔽', '🔼', '🔽'], answer: '🔼', choices: ['🔼', '🔽', '◀️', '▶️'] },
  ]

  const startGame = () => setRound(1)

  const handleChoice = (choice: string) => {
    if (choice === rounds[round - 1].answer) {
      if (round === rounds.length) {
        onComplete(100, 100)
      } else {
        setRound(r => r + 1)
      }
    } else {
      onComplete(round * 20, 50)
    }
  }

  if (round === 0) {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Identify the pattern and select the correct missing shape.</p>
        <button onClick={startGame} className="btn-primary">Start Game</button>
      </div>
    )
  }

  const currentPattern = rounds[round - 1]

  return (
    <div className="py-6 flex flex-col items-center">
      <div className="mb-8 text-sm font-bold text-accent uppercase tracking-widest text-center">Round {round} / {rounds.length}</div>
      
      <div className="flex gap-4 mb-12 items-center p-6 bg-page rounded-2xl border border-border">
        {currentPattern.seq.map((item, idx) => (
          <span key={idx} className="text-4xl">{item}</span>
        ))}
        <span className="text-4xl text-text-muted border-b-2 border-dashed border-text-muted pb-1 px-2">?</span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {currentPattern.choices.map((c, i) => (
          <button key={i} onClick={() => handleChoice(c)} className="w-16 h-16 text-3xl bg-card border border-border rounded-xl hover:bg-page transition-colors">
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
