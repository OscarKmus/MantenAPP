<script setup lang="ts">
import { computed } from "vue";
import type { User, UserRole } from "@mantenti/types";

const props = defineProps<{
  users: User[];
  currentUserId?: string;
}>();

const emit = defineEmits<{
  "role-change": [id: string, role: UserRole];
  delete: [id: string];
}>();

const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Técnico",
  ADMIN: "Administrador",
};

const ROLE_COLORS: Record<UserRole, string> = {
  USER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-purple-100 text-purple-700",
};

function handleRoleChange(userId: string, event: Event) {
  const select = event.target as HTMLSelectElement;
  const newRole = select.value as UserRole;
  emit("role-change", userId, newRole);
}

function handleDelete(userId: string, username: string) {
  if (confirm(`¿Eliminar al usuario "${username}"?\n\nEsta acción no se puede deshacer.`)) {
    emit("delete", userId);
  }
}

function isSelf(userId: string): boolean {
  return userId === props.currentUserId;
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="user in users"
      :key="user.id"
      class="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3"
    >
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="font-medium text-slate-800">{{ user.username }}</span>
          <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', ROLE_COLORS[user.role]]">
            {{ ROLE_LABELS[user.role] || user.role }}
          </span>
          <span v-if="isSelf(user.id)" class="text-xs text-slate-400">(vos)</span>
        </div>
        <p class="text-sm text-slate-500">{{ user.fullName }}</p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <!-- Role change dropdown -->
        <select
          :value="user.role"
          class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500"
          @change="handleRoleChange(user.id, $event)"
        >
          <option value="USER">Técnico</option>
          <option value="ADMIN">Administrador</option>
        </select>

        <!-- Delete button -->
        <button
          class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          title="Eliminar usuario"
          @click="handleDelete(user.id, user.username)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <p v-if="users.length === 0" class="text-sm text-slate-500 text-center py-8">
      No hay usuarios registrados
    </p>
  </div>
</template>
