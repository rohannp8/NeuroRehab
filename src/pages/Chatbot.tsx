import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BotMessageSquare, Send, User, Sparkles, Mic, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

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

  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const toggleListen = () => {
    if (isListening) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
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

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: apiMessages })
      })
      
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
        text: "Sorry, I am having trouble connecting to the server.",
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
          <p className="text-sm text-text-muted">General guidance & support</p>
        </div>
      </div>

      {/* Offline warning */}
      {!isOnline && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warn/10 border border-warn/30">
          <WifiOff className="w-5 h-5 text-warn flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-warn-dark">You're currently offline</p>
            <p className="text-xs text-warn-dark/80 mt-0.5">The AI Assistant requires an internet connection to respond. Please reconnect and try again.</p>
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
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              placeholder={isListening ? "Listening..." : isLoading ? "Bot is typing..." : "Ask me anything..."}
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
