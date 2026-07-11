<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getBoards } from '../api/boards'
import { getErrorMessage } from '../api/http'

const route = useRoute()
const boards = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    boards.value = await getBoards()
  } catch (err) {
    error.value = getErrorMessage(err, '板块加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-section">
      <h2 class="sidebar-title">板块</h2>
      <nav class="board-list">
        <RouterLink
          class="board-item"
          :class="{ active: route.name === 'home' }"
          to="/"
        >
          <span class="board-name">全部帖子</span>
        </RouterLink>

        <div v-if="loading" class="sidebar-state">加载中...</div>
        <div v-else-if="error" class="sidebar-state error">{{ error }}</div>

        <RouterLink
          v-for="board in boards"
          :key="board.id"
          class="board-item"
          :class="{ active: route.name === 'board' && route.params.id === String(board.id) }"
          :to="`/board/${board.id}`"
        >
          <span class="board-name">{{ board.name }}</span>
          <span v-if="board.description" class="board-desc">{{ board.description }}</span>
        </RouterLink>
      </nav>
    </div>

    <div class="sidebar-section sidebar-extra">
      <RouterLink class="board-item" to="/game">
        <span class="board-name">🎮 文字对战陀螺</span>
        <span class="board-desc">小游戏娱乐</span>
      </RouterLink>
    </div>
  </aside>
</template>
