import { create } from 'zustand'
import type { UserProfile } from './types'

interface AuthStore {
  user: UserProfile | null
  setUser: (user: UserProfile | null) => void
  isAuthenticated: boolean
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}))
