import { useState } from 'react'

function randomInt(max: number): number {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % max
}

function randomChance(): number {
  return randomInt(1000) / 1000
}

const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'GREEN', hex: '#22c55e' },
  { name: 'YELLOW', hex: '#eab308' }
]

export default function ColorStroop({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [round, setRound] = useState(0)
  const [word, setWord] = useState(COLORS[0])
  const [color, setColor] = useState(COLORS[1])
  const [correctCount, setCorrectCount] = useState(0)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  const startRound = (currentRound: number, currentScore: number) => {
    if (currentRound > 5) {
      onComplete(currentScore * 20, (currentScore / 5) * 100)
      return
    }
    
    // Pick random word and random color (often mismatched)
    const newWord = COLORS[randomInt(COLORS.length)]
    let newColor = COLORS[randomInt(COLORS.length)]
    // 70% chance they are different
    if (randomChance() > 0.3) {
      while(newColor.name === newWord.name) {
        newColor = COLORS[randomInt(COLORS.length)]
      }
    }
    
    setWord(newWord)
    setColor(newColor)
    setRound(currentRound)
  }

  const handleChoice = (chosenColorName: string) => {
    if (selectedColor) return
    setSelectedColor(chosenColorName)

    let newScore = correctCount
    const isCorrect = chosenColorName === color.name
    if (isCorrect) {
      newScore += 1
    }
    setCorrectCount(newScore)
    window.setTimeout(() => {
      setSelectedColor(null)
      startRound(round + 1, newScore)
    }, 280)
  }

  if (round === 0) {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Click on the physical <b className="text-accent underline">INK COLOR</b> of the word, NOT what the word spells.</p>
        <button onClick={() => { setCorrectCount(0); startRound(1, 0) }} className="btn-primary">Start Game</button>
      </div>
    )
  }

  return (
    <div className="py-6 flex flex-col items-center">
      <div className="mb-8 text-sm font-bold text-accent uppercase tracking-widest text-center">Round {round} / 5</div>
      
      <div className="flex items-center justify-center h-32 mb-8">
        <span className="text-6xl font-black tracking-widest" style={{ color: color.hex }}>
          {word.name}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {COLORS.map(c => (
          <button 
            key={c.name}
            onClick={() => handleChoice(c.name)}
            disabled={Boolean(selectedColor)}
            className={`py-4 rounded-xl border-2 font-bold transition-colors ${
              selectedColor === c.name
                ? c.name === color.name
                  ? 'bg-success/10 border-success text-success-dark'
                  : 'bg-danger/10 border-danger text-danger-dark'
                : selectedColor !== null && c.name === color.name
                  ? 'bg-success/10 border-success text-success-dark'
                  : 'bg-card border-border text-text-primary hover:bg-page'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}
