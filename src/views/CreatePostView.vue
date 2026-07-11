<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getBoards } from '../api/boards'
import { createPost } from '../api/posts'
import { getErrorMessage } from '../api/http'

const router = useRouter()
const boards = ref([])
const boardId = ref('')
const title = ref('')
const content = ref('')
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    boards.value = await getBoards()
    if (boards.value.length > 0) {
      boardId.value = String(boards.value[0].id)
    }
  } catch (err) {
    error.value = getErrorMessage(err, '板块加载失败')
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  if (!boardId.value || !title.value.trim() || !content.value.trim()) {
    error.value = '请填写完整信息'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    const post = await createPost({
      boardId: Number(boardId.value),
      title: title.value.trim(),
      content: content.value.trim(),
    })
    router.push(`/post/${post.id}`)
  } catch (err) {
    error.value = getErrorMessage(err, '发帖失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card create-card">
      <h1>发布新帖</h1>
      <p class="auth-desc">分享你的想法，参与社区讨论</p>

      <div v-if="loading" class="state">加载中...</div>

      <form v-else class="auth-form" @submit.prevent="handleSubmit">
        <label class="form-label">
          选择板块
          <select v-model="boardId" class="input select">
            <option v-for="board in boards" :key="board.id" :value="String(board.id)">
              {{ board.name }}
            </option>
          </select>
        </label>

        <label class="form-label">
          标题
          <input v-model="title" class="input" type="text" placeholder="输入帖子标题" required />
        </label>

        <label class="form-label">
          内容
          <textarea
            v-model="content"
            class="textarea"
            rows="10"
            placeholder="输入帖子内容"
            required
          />
        </label>

        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit" :disabled="submitting">
            {{ submitting ? '发布中...' : '发布帖子' }}
          </button>
          <RouterLink class="btn btn-ghost" to="/">取消</RouterLink>
        </div>
      </form>
    </div>
  </section>
</template>
