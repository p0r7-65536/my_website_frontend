import http, { unwrap } from './http'

export function getReplies(postId, params = {}) {
  return http.get(`/api/posts/${postId}/replies`, { params }).then(unwrap)
}

export function createReply(postId, data) {
  return http.post(`/api/posts/${postId}/replies`, data).then(unwrap)
}

export function deleteReply(id) {
  return http.delete(`/api/replies/${id}`).then(unwrap)
}
