import { create } from 'zustand'
import type { UserProfile } from './types'

interface AuthStore {
  user: UserProfile | null
  setUser: (user: UserProfile | null) => void
  updateUser: (patch: Partial<UserProfile>) => void
  isAuthenticated: boolean
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  updateUser: (patch) => set((state) => {
    if (!state.user) return state
    const nextUser = { ...state.user, ...patch }
    return { user: nextUser, isAuthenticated: true }
  }),
}))
