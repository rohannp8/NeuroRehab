import { useState } from 'react'

function randomInt(max: number): number {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % max
}

export default function SpatialMemory({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [phase, setPhase] = useState<'intro' | 'show' | 'recall'>('intro')
  const [targetCells, setTargetCells] = useState<number[]>([])
  const [userCells, setUserCells] = useState<number[]>([])
  const [round, setRound] = useState(1)

  const startRound = () => {
    const numTargets = 2 + round
    const targets: number[] = []
    while(targets.length < numTargets) {
      const r = randomInt(9)
      if(!targets.includes(r)) targets.push(r)
    }
    setTargetCells(targets)
    setUserCells([])
    setPhase('show')
    
    setTimeout(() => {
      setPhase('recall')
    }, 2000)
  }

  const handleCellClick = (i: number) => {
    if (phase !== 'recall') return

    if (userCells.includes(i)) return
    
    const newSelected = [...userCells, i]
    setUserCells(newSelected)

    if (newSelected.length === targetCells.length) {
      const correct = newSelected.filter(c => targetCells.includes(c)).length
      if (correct === targetCells.length) {
        if (round === 3) {
          onComplete(100, 100)
        } else {
          setRound(r => r + 1)
          setTimeout(startRound, 1000)
        }
      } else {
        onComplete(round * 25, 50)
      }
    }
  }

  if (phase === 'intro') {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Remember which blocks turn <b className="text-accent">BLUE</b> and select them after they hide.</p>
        <button onClick={startRound} className="btn-primary">Start Game</button>
      </div>
    )
  }

  return (
    <div className="py-6 flex flex-col items-center">
      <div className="mb-4 text-sm font-bold text-accent uppercase tracking-widest text-center">Round {round} / 3</div>
      
      <div className="grid grid-cols-3 gap-3 w-64 h-64">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
          const isTarget = phase === 'show' && targetCells.includes(i)
          const isSelected = phase === 'recall' && userCells.includes(i)
          return (
            <div
              key={i}
              onClick={() => handleCellClick(i)}
              className={`rounded-xl transition-all duration-200 border-2 ${
                isTarget ? 'bg-accent border-accent' : 
                isSelected ? 'bg-accent-light border-accent' : 
                'bg-page border-border cursor-pointer hover:bg-page-hover'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
