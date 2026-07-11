import http, { unwrap } from './http'

export function login(data) {
  return http.post('/api/auth/login', data).then(unwrap)
}

export function register(data) {
  return http.post('/api/auth/register', data).then(unwrap)
}

export function getMe() {
  return http.get('/api/auth/me').then(unwrap)
}
