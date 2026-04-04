import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BotMessageSquare, Send, User, Sparkles } from 'lucide-react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your NeuroAI Assistant. How can I help you with your rehabilitation journey today? Feel free to ask me general questions or doubts.",
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

  const handleSend = () => {
    if (!input.trim()) return

    const newMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMsg])
    setInput('')

    // Mock bot reply
    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm a demo AI for now! Once the backend is connected, I'll be able to give you specific medical and therapeutic advice based on your profile.",
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMsg])
    }, 1000)
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
          <BotMessageSquare className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">NeuroAI Assistant</h1>
          <p className="text-sm text-text-muted">General guidance & support</p>
        </div>
      </div>

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
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-page border-t border-border">
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
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
