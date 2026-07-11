<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getErrorMessage } from '../api/http'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const email = ref('')
const submitting = ref(false)
const error = ref('')

async function handleSubmit() {
  submitting.value = true
  error.value = ''
  try {
    await userStore.register({
      username: username.value.trim(),
      password: password.value,
      email: email.value.trim(),
    })
    router.push({ name: 'login', query: { registered: '1' } })
  } catch (err) {
    error.value = getErrorMessage(err, '注册失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card">
      <h1>注册</h1>
      <p class="auth-desc">创建账号，加入社区讨论</p>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label class="form-label">
          用户名
          <input
            v-model="username"
            class="input"
            type="text"
            placeholder="输入用户名"
            autocomplete="username"
            required
          />
        </label>

        <label class="form-label">
          邮箱
          <input
            v-model="email"
            class="input"
            type="email"
            placeholder="输入邮箱"
            autocomplete="email"
            required
          />
        </label>

        <label class="form-label">
          密码
          <input
            v-model="password"
            class="input"
            type="password"
            placeholder="输入密码"
            autocomplete="new-password"
            required
          />
        </label>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="btn btn-primary btn-block" type="submit" :disabled="submitting">
          {{ submitting ? '注册中...' : '注册' }}
        </button>
      </form>

      <p class="auth-footer">
        已有账号？
        <RouterLink to="/login">去登录</RouterLink>
      </p>
    </div>
  </section>
</template>
