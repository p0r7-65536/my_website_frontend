<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getBoards } from '../api/boards'
import { getPosts } from '../api/posts'
import { getErrorMessage } from '../api/http'
import PostCard from '../components/PostCard.vue'

const route = useRoute()
const board = ref(null)
const posts = ref([])
const loading = ref(true)
const error = ref('')
const page = ref(0)
const totalPages = ref(0)

async function loadBoard() {
  const boards = await getBoards()
  board.value = boards.find((b) => String(b.id) === route.params.id) || null
}

async function loadPosts() {
  loading.value = true
  error.value = ''
  try {
    await loadBoard()
    const data = await getPosts({
      boardId: route.params.id,
      page: page.value,
      size: 20,
    })
    posts.value = data.content || []
    totalPages.value = data.totalPages || 0
  } catch (err) {
    error.value = getErrorMessage(err, '帖子加载失败')
  } finally {
    loading.value = false
  }
}

function goPage(next) {
  if (next < 0 || next >= totalPages.value) return
  page.value = next
  loadPosts()
}

watch(() => route.params.id, () => {
  page.value = 0
  loadPosts()
})

onMounted(loadPosts)
</script>

<template>
  <section class="page">
    <div class="page-header">
      <h1>{{ board?.name || '板块' }}</h1>
      <p v-if="board?.description" class="page-desc">{{ board.description }}</p>
    </div>

    <div v-if="loading" class="state">正在加载帖子...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else-if="posts.length === 0" class="state">该板块暂无帖子</div>

    <div v-else class="post-list">
      <PostCard v-for="post in posts" :key="post.id" :post="post" />
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="btn btn-ghost btn-sm" :disabled="page === 0" @click="goPage(page - 1)">
        上一页
      </button>
      <span class="page-info">{{ page + 1 }} / {{ totalPages }}</span>
      <button
        class="btn btn-ghost btn-sm"
        :disabled="page >= totalPages - 1"
        @click="goPage(page + 1)"
      >
        下一页
      </button>
    </div>
  </section>
</template>
