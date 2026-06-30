import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/api";
import type { User } from "@mantenti/types";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const checked = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Role helpers
  const role = computed(() => user.value?.role ?? null);
  const isAdmin = computed(() => user.value?.role === "ADMIN");

  /**
   * Check if the current user can edit a resource.
   * ADMIN can edit anything. USER can edit if they are the creator
   * (createdById match) or the assigned technician (technicianId match).
   */
  function canEdit(resource: { createdById?: string | null; technicianId?: string | null }): boolean {
    if (isAdmin.value) return true;
    const userId = user.value?.id;
    if (!userId) return false;
    return resource.createdById === userId || resource.technicianId === userId;
  }

  /**
   * Check if the current user can delete a resource.
   * Only ADMIN can delete. USER can never delete per spec.
   */
  function canDelete(): boolean {
    return isAdmin.value;
  }

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

  return { user, checked, loading, error, role, isAdmin, canEdit, canDelete, login, logout, checkAuth };
});
