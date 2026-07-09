import http from './http'

export function getPosts() {
  return http.get('/api/posts')
}

export function getPostById(id) {
  return http.get(`/api/posts/${id}`)
}
