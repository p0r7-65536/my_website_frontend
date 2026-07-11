import http, { unwrap } from './http'

export function getBoards() {
  return http.get('/api/boards').then(unwrap)
}
