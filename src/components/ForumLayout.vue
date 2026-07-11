<script setup>
import { RouterView } from 'vue-router'
import AppHeader from './AppHeader.vue'
import BoardSidebar from './BoardSidebar.vue'
</script>

<template>
  <div class="forum-layout">
    <AppHeader />
    <div class="forum-body container">
      <BoardSidebar />
      <main class="forum-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>
