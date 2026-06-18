import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginPage.vue"),
      meta: { guest: true },
    },
    {
      path: "/",
      redirect: "/clients",
    },
    {
      path: "/clients",
      name: "clients",
      component: () => import("@/views/ClientsPlaceholder.vue"),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // Try to restore session on first load
  if (!auth.user && !auth.checked) {
    await auth.checkAuth();
  }

  if (to.meta.requiresAuth && !auth.user) {
    return { name: "login" };
  }

  if (to.meta.guest && auth.user) {
    return { name: "clients" };
  }
});

export default router;
