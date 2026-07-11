import { createRouter, createWebHashHistory } from 'vue-router'
import ForumLayout from '../components/ForumLayout.vue'
import SimpleLayout from '../components/SimpleLayout.vue'
import HomeView from '../views/HomeView.vue'
import BoardView from '../views/BoardView.vue'
import PostDetailView from '../views/PostDetailView.vue'
import CreatePostView from '../views/CreatePostView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ProfileView from '../views/ProfileView.vue'
import MiniGames from '../views/MiniGames.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: ForumLayout,
      children: [
        { path: '', name: 'home', component: HomeView },
        { path: 'board/:id', name: 'board', component: BoardView },
        {
          path: 'post/:id',
          name: 'post-detail',
          component: PostDetailView,
          props: true,
        },
        {
          path: 'profile',
          name: 'profile',
          component: ProfileView,
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: '/post/create',
      component: SimpleLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'post-create', component: CreatePostView },
      ],
    },
    {
      path: '/game',
      component: SimpleLayout,
      children: [
        { path: '', name: 'game', component: MiniGames },
      ],
    },
    {
      path: '/games',
      redirect: '/game',
    },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
  ],
})

router.beforeEach(async (to) => {
  const { useUserStore } = await import('../stores/user')
  const userStore = useUserStore()

  if (!userStore.initialized) {
    await userStore.init()
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  if (requiresAuth && !userStore.isLoggedIn) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }
})

export default router
