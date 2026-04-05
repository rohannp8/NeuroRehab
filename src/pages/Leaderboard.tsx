import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import { mockLeaderboard, CONDITIONS } from '../mockData'
import { useAuthStore } from '../store'
import {
  Trophy,
  Flame,
  Globe,
  Calendar,
  Users,
  Heart,
  MessageCircle,
  UserPlus,
  Send,
  UserCheck,
} from 'lucide-react'
import { translateCondition, useI18n } from '../i18n'

type TabId = 'global' | 'weekly' | 'condition' | 'friends'

interface ChatMessage {
  id: string
  sender: 'me' | 'friend'
  text: string
  timestamp: number
}

interface FriendChat {
  friendId: string
  messages: ChatMessage[]
}

const FRIENDS_KEY = 'neurorehab_connected_friends'
const CHATS_KEY = 'neurorehab_friend_chats'

function loadFriendIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FRIENDS_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

function saveFriendIds(ids: string[]) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(ids))
}

function loadChats(): FriendChat[] {
  try {
    return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]') as FriendChat[]
  } catch {
    return []
  }
}

function saveChats(chats: FriendChat[]) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
}

export default function Leaderboard() {
  const { language, t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabId>('global')
  const user = useAuthStore((s) => s.user)
  const myEntry = mockLeaderboard.find((e) => e.is_current_user)
  const medals = ['🥇', '🥈', '🥉']

  const [connectedFriendIds, setConnectedFriendIds] = useState<string[]>(loadFriendIds)
  const [friendChats, setFriendChats] = useState<FriendChat[]>(loadChats)
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')

  const globalRows = useMemo(() => [...mockLeaderboard].sort((a, b) => a.rank - b.rank), [])

  const weeklyRows = useMemo(() => {
    const sorted = [...mockLeaderboard]
      .map((entry) => ({
        ...entry,
        weekly_xp: Math.max(120, Math.round(entry.xp_total * 0.18 - entry.rank * 40 + 210)),
      }))
      .sort((a, b) => b.weekly_xp - a.weekly_xp)

    return sorted.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      xp_total: entry.weekly_xp,
    }))
  }, [])

  const conditionRows = useMemo(() => {
    const conditionId = user?.condition_id
    if (!conditionId) return globalRows

    const filtered = globalRows.filter((entry) => entry.condition_id === conditionId)
    return filtered.map((entry, index) => ({ ...entry, rank: index + 1 }))
  }, [globalRows, user?.condition_id])

  const friendPool = useMemo(() => globalRows.filter((entry) => !entry.is_current_user), [globalRows])
  const connectedFriends = useMemo(
    () => friendPool.filter((entry) => connectedFriendIds.includes(entry.display_name)),
    [connectedFriendIds, friendPool],
  )
  const suggestedFriends = useMemo(
    () => friendPool.filter((entry) => !connectedFriendIds.includes(entry.display_name)),
    [connectedFriendIds, friendPool],
  )

  const selectedFriend = connectedFriends.find((entry) => entry.display_name === selectedFriendId) || null
  const selectedChat = friendChats.find((c) => c.friendId === selectedFriendId)?.messages || []

  const conditionLabel = translateCondition(user?.condition_id, language) || CONDITIONS.find((c) => c.id === user?.condition_id)?.label || t('leaderboard.conditionEmpty')

  const nextTimestamp = (messages: ChatMessage[]) => (messages[messages.length - 1]?.timestamp ?? 0) + 1

  const connectFriend = (friendId: string) => {
    if (connectedFriendIds.includes(friendId)) return

    const next = [...connectedFriendIds, friendId]
    setConnectedFriendIds(next)
    saveFriendIds(next)

    const hasChat = friendChats.some((chat) => chat.friendId === friendId)
    if (!hasChat) {
      const welcomeMessage: ChatMessage = {
        id: `welcome-${friendId}-${friendChats.length + 1}`,
        sender: 'friend',
        text: t('leaderboard.connectionWelcome'),
        timestamp: 1,
      }

      const nextChats: FriendChat[] = [
        ...friendChats,
        {
          friendId,
          messages: [welcomeMessage],
        },
      ]
      setFriendChats(nextChats)
      saveChats(nextChats)
    }

    setSelectedFriendId(friendId)
  }

  const sendMessage = () => {
    if (!selectedFriendId || !chatInput.trim()) return

    const messageText = chatInput.trim()
    setChatInput('')
    const baseTs = nextTimestamp(selectedChat)

    const myMessage: ChatMessage = {
      id: `me-${selectedFriendId}-${baseTs}`,
      sender: 'me',
      text: messageText,
      timestamp: baseTs,
    }

    const updateWithMessage = (existing: FriendChat[]) => {
      let found = false
      const updated = existing.map((chat) => {
        if (chat.friendId !== selectedFriendId) return chat
        found = true
        return { ...chat, messages: [...chat.messages, myMessage] }
      })

      if (!found) {
        updated.push({ friendId: selectedFriendId, messages: [myMessage] })
      }

      return updated
    }

    const nextChats = updateWithMessage(friendChats)
    setFriendChats(nextChats)
    saveChats(nextChats)

    window.setTimeout(() => {
      const friendReply: ChatMessage = {
        id: `friend-${selectedFriendId}-${baseTs + 1}`,
        sender: 'friend',
        text: t('leaderboard.reply'),
        timestamp: baseTs + 1,
      }

      setFriendChats((prev) => {
        const withReply = prev.map((chat) =>
          chat.friendId === selectedFriendId
            ? { ...chat, messages: [...chat.messages, friendReply] }
            : chat,
        )
        saveChats(withReply)
        return withReply
      })
    }, 650)
  }

  const renderTable = (rows: typeof mockLeaderboard, xpLabel: string) => (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">{t('leaderboard.rank')}</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">{t('leaderboard.player')}</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider hidden sm:table-cell">{t('leaderboard.condition')}</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">{xpLabel}</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider hidden sm:table-cell">{t('leaderboard.streak')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, i) => (
              <motion.tr
                key={`${entry.display_name}-${entry.rank}-${activeTab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`border-b border-border-light transition-colors ${entry.is_current_user ? 'bg-accent-50 hover:bg-accent-100' : 'hover:bg-page'}`}
              >
                <td className="px-6 py-4">{entry.rank <= 3 ? <span className="text-2xl">{medals[entry.rank - 1]}</span> : <span className="text-sm font-bold text-text-muted">#{entry.rank}</span>}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${entry.is_current_user ? 'bg-gradient-to-br from-accent to-accent-dark text-white' : 'bg-page text-text-muted'}`}>{entry.display_name.charAt(0)}</div>
                    <div>
                      <p className={`text-sm font-medium ${entry.is_current_user ? 'text-accent-dark' : 'text-text-primary'}`}>
                        {entry.display_name}
                        {entry.is_current_user && <span className="text-xs ml-2 text-accent/60">{t('leaderboard.you')}</span>}
                      </p>
                      <p className="text-xs text-text-light">{entry.country_code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden sm:table-cell"><span className="text-xs px-2 py-1 rounded-full bg-page text-text-muted capitalize">{translateCondition(entry.condition_id, language)}</span></td>
                <td className="px-6 py-4 text-right"><span className="text-sm font-bold text-text-primary">{entry.xp_total.toLocaleString()}</span></td>
                <td className="px-6 py-4 text-right hidden sm:table-cell"><span className="flex items-center justify-end gap-1 text-sm text-warn"><Flame className="w-3.5 h-3.5" /> {entry.current_streak}</span></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Trophy className="w-7 h-7 text-warn" /> {t('leaderboard.title')}
        </h1>
        <p className="text-text-muted mt-1 text-sm">{t('leaderboard.subtitle')}</p>
      </div>

      {myEntry && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-accent/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold text-xl shadow-button">#{myEntry.rank}</div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">{t('leaderboard.yourRanking')}</h3>
                <p className="text-sm text-text-muted">{user?.name || myEntry.display_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-center">
              <div><p className="text-2xl font-bold text-accent">{myEntry.xp_total.toLocaleString()}</p><p className="text-xs text-text-light">{t('leaderboard.xp')}</p></div>
              <div><p className="text-2xl font-bold text-warn flex items-center gap-1"><Flame className="w-5 h-5" /> {myEntry.current_streak}</p><p className="text-xs text-text-light">{t('leaderboard.streak')}</p></div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 bg-white rounded-2xl p-1 border border-border shadow-soft">
        {([
          { id: 'global', icon: Globe },
          { id: 'weekly', icon: Calendar },
          { id: 'condition', icon: Heart },
          { id: 'friends', icon: Users },
        ] as Array<{ id: TabId; icon: ComponentType<{ className?: string }> }>).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-page'}`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {tab.id === 'global' ? t('leaderboard.global') : tab.id === 'weekly' ? t('leaderboard.weekly') : tab.id === 'condition' ? t('leaderboard.myCondition') : t('leaderboard.friends')}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'global' && renderTable(globalRows, t('leaderboard.xpLabel'))}

      {activeTab === 'weekly' && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">{t('leaderboard.weeklyDesc')}</p>
          {renderTable(weeklyRows, t('leaderboard.weeklyLabel'))}
        </div>
      )}

      {activeTab === 'condition' && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">{t('leaderboard.sameCondition')} <span className="font-semibold text-text-primary">{conditionLabel}</span>.</p>
          {renderTable(conditionRows, t('leaderboard.xpLabel'))}
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4 text-accent" /> {t('leaderboard.connections')}</h3>
              {connectedFriends.length === 0 ? (
                <p className="text-sm text-text-muted">{t('leaderboard.noFriends')}</p>
              ) : (
                <div className="space-y-2.5">
                  {connectedFriends.map((friend) => (
                    <button
                      key={friend.display_name}
                      onClick={() => setSelectedFriendId(friend.display_name)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedFriendId === friend.display_name ? 'border-accent/40 bg-accent/5' : 'border-border hover:bg-page'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{friend.display_name}</p>
                          <p className="text-xs text-text-light flex items-center gap-1"><Flame className="w-3 h-3" /> {friend.current_streak} day streak</p>
                        </div>
                        <MessageCircle className="w-4 h-4 text-accent" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-accent" /> {t('leaderboard.suggestions')}</h3>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {suggestedFriends.length === 0 && <p className="text-sm text-text-muted">{t('leaderboard.connectedEveryone')}</p>}
                {suggestedFriends.map((friend) => (
                  <div key={friend.display_name} className="p-3 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{friend.display_name}</p>
                      <p className="text-xs text-text-light capitalize">{translateCondition(friend.condition_id, language)}</p>
                    </div>
                    <button onClick={() => connectFriend(friend.display_name)} className="btn-secondary px-3 py-1.5 text-xs">
                      {t('leaderboard.connect')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-4 flex flex-col min-h-[440px]">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-accent" /> {t('leaderboard.chat')}</h3>

            {!selectedFriend ? (
              <div className="flex-1 rounded-xl border border-border bg-page/60 flex items-center justify-center text-center px-8">
                <p className="text-text-muted text-sm">{t('leaderboard.selectFriend')}</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 rounded-xl bg-page border border-border mb-3">
                  <p className="text-sm font-semibold text-text-primary">{t('leaderboard.chatting', { friend: selectedFriend.display_name })}</p>
                </div>
                <div className="flex-1 rounded-xl border border-border bg-page/60 p-3 space-y-2 overflow-y-auto">
                  {selectedChat.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${msg.sender === 'me' ? 'bg-accent text-white' : 'bg-white border border-border text-text-primary'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {selectedChat.length === 0 && <p className="text-sm text-text-muted">{t('leaderboard.noMessagesYet')}</p>}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    className="input-field"
                    placeholder={t('leaderboard.messagePlaceholder')}
                  />
                  <button onClick={sendMessage} className="btn-primary px-3 py-2.5">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
