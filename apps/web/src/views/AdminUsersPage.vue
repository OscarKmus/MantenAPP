<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useUsersStore } from "@/stores/users";
import { useAuthStore } from "@/stores/auth";
import UserList from "@/components/admin/UserList.vue";
import UserCreateForm from "@/components/admin/UserCreateForm.vue";
import type { UserRole } from "@mantenti/types";

const usersStore = useUsersStore();
const auth = useAuthStore();

const error = ref<string | null>(null);

onMounted(async () => {
  await loadUsers();
});

async function loadUsers() {
  error.value = null;
  try {
    await usersStore.fetchUsers();
  } catch {
    // Error is in the store
  }
}

async function handleRoleChange(userId: string, role: UserRole) {
  error.value = null;
  try {
    await usersStore.updateUserRole(userId, role);
  } catch (err: any) {
    const code = err.response?.data?.error?.code;
    const message = err.response?.data?.error?.message || err.response?.data?.error || "Error al cambiar rol";
    if (code === "LAST_ADMIN") {
      error.value = "No se puede cambiar el rol del último administrador";
    } else {
      error.value = message;
    }
  }
}

async function handleDelete(userId: string) {
  error.value = null;
  try {
    await usersStore.deleteUser(userId);
  } catch (err: any) {
    const code = err.response?.data?.error?.code;
    const message = err.response?.data?.error?.message || err.response?.data?.error || "Error al eliminar usuario";
    if (code === "LAST_ADMIN") {
      error.value = "No se puede eliminar al último administrador";
    } else {
      error.value = message;
    }
  }
}

function handleCreated() {
  // Store already adds the user to the list
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Gestión de usuarios</h1>
      <p class="text-sm text-slate-500 mt-1">Administra los usuarios y sus roles en el sistema</p>
    </div>

    <!-- Error banner -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between"
    >
      <p class="text-red-700 text-sm font-medium">{{ error }}</p>
      <button
        class="text-red-400 hover:text-red-600"
        @click="error = null"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- User list (2/3) -->
      <div class="lg:col-span-2">
        <div class="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-slate-700">
              Usuarios ({{ usersStore.users.length }})
            </h2>
            <button
              class="text-sm text-primary-600 hover:text-primary-700 font-medium"
              @click="loadUsers"
            >
              Actualizar
            </button>
          </div>

          <!-- Loading -->
          <div v-if="usersStore.loading && usersStore.users.length === 0" class="space-y-2">
            <div v-for="i in 3" :key="i" class="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
              <div class="h-5 bg-slate-200 rounded w-1/3 mb-2" />
              <div class="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          </div>

          <UserList
            v-else
            :users="usersStore.users"
            :current-user-id="auth.user?.id"
            @role-change="handleRoleChange"
            @delete="handleDelete"
          />
        </div>
      </div>

      <!-- Create form (1/3) -->
      <div>
        <div class="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <UserCreateForm
            :loading="usersStore.loading"
            @created="handleCreated"
          />
        </div>
      </div>
    </div>
  </div>
</template>
