<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getPostById, updatePost, deletePost } from '../api/posts'
import { getReplies, createReply, deleteReply } from '../api/replies'
import { getErrorMessage } from '../api/http'
import { useUserStore } from '../stores/user'
import { formatDate } from '../utils/format'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const post = ref(null)
const replies = ref([])
const loading = ref(true)
const error = ref('')
const replyContent = ref('')
const replySubmitting = ref(false)
const replyError = ref('')

const editing = ref(false)
const editTitle = ref('')
const editContent = ref('')
const editSubmitting = ref(false)
const editError = ref('')

async function loadPost() {
  loading.value = true
  error.value = ''
  try {
    post.value = await getPostById(props.id)
    const replyData = await getReplies(props.id, { page: 0, size: 100 })
    replies.value = replyData.content || []
  } catch (err) {
    error.value = getErrorMessage(err, '帖子加载失败')
  } finally {
    loading.value = false
  }
}

async function submitReply() {
  if (!userStore.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  const content = replyContent.value.trim()
  if (!content) return

  replySubmitting.value = true
  replyError.value = ''
  try {
    await createReply(props.id, { content })
    replyContent.value = ''
    const replyData = await getReplies(props.id, { page: 0, size: 100 })
    replies.value = replyData.content || []
  } catch (err) {
    replyError.value = getErrorMessage(err, '回复失败')
  } finally {
    replySubmitting.value = false
  }
}

function startEdit() {
  editTitle.value = post.value.title
  editContent.value = post.value.content
  editing.value = true
  editError.value = ''
}

function cancelEdit() {
  editing.value = false
}

async function saveEdit() {
  editSubmitting.value = true
  editError.value = ''
  try {
    post.value = await updatePost(props.id, {
      title: editTitle.value.trim(),
      content: editContent.value.trim(),
    })
    editing.value = false
  } catch (err) {
    editError.value = getErrorMessage(err, '保存失败')
  } finally {
    editSubmitting.value = false
  }
}

async function handleDeletePost() {
  if (!confirm('确定要删除这篇帖子吗？')) return
  try {
    await deletePost(props.id)
    router.push({ name: 'home' })
  } catch (err) {
    alert(getErrorMessage(err, '删除失败'))
  }
}

async function handleDeleteReply(replyId) {
  if (!confirm('确定要删除这条回复吗？')) return
  try {
    await deleteReply(replyId)
    const replyData = await getReplies(props.id, { page: 0, size: 100 })
    replies.value = replyData.content || []
  } catch (err) {
    alert(getErrorMessage(err, '删除失败'))
  }
}

onMounted(loadPost)
</script>

<template>
  <section class="page">
    <RouterLink class="back-link" to="/">← 返回列表</RouterLink>

    <div v-if="loading" class="state">正在加载帖子...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>

    <template v-else-if="post">
      <article class="post-detail">
        <div class="post-detail-header">
          <span v-if="post.boardName" class="board-tag">{{ post.boardName }}</span>
          <h1 v-if="!editing">{{ post.title }}</h1>
          <div v-else class="edit-form">
            <input v-model="editTitle" class="input" type="text" placeholder="标题" />
            <textarea v-model="editContent" class="textarea" rows="8" placeholder="内容" />
            <p v-if="editError" class="form-error">{{ editError }}</p>
            <div class="form-actions">
              <button class="btn btn-primary btn-sm" :disabled="editSubmitting" @click="saveEdit">
                {{ editSubmitting ? '保存中...' : '保存' }}
              </button>
              <button class="btn btn-ghost btn-sm" @click="cancelEdit">取消</button>
            </div>
          </div>
        </div>

        <div class="post-meta detail-meta">
          <span>{{ post.username }}</span>
          <span class="meta-dot">·</span>
          <span>{{ formatDate(post.createdAt) }}</span>
          <span v-if="post.viewCount != null">
            <span class="meta-dot">·</span>
            {{ post.viewCount }} 浏览
          </span>
        </div>

        <div v-if="!editing" class="post-content">{{ post.content }}</div>

        <div v-if="userStore.canManagePost(post)" class="post-actions">
          <button class="btn btn-ghost btn-sm" @click="startEdit">编辑</button>
          <button class="btn btn-danger btn-sm" @click="handleDeletePost">删除</button>
        </div>
      </article>

      <section class="replies-section">
        <h2 class="replies-title">{{ replies.length }} 条回复</h2>

        <div v-if="replies.length === 0" class="state state-sm">暂无回复，来抢沙发吧</div>

        <div v-else class="reply-list">
          <article v-for="(reply, index) in replies" :key="reply.id" class="reply-card">
            <div class="reply-header">
              <span class="reply-floor">#{{ index + 1 }}</span>
              <span class="reply-author">{{ reply.username }}</span>
              <span class="reply-time">{{ formatDate(reply.createdAt) }}</span>
              <div v-if="userStore.canManageReply(reply)" class="reply-actions">
                <button class="btn-text danger" @click="handleDeleteReply(reply.id)">删除</button>
              </div>
            </div>
            <div class="reply-content">{{ reply.content }}</div>
          </article>
        </div>

        <div class="reply-form">
          <h3>发表回复</h3>
          <template v-if="userStore.isLoggedIn">
            <textarea
              v-model="replyContent"
              class="textarea"
              rows="4"
              placeholder="写下你的想法..."
            />
            <p v-if="replyError" class="form-error">{{ replyError }}</p>
            <button
              class="btn btn-primary"
              :disabled="replySubmitting || !replyContent.trim()"
              @click="submitReply"
            >
              {{ replySubmitting ? '发送中...' : '发送回复' }}
            </button>
          </template>
          <p v-else class="login-hint">
            <RouterLink to="/login">登录</RouterLink> 后即可回复
          </p>
        </div>
      </section>
    </template>
  </section>
</template>
