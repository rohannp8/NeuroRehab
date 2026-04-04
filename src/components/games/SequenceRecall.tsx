import { useState, useEffect } from 'react'

export default function SequenceRecall({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [sequence, setSequence] = useState<number[]>([])
  const [userSequence, setUserSequence] = useState<number[]>([])
  const [isPlayingSequence, setIsPlayingSequence] = useState(false)
  const [activeCell, setActiveCell] = useState<number | null>(null)
  const [round, setRound] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  const startGame = () => {
    setSequence([Math.floor(Math.random() * 9)])
    setUserSequence([])
    setRound(1)
    setGameOver(false)
  }

  useEffect(() => {
    if (round > 0 && !gameOver) {
      playSequence()
    }
  }, [round])

  const playSequence = async () => {
    setIsPlayingSequence(true)
    for (let i = 0; i < sequence.length; i++) {
      await new Promise(r => setTimeout(r, 400))
      setActiveCell(sequence[i])
      await new Promise(r => setTimeout(r, 600))
      setActiveCell(null)
    }
    setIsPlayingSequence(false)
  }

  const handleCellClick = (index: number) => {
    if (isPlayingSequence || gameOver) return

    const newUserSeq = [...userSequence, index]
    setUserSequence(newUserSeq)

    // Check if correct so far
    if (newUserSeq[newUserSeq.length - 1] !== sequence[newUserSeq.length - 1]) {
      setGameOver(true)
      setTimeout(() => onComplete(round * 15, 60), 1000)
      return
    }

    if (newUserSeq.length === sequence.length) {
      if (round === 5) {
        setGameOver(true)
        setTimeout(() => onComplete(100, 100), 1000)
      } else {
        setTimeout(() => {
          setSequence([...sequence, Math.floor(Math.random() * 9)])
          setUserSequence([])
          setRound(r => r + 1)
        }, 1000)
      }
    }
  }

  if (round === 0) {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Watch the sequence of glowing tiles and repeat it.</p>
        <button onClick={startGame} className="btn-primary">Start Game</button>
      </div>
    )
  }

  return (
    <div className="py-6 flex flex-col items-center">
      <div className="mb-4 text-sm font-bold text-accent uppercase tracking-widest text-center">Round {round} / 5</div>
      <div className="grid grid-cols-3 gap-3 w-64 h-64">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div
            key={i}
            onClick={() => handleCellClick(i)}
            className={`rounded-xl cursor-pointer transition-all duration-200 border-2 ${
              activeCell === i ? 'bg-accent border-accent scale-105 shadow-glow' : 'bg-page border-border hover:bg-page-hover'
            }`}
          />
        ))}
      </div>
      {gameOver && <p className="mt-4 text-danger font-bold text-center">Game Over!</p>}
    </div>
  )
}
