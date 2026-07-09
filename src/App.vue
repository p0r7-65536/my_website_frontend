<script setup>
import { ref, watchEffect } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

const isDark = ref(localStorage.getItem('theme') === 'dark')

watchEffect(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
})
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <nav class="nav container" aria-label="主导航">
        <RouterLink class="brand" to="/">D1smas的投资日记</RouterLink>
        <div class="nav-actions">
          <RouterLink to="/">首页</RouterLink>
          <RouterLink to="/about">关于</RouterLink>
          <button class="theme-toggle" type="button" @click="isDark = !isDark">
            {{ isDark ? '浅色' : '深色' }}
          </button>
        </div>
      </nav>
    </header>

    <main class="container main-content">
      <RouterView />
    </main>
  </div>
</template>
