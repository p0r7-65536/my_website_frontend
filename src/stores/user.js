import { defineStore } from 'pinia'
import { getMe, login as loginApi, register as registerApi } from '../api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || '',
    initialized: false,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => {
      const role = state.user?.role
      return role === 'ADMIN' || role === 'SUPER_ADMIN'
    },
    username: (state) => state.user?.username || '',
  },

  actions: {
    setToken(token) {
      this.token = token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },

    clearAuth() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
    },

    async init() {
      if (!this.token) {
        this.initialized = true
        return
      }
      try {
        this.user = await getMe()
      } catch {
        this.clearAuth()
      } finally {
        this.initialized = true
      }
    },

    async login(credentials) {
      const result = await loginApi(credentials)
      this.setToken(result.token)
      this.user = result.user
      return result
    },

    async register(data) {
      const user = await registerApi(data)
      return user
    },

    logout() {
      this.clearAuth()
    },

    canManagePost(post) {
      if (!this.isLoggedIn || !post) return false
      return this.isAdmin || post.userId === this.user?.id
    },

    canManageReply(reply) {
      if (!this.isLoggedIn || !reply) return false
      return this.isAdmin || reply.userId === this.user?.id
    },
  },
})
