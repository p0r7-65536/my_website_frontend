<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getPostById } from '../api/posts'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const post = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await getPostById(props.id)
    post.value = data
  } catch (err) {
    error.value = err?.response?.data?.message || '文章加载失败，请稍后再试。'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="page">
    <RouterLink class="back-link" to="/">返回首页</RouterLink>

    <div v-if="loading" class="state">正在加载文章...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <article v-else-if="post" class="post-detail">
      <p class="eyebrow">Article</p>
      <h1>{{ post.title || '未命名文章' }}</h1>
      <div class="post-meta detail-meta">
        <span v-if="post.author">{{ post.author }}</span>
        <span v-if="post.createdAt || post.created_at">
          {{ post.createdAt || post.created_at }}
        </span>
      </div>
      <div class="post-content">
        {{ post.content || post.body || '这篇文章还没有内容。' }}
      </div>
    </article>
  </section>
</template>
