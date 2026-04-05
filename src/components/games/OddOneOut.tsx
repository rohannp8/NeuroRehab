import { useState } from 'react'

function randomInt(max: number): number {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % max
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const SYMBOLS = ['🔷', '🔶', '🔺', '🟢', '🟪', '🔵']

export default function OddOneOut({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [round, setRound] = useState(0)
  const [items, setItems] = useState<string[]>([])
  const [targetIdx, setTargetIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const startRound = (currentRound: number, currentScore: number) => {
    if (currentRound > 5) {
      onComplete(currentScore * 20, (currentScore / 5) * 100)
      return
    }

    // Pick a base and an odd one
    const shuffled = shuffleArray(SYMBOLS)
    const base = shuffled[0]
    const odd = shuffled[1]

    // Create 9 items
    const grid = Array(9).fill(base)
    const oddIdx = randomInt(9)
    grid[oddIdx] = odd

    setItems(grid)
    setTargetIdx(oddIdx)
    setRound(currentRound)
  }

  const handleChoice = (idx: number) => {
    if (selectedIdx !== null) return
    setSelectedIdx(idx)

    let newScore = correctCount
    if (idx === targetIdx) {
      newScore += 1
    }
    setCorrectCount(newScore)
    window.setTimeout(() => {
      setSelectedIdx(null)
      startRound(round + 1, newScore)
    }, 280)
  }

  if (round === 0) {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Find and click the shape that is different from the rest.</p>
        <button onClick={() => { setCorrectCount(0); startRound(1, 0) }} className="btn-primary">Start Game</button>
      </div>
    )
  }

  return (
    <div className="py-6 flex flex-col items-center">
      <div className="mb-8 text-sm font-bold text-accent uppercase tracking-widest text-center">Round {round} / 5</div>
      
      <div className="grid grid-cols-3 gap-2 w-64 h-64">
        {items.map((item, i) => (
          <button 
            key={i}
            onClick={() => handleChoice(i)}
            disabled={selectedIdx !== null}
            className={`text-4xl flex items-center justify-center rounded-xl transition-colors border-2 ${
              selectedIdx === i
                ? i === targetIdx
                  ? 'bg-success/10 border-success'
                  : 'bg-danger/10 border-danger'
                : selectedIdx !== null && i === targetIdx
                  ? 'bg-success/10 border-success'
                  : 'bg-card border-border hover:bg-page'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}
