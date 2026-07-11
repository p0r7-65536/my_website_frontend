<script setup>
import { RouterLink } from 'vue-router'
import { formatDate } from '../utils/format'

defineProps({
  post: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <article class="post-card">
    <div class="post-card-header">
      <RouterLink class="post-title" :to="`/post/${post.id}`">
        {{ post.title || '未命名帖子' }}
      </RouterLink>
      <span v-if="post.boardName" class="board-tag">{{ post.boardName }}</span>
    </div>
    <p v-if="post.content" class="post-summary">
      {{ post.content.slice(0, 150) }}{{ post.content.length > 150 ? '...' : '' }}
    </p>
    <div class="post-meta">
      <span class="meta-author">{{ post.username }}</span>
      <span class="meta-dot">·</span>
      <span>{{ formatDate(post.createdAt) }}</span>
      <span v-if="post.viewCount != null" class="meta-views">
        <span class="meta-dot">·</span>
        {{ post.viewCount }} 浏览
      </span>
    </div>
  </article>
</template>
