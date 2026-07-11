<script setup>
import { RouterView } from 'vue-router'
import AppHeader from './AppHeader.vue'
</script>

<template>
  <div class="simple-layout">
    <AppHeader />
    <main class="simple-main container">
      <RouterView />
    </main>
  </div>
</template>
