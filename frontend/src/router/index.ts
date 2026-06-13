import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: () => import('../pages/login/login.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      component: () => import('../pages/register/register.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../pages/home/home.vue'),
    },
    {
      path: '/skill-trees',
      component: () => import('../pages/skill-trees/skill-trees.vue'),
    },
    {
      path: '/skill-trees/:id',
      component: () => import('../pages/skill-trees/skill-tree-detail/skill-tree-detail.vue'),
    },
    {
      path: '/evaluation',
      component: () => import('../pages/evaluation/evaluation.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return { path: '/login' }
  if (to.meta.public && auth.isAuthenticated) return { path: '/' }
})

export default router
