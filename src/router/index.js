import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PostDetailView from '../views/PostDetailView.vue'
import AboutView from '../views/AboutView.vue'
import MiniGames from "../views/MiniGames.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/post/:id',
      name: 'post-detail',
      component: PostDetailView,
      props: true,
    },
    {
      path: '/games',
      name: 'games',
      component: MiniGames,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
  ],
})

export default router
