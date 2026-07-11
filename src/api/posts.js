import http, { unwrap } from './http'

export function getPosts(params = {}) {
  return http.get('/api/posts', { params }).then(unwrap)
}

export function getPostById(id) {
  return http.get(`/api/posts/${id}`).then(unwrap)
}

export function createPost(data) {
  return http.post('/api/posts', data).then(unwrap)
}

export function updatePost(id, data) {
  return http.put(`/api/posts/${id}`, data).then(unwrap)
}

export function deletePost(id) {
  return http.delete(`/api/posts/${id}`).then(unwrap)
}
