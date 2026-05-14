import { create } from 'zustand'

interface User { id: string; name: string; email: string; role: string; client?: { id: string; name: string } }

interface AuthStore {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isAdmin: () => boolean
  isClient: () => boolean
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  login: (token, user) => {
    localStorage.setItem('token', token)
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },
  isAdmin: () => ['ADMIN', 'MANAGER'].includes(get().user?.role ?? ''),
  isClient: () => get().user?.role === 'CLIENT',
}))
