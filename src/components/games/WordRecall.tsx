import { useState } from 'react'

function shuffleWords<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const bytes = new Uint32Array(1)
    crypto.getRandomValues(bytes)
    const j = bytes[0] % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const ALL_WORDS = ["APPLE", "CHAIR", "RIVER", "CLOUD", "TRAIN", "BREAD", "TIGER", "PLANT"]

export default function WordRecall({ onComplete }: { onComplete: (score: number, accuracy: number) => void }) {
  const [phase, setPhase] = useState<'intro' | 'memorize' | 'recall'>('intro')
  const [targetWords, setTargetWords] = useState<string[]>([])
  const [options, setOptions] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])

  const startGame = () => {
    // Pick 3 random words
    const shuffled = shuffleWords(ALL_WORDS)
    const targets = shuffled.slice(0, 3)
    setTargetWords(targets)
    setPhase('memorize')

    // Prepare recall options (3 targets + 3 distractors)
    const optionsMix = shuffleWords([...targets, ...shuffled.slice(3, 6)])
    setOptions(optionsMix)

    // Hide words after 4 seconds
    setTimeout(() => {
      setPhase('recall')
    }, 4000)
  }

  const toggleSelect = (word: string) => {
    if (selected.includes(word)) {
      setSelected(selected.filter(w => w !== word))
    } else {
      setSelected([...selected, word])
    }
  }

  const submitRecall = () => {
    const correct = selected.filter(w => targetWords.includes(w)).length
    const incorrect = selected.length - correct
    const rawAcc = Math.max(0, (correct - incorrect) / targetWords.length) * 100
    onComplete(Math.round(rawAcc), Math.round(rawAcc))
  }

  if (phase === 'intro') {
    return (
      <div className="text-center py-8">
        <p className="mb-6 text-text-primary">Memorize the words shown. After a few seconds, you'll need to pick them from a list.</p>
        <button onClick={startGame} className="btn-primary">Start Game</button>
      </div>
    )
  }

  if (phase === 'memorize') {
    return (
      <div className="py-12 flex flex-col items-center animate-pulse">
        <p className="mb-8 text-sm font-bold text-accent uppercase tracking-widest text-center">Memorize these words</p>
        <div className="flex gap-4">
          {targetWords.map(w => (
            <span key={w} className="px-6 py-3 bg-white border border-border shadow-sm rounded-xl font-bold text-lg text-text-primary">{w}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 flex flex-col items-center">
      <p className="mb-8 text-sm font-bold text-accent uppercase tracking-widest text-center">Which words did you see?</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {options.map((word) => (
          <button
            key={word}
            onClick={() => toggleSelect(word)}
            className={`px-6 py-4 rounded-xl border-2 transition-colors font-semibold ${
              selected.includes(word) 
                ? 'border-accent bg-accent/10 text-accent-dark' 
                : 'border-border bg-card text-text-primary hover:bg-page'
            }`}
          >
            {word}
          </button>
        ))}
      </div>
      
      <button onClick={submitRecall} className="btn-success">Submit Answer</button>
    </div>
  )
}
