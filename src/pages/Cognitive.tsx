import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GameType } from '../types'
import {
  Brain, Play, ArrowLeft, Trophy, Target, Clock, Zap,
  Grid3X3, Type, Hash, CircleDot, Palette, RotateCcw,
  Calculator, Hexagon, Shapes
} from 'lucide-react'

// Import all 10 Games
import SequenceRecall from '../components/games/SequenceRecall'
import PatternMatrix from '../components/games/PatternMatrix'
import WordRecall from '../components/games/WordRecall'
import NumberSpan from '../components/games/NumberSpan'
import GoNoGo from '../components/games/GoNoGo'
import SpatialMemory from '../components/games/SpatialMemory'
import ColorStroop from '../components/games/ColorStroop'
import MathChallenge from '../components/games/MathChallenge'
import OddOneOut from '../components/games/OddOneOut'
import ShapeMatch from '../components/games/ShapeMatch'

interface GameConfig {
  type: GameType
  name: string
  domain: string
  description: string
  difficulty: 1 | 2 | 3
  icon: typeof Brain
}

const games: GameConfig[] = [
  { type: 'sequence_recall', name: 'Sequence Recall', domain: 'Memory', description: 'Remember and repeat sequences of highlighted tiles', difficulty: 2, icon: Grid3X3 },
  { type: 'pattern_matrix', name: 'Pattern Matrix', domain: 'Visual', description: 'Find the missing piece in a visual pattern grid', difficulty: 2, icon: Grid3X3 },
  { type: 'delayed_word_recall', name: 'Word Recall', domain: 'Language', description: 'Memorize words, wait, then recall them', difficulty: 3, icon: Type },
  { type: 'number_span', name: 'Number Span', domain: 'Working Memory', description: 'Remember sequences of digits shown one at a time', difficulty: 2, icon: Hash },
  { type: 'go_no_go', name: 'Go / No-Go', domain: 'Inhibition', description: 'React to green, hold for red — test your reflexes', difficulty: 1, icon: CircleDot },
  { type: 'spatial_memory_grid', name: 'Spatial Memory', domain: 'Spatial', description: 'Remember which cells flash and click them back', difficulty: 2, icon: Grid3X3 },
  { type: 'color_word_stroop', name: 'Color Stroop', domain: 'Attention', description: 'Click the ink color, not the word itself', difficulty: 3, icon: Palette },
  { type: 'math_challenge', name: 'Math Challenge', domain: 'Calculation', description: 'Solve arithmetic equations under pressure', difficulty: 2, icon: Calculator },
  { type: 'odd_one_out', name: 'Odd One Out', domain: 'Visual', description: 'Find the shape that is slightly different from the rest', difficulty: 1, icon: Hexagon },
  { type: 'shape_match', name: 'Shape Match', domain: 'Recognition', description: 'Match the exact identical shapes quickly', difficulty: 1, icon: Shapes },
]

