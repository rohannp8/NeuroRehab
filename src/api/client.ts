import axios from 'axios'
import type { RegisterPayload, EndSessionPayload, TrialResult, UserProfile } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true,
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res.data.data,
  async (err) => {
    if (err.response?.status === 401) {
      try {
        await api.post('/auth/refresh')
        return api(err.config)
      } catch {
        throw new Error('Session expired. Please log in again.')
      }
    }
    throw new Error(err.response?.data?.message || 'Something went wrong')
  }
)

// AUTH
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const register = (payload: RegisterPayload) =>
  api.post('/auth/register', payload)

export const logout = () => api.post('/auth/logout')

export const getMe = () => api.get('/auth/me')

// EXERCISES
export const getExercises = (conditionId?: string) =>
  api.get('/exercises', { params: { condition: conditionId } })

// SESSIONS
export const startSession = (type: 'physical' | 'cognitive') =>
  api.post('/sessions/start', { session_type: type })

export const endSession = (id: string, data: EndSessionPayload) =>
  api.post(`/sessions/${id}/end`, data)

// COGNITIVE
export const startGame = (gameType: string) =>
  api.post('/cognitive/session/start', { game_type: gameType })

export const submitTrial = (sessionId: string, result: TrialResult) =>
  api.post('/cognitive/trial', { session_id: sessionId, ...result })

export const endGame = (sessionId: string) =>
  api.post('/cognitive/session/end', { session_id: sessionId })

// LEADERBOARD
export const getLeaderboard = (scope: string, period?: string) =>
  api.get('/leaderboard', { params: { scope, period } })

export const getMyRank = () => api.get('/leaderboard/me')

// ANALYTICS
export const getROMData = (days = 30) =>
  api.get('/analytics/rom', { params: { days } })

export const getCognitiveData = (days = 14) =>
  api.get('/analytics/cognitive', { params: { days } })

export const getRecovery = () => api.get('/analytics/recovery')

export const getSessionHeatmap = () => api.get('/analytics/sessions/heatmap')

export const exportPDF = () => api.post('/analytics/report/pdf')

// NOTIFICATIONS
export const getNotifications = () => api.get('/notifications?unread=true')

export const markRead = (id: string) => api.post(`/notifications/${id}/read`)

// PROFILE
export const updateProfile = (data: Partial<UserProfile>) =>
  api.put('/user/profile', data)

export const getBadges = () => api.get('/user/badges')

export default api
