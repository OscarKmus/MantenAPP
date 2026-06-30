import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/lib/api";
import type { User } from "@mantenti/types";

export const useUsersStore = defineStore("users", () => {
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchUsers() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<{ users: User[] }>("/users");
      users.value = data.users;
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.error || "Error al cargar usuarios";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(data: { username: string; password: string; fullName: string; role?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.post<{ user: User }>("/users", data);
      users.value.push(response.data.user);
      return response.data.user;
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.error || "Error al crear usuario";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateUserRole(id: string, role: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch<{ user: User }>(`/users/${id}/role`, { role });
      const idx = users.value.findIndex((u) => u.id === id);
      if (idx !== -1) {
        users.value[idx] = data.user;
      }
      return data.user;
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.error || "Error al cambiar rol";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteUser(id: string) {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/users/${id}`);
      users.value = users.value.filter((u) => u.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.response?.data?.error || "Error al eliminar usuario";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return { users, loading, error, fetchUsers, createUser, updateUserRole, deleteUser };
});
