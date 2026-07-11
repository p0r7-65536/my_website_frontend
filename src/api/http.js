import axios from 'axios'
import router from '../router'

const http = axios.create({
  baseURL: '',
  timeout: 10000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      const { useUserStore } = await import('../stores/user')
      useUserStore().clearAuth()
      const current = router.currentRoute.value
      if (current.name !== 'login' && current.name !== 'register') {
        router.push({
          name: 'login',
          query: { redirect: current.fullPath },
        })
      }
    }
    return Promise.reject(error)
  },
)

export function unwrap(response) {
  const body = response.data
  if (body?.code === 200) {
    return body.data
  }
  throw new Error(body?.message || '请求失败')
}

export function getErrorMessage(error, fallback = '请求失败，请稍后再试') {
  return error?.response?.data?.message || error?.message || fallback
}

export default http
