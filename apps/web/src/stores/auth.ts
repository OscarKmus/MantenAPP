import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/lib/api";
import type { User } from "@mantenti/types";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const checked = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post<{ user: User }>("/auth/login", {
        username,
        password,
      });
      user.value = data.user;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Login failed";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      user.value = null;
    }
  }

  async function checkAuth() {
    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      user.value = data.user;
    } catch {
      user.value = null;
    } finally {
      checked.value = true;
    }
  }

  return { user, checked, loading, error, login, logout, checkAuth };
});
