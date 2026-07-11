<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getErrorMessage } from '../api/http'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')

async function handleSubmit() {
  submitting.value = true
  error.value = ''
  try {
    await userStore.login({
      username: username.value.trim(),
      password: password.value,
    })
    const redirect = route.query.redirect || '/'
    router.push(String(redirect))
  } catch (err) {
    error.value = getErrorMessage(err, '登录失败，请检查用户名和密码')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card">
      <h1>登录</h1>
      <p class="auth-desc">欢迎回来，登录后即可发帖和回复</p>

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
          密码
          <input
            v-model="password"
            class="input"
            type="password"
            placeholder="输入密码"
            autocomplete="current-password"
            required
          />
        </label>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="btn btn-primary btn-block" type="submit" :disabled="submitting">
          {{ submitting ? '登录中...' : '登录' }}
        </button>
      </form>

      <p class="auth-footer">
        还没有账号？
        <RouterLink to="/register">立即注册</RouterLink>
      </p>
    </div>
  </section>
</template>
