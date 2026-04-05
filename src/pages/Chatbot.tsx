import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BotMessageSquare, Send, User, Sparkles, Mic, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useAuthStore } from '../store'
import { useI18n, getLocale } from '../i18n'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

interface SpeechRecognitionResultLike {
  readonly transcript: string
}

interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>
  readonly error?: string
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike
}

export default function Chatbot() {
  const user = useAuthStore((s) => s.user)
  const { language, t } = useI18n()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t('chatbot.fallbackGeneric'),
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  const getExerciseHistory = () => {
    try {
      const raw = localStorage.getItem('neurorehab_sessions')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.slice(0, 8) : []
    } catch {
      return []
    }
  }

  const localFallback = (prompt: string) => {
    const q = prompt.toLowerCase()
    if (q.includes('parkinson')) {
      return [
        t('chatbot.fallbackTitle'),
        t('chatbot.fallbackExercise1'),
        t('chatbot.fallbackExercise2'),
        t('chatbot.fallbackGeneric'),
      ].join('\n')
    }
    if (q.includes('exercise') || q.includes('rep') || q.includes('rehab')) {
      return [
        t('chatbot.fallbackTitle'),
        t('chatbot.fallbackExercise1'),
        t('chatbot.fallbackExercise2'),
      ].join('\n')
    }
    return [
      t('chatbot.fallbackGeneric'),
      t('chatbot.fallbackGeneral1'),
      t('chatbot.fallbackGeneral2'),
    ].join('\n')
  }

  const toggleListen = () => {
    if (isListening) return;
    
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input.");
      return;
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev + (prev ? ' ' : '') + transcript)
    }

    recognition.onerror = (event: SpeechRecognitionEventLike) => {
      console.error("Speech recognition error", event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const newMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    }

    const currentMessages = [...messages, newMsg]
    setMessages(currentMessages)
    setInput('')
    setIsLoading(true)

    try {
      const apiMessages = currentMessages.map(m => ({
        role: m.sender === 'bot' ? 'assistant' : 'user',
        content: m.text
      }))

      const payload = {
        messages: apiMessages,
        user_id: user?.user_id,
        lang_code: user?.language_code,
        user_context: user
          ? {
              name: user.name,
              condition_id: user.condition_id,
              fitness_level: user.fitness_level,
            }
          : undefined,
        exercise_history: getExerciseHistory(),
      }

      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`)
      }
      
      const data = await response.json()
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "Sorry, I couldn't understand that.",
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMsg])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: localFallback(input),
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const isOnline = useOnlineStatus()

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
          <BotMessageSquare className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">NeuroAI Assistant</h1>
          <p className="text-sm text-text-muted">{t('chatbot.subtitle')}</p>
        </div>
      </div>

      {/* Offline warning */}
      {!isOnline && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warn/10 border border-warn/30">
          <WifiOff className="w-5 h-5 text-warn flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-warn-dark">{t('chatbot.offlineTitle')}</p>
            <p className="text-xs text-warn-dark/80 mt-0.5">{t('chatbot.offlineDesc')}</p>
          </div>
        </div>
      )}

      {/* Chat Window */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 glass-card flex flex-col overflow-hidden"
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex gap-4 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {m.sender === 'bot' ? (
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-accent" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
                    <User className="w-5 h-5 text-text-muted" />
                  </div>
                )}
              </div>
              
              {/* Bubble */}
              <div className={`p-4 rounded-2xl ${
                m.sender === 'user' 
                  ? 'bg-accent text-white rounded-tr-sm' 
                  : 'bg-page border border-border rounded-tl-sm text-text-primary'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                <span className={`text-[10px] block mt-2 ${m.sender === 'user' ? 'text-accent-50/70 text-right' : 'text-text-muted'}`}>
                  {m.timestamp.toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                  </div>
              </div>
              <div className="p-4 rounded-2xl bg-page border border-border rounded-tl-sm text-text-primary flex items-center h-12">
                <div className="flex gap-1.5 items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-page border-t border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleListen}
              disabled={isLoading || isListening}
              className={`p-3 rounded-xl transition-colors ${
                isListening 
                  ? 'bg-danger text-white animate-pulse' 
                  : 'bg-card border border-border text-text-muted hover:text-accent hover:border-accent/50'
              }`}
              title="Voice Input"
            >
              <Mic className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? t('chatbot.placeholderListening') : isLoading ? t('chatbot.placeholderTyping') : t('chatbot.placeholderReady')}
              disabled={isLoading}
              className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl bg-accent text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-dark transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
