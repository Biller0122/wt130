import { create } from 'zustand'
import { api } from '../lib/api'

interface User { id: string; name: string; email: string; role: string; client?: { id: string; name: string } }

interface AuthStore {
  user: User | null
  token: string | null
  initialized: boolean
  init: () => Promise<void>
  login: (token: string, user: User) => void
  logout: () => void
  isAdmin: () => boolean
  isClient: () => boolean
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  initialized: false,

  init: async () => {
    const { token, user } = get()
    if (!token) { set({ initialized: true }); return }
    if (user) { set({ initialized: true }); return }
    try {
      const res = await api.get('/auth/me')
      if (res.data) {
        localStorage.setItem('user', JSON.stringify(res.data))
        set({ user: res.data, initialized: true })
      } else {
        localStorage.removeItem('token')
        set({ token: null, initialized: true })
      }
    } catch {
      // 401 бол axios interceptor /login руу redirect хийнэ
      set({ initialized: true })
    }
  },

  login: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user, initialized: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },

  isAdmin: () => ['ADMIN', 'MANAGER'].includes(get().user?.role ?? ''),
  isClient: () => get().user?.role === 'CLIENT',
}))
