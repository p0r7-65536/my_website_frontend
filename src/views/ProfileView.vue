<script setup>
import { useUserStore } from '../stores/user'
import { formatDate } from '../utils/format'

const userStore = useUserStore()
const user = userStore.user

const roleLabels = {
  USER: '普通用户',
  ADMIN: '管理员',
  SUPER_ADMIN: '超级管理员',
}
</script>

<template>
  <section class="page">
    <div class="page-header">
      <h1>个人中心</h1>
      <p class="page-desc">查看和管理你的账号信息</p>
    </div>

    <div v-if="user" class="profile-card">
      <div class="profile-avatar">{{ user.username.charAt(0).toUpperCase() }}</div>
      <div class="profile-info">
        <div class="profile-row">
          <span class="profile-label">用户名</span>
          <span class="profile-value">{{ user.username }}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">邮箱</span>
          <span class="profile-value">{{ user.email || '未设置' }}</span>
        </div>
        <div class="profile-row">
          <span class="profile-label">角色</span>
          <span class="profile-value">
            <span class="role-badge" :class="user.role?.toLowerCase()">
              {{ roleLabels[user.role] || user.role }}
            </span>
          </span>
        </div>
        <div class="profile-row">
          <span class="profile-label">注册时间</span>
          <span class="profile-value">{{ formatDate(user.createdAt) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
