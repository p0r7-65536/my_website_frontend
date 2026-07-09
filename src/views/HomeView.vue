<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getPosts } from '../api/posts'

const posts = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await getPosts()
    posts.value = Array.isArray(data) ? data : data?.items || []
  } catch (err) {
    error.value = err?.response?.data?.message || '文章列表加载失败，请稍后再试。'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <p class="eyebrow">Posts</p>
      <h1>最新文章</h1>
      <p>记录技术、生活和一些正在发生的想法。</p>
    </div>

    <div v-if="loading" class="state">正在加载文章...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else-if="posts.length === 0" class="state">暂无文章。</div>

    <div v-else class="post-list">
      <article v-for="post in posts" :key="post.id" class="post-card">
        <RouterLink class="post-title" :to="`/post/${post.id}`">
          {{ post.title || '未命名文章' }}
        </RouterLink>
        <p v-if="post.summary || post.excerpt" class="post-summary">
          {{ post.summary || post.excerpt }}
        </p>
        <p v-else-if="post.content" class="post-summary">
          {{ post.content.slice(0, 120) }}{{ post.content.length > 120 ? '...' : '' }}
        </p>
        <div class="post-meta">
          <span v-if="post.author">{{ post.author }}</span>
          <span v-if="post.createdAt || post.created_at">
            {{ post.createdAt || post.created_at }}
          </span>
        </div>
      </article>
    </div>
  </section>
</template>
