<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const menuOpen = ref(false)
const searchQuery = ref('')

onMounted(() => {
  if (router.currentRoute.value.query.q) {
    searchQuery.value = String(router.currentRoute.value.query.q)
  }
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function handleSearch() {
  const q = searchQuery.value.trim()
  router.push({ name: 'home', query: q ? { q } : {} })
}

function logout() {
  userStore.logout()
  closeMenu()
  router.push({ name: 'home' })
}

function onClickOutside(event) {
  if (!event.target.closest('.user-menu')) {
    closeMenu()
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink class="brand" to="/">
        <span class="brand-icon">◆</span>
        <span class="brand-text">社区论坛</span>
      </RouterLink>

      <form class="search-form" @submit.prevent="handleSearch">
        <input
          v-model="searchQuery"
          class="search-input"
          type="search"
          placeholder="搜索帖子..."
          aria-label="搜索帖子"
        />
        <button class="search-btn" type="submit">搜索</button>
      </form>

      <div class="header-actions">
        <RouterLink
          v-if="userStore.isLoggedIn"
          class="btn btn-primary btn-sm"
          to="/post/create"
        >
          发帖
        </RouterLink>

        <template v-if="userStore.isLoggedIn">
          <div class="user-menu">
            <button class="user-trigger" type="button" @click.stop="toggleMenu">
              <span class="avatar">{{ userStore.username.charAt(0).toUpperCase() }}</span>
              <span class="username">{{ userStore.username }}</span>
              <span class="chevron">▾</span>
            </button>
            <div v-if="menuOpen" class="dropdown">
              <RouterLink class="dropdown-item" to="/profile" @click="closeMenu">个人中心</RouterLink>
              <RouterLink class="dropdown-item" to="/game" @click="closeMenu">文字对战陀螺</RouterLink>
              <button class="dropdown-item" type="button" @click="logout">退出登录</button>
            </div>
          </div>
        </template>
        <template v-else>
          <RouterLink class="btn btn-ghost btn-sm" to="/login">登录</RouterLink>
          <RouterLink class="btn btn-primary btn-sm" to="/register">注册</RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>