export default function Cognitive() {
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null)
  const [gameComplete, setGameComplete] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [finalAccuracy, setFinalAccuracy] = useState(0)

  const handleComplete = useCallback((score: number, accuracy: number) => {
    setFinalScore(score)
    setFinalAccuracy(Math.round(accuracy))
    setGameComplete(true)
  }, [])

  const resetGame = () => {
    setSelectedGame(null)
    setGameComplete(false)
    setFinalScore(0)
    setFinalAccuracy(0)
  }

  const playAgain = () => {
    setGameComplete(false)
    setFinalScore(0)
    setFinalAccuracy(0)
    const game = selectedGame
    setSelectedGame(null)
    setTimeout(() => setSelectedGame(game), 50)
  }

  const diffBadge = (d: 1 | 2 | 3) => {
    const map = {
      1: { label: 'Easy', cls: 'bg-success-light text-success-dark' },
      2: { label: 'Medium', cls: 'bg-warn-light text-warn-dark' },
      3: { label: 'Hard', cls: 'bg-danger-light text-danger-dark' },
    }
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[d].cls}`}>{map[d].label}</span>
  }

  const renderActiveGame = () => {
    if (!selectedGame) return null
    switch (selectedGame.type) {
      case 'sequence_recall': return <SequenceRecall onComplete={handleComplete} />
      case 'pattern_matrix': return <PatternMatrix onComplete={handleComplete} />
      case 'delayed_word_recall': return <WordRecall onComplete={handleComplete} />
      case 'number_span': return <NumberSpan onComplete={handleComplete} />
      case 'go_no_go': return <GoNoGo onComplete={handleComplete} />
      case 'spatial_memory_grid': return <SpatialMemory onComplete={handleComplete} />
      case 'color_word_stroop': return <ColorStroop onComplete={handleComplete} />
      case 'math_challenge': return <MathChallenge onComplete={handleComplete} />
      case 'odd_one_out': return <OddOneOut onComplete={handleComplete} />
      case 'shape_match': return <ShapeMatch onComplete={handleComplete} />
      default: return <div className="p-8 text-center">Game not found</div>
    }
  }

  // Active Game View
  if (selectedGame) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <button onClick={resetGame} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Games
        </button>

        <div className="glass-card p-4 sm:p-8 bg-white max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-pastel-lilac">
                <selectedGame.icon className="w-7 h-7 text-purple-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">{selectedGame.name}</h2>
                <p className="text-sm text-text-muted font-medium">{selectedGame.domain}</p>
              </div>
            </div>
            {diffBadge(selectedGame.difficulty)}
          </div>

          <AnimatePresence mode="wait">
            {gameComplete ? (
              <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 py-4">
                <div className="w-24 h-24 rounded-full bg-pastel-lemon flex items-center justify-center mx-auto shadow-sm tracking-widest">
                  <Trophy className="w-12 h-12 text-warn" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary">Game Complete!</h3>

                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                  <div className="p-4 rounded-2xl bg-page">
                    <Target className="w-5 h-5 text-accent mx-auto mb-2" />
                    <p className="text-2xl font-bold text-accent">{finalScore}</p>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mt-1">Score</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-page">
                    <Zap className="w-5 h-5 text-warn mx-auto mb-2" />
                    <p className="text-2xl font-bold text-warn">{finalAccuracy}%</p>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mt-1">Accuracy</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-page">
                    <Clock className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-500">+{Math.round(finalScore / 2)}</p>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mt-1">XP</p>
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <button onClick={playAgain} className="btn-secondary flex items-center gap-2 px-8">
                    <RotateCcw className="w-4 h-4" /> Try Again
                  </button>
                  <button onClick={resetGame} className="btn-primary px-8">All Games</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {renderActiveGame()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // Games Hub
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
          <Brain className="w-8 h-8 text-purple-500" />
          Cognitive Training
        </h1>
        <p className="text-text-muted mt-2 text-base max-w-2xl">Challenge your brain with 10 scientifically-designed games tailored to improve memory, visual recognition, and cognitive speed.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {games.map((g, i) => (
          <motion.div
            key={g.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-6 bg-white group hover:border-purple-200 hover:shadow-card cursor-pointer flex flex-col h-full"
            onClick={() => { setSelectedGame(g); setGameComplete(false) }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-pastel-lilac group-hover:scale-105 transition-transform">
                <g.icon className="w-6 h-6 text-purple-500" />
              </div>
              {diffBadge(g.difficulty)}
            </div>

            <h3 className="text-lg font-bold text-text-primary mb-1">{g.name}</h3>
            <p className="text-xs font-semibold text-purple-500 mb-3 uppercase tracking-wider">{g.domain}</p>
            <p className="text-sm text-text-secondary flex-1 line-clamp-3 mb-6">{g.description}</p>

            <button
              className="w-full py-2.5 rounded-xl bg-page text-text-primary font-bold flex items-center justify-center gap-2 group-hover:bg-purple-500 group-hover:text-white transition-colors border border-border group-hover:border-purple-500"
            >
              <Play className="w-4 h-4 fill-current" /> Play Now
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
