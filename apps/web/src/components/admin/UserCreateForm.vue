<script setup lang="ts">
import { ref } from "vue";
import type { UserRole } from "@mantenti/types";
import { useUsersStore } from "@/stores/users";

const emit = defineEmits<{
  created: [];
}>();

const props = defineProps<{
  loading?: boolean;
}>();

const usersStore = useUsersStore();

const form = ref({
  username: "",
  password: "",
  fullName: "",
  role: "USER" as UserRole,
});

const errors = ref<Record<string, string>>({});

function validate(): boolean {
  errors.value = {};

  if (!form.value.username.trim()) {
    errors.value.username = "El nombre de usuario es requerido";
  } else if (form.value.username.trim().length < 3) {
    errors.value.username = "Mínimo 3 caracteres";
  }

  if (!form.value.password) {
    errors.value.password = "La contraseña es requerida";
  } else if (form.value.password.length < 6) {
    errors.value.password = "Mínimo 6 caracteres";
  }

  if (!form.value.fullName.trim()) {
    errors.value.fullName = "El nombre completo es requerido";
  }

  return Object.keys(errors.value).length === 0;
}

async function handleSubmit() {
  if (!validate()) return;

  try {
    await usersStore.createUser({
      username: form.value.username.trim(),
      password: form.value.password,
      fullName: form.value.fullName.trim(),
      role: form.value.role,
    });

    // Reset form
    form.value = { username: "", password: "", fullName: "", role: "USER" };
    errors.value = {};
    emit("created");
  } catch {
    // Error is handled by the store
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <h3 class="text-lg font-semibold text-slate-800">Crear usuario</h3>

    <!-- Username -->
    <div>
      <label for="new-username" class="block text-sm font-medium text-slate-700 mb-1">
        Nombre de usuario <span class="text-red-500">*</span>
      </label>
      <input
        id="new-username"
        v-model="form.username"
        type="text"
        :class="[
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          errors.username ? 'border-red-300' : 'border-slate-300',
        ]"
        placeholder="ej: tech1"
      />
      <p v-if="errors.username" class="mt-1 text-xs text-red-600">{{ errors.username }}</p>
    </div>

    <!-- Full Name -->
    <div>
      <label for="new-fullname" class="block text-sm font-medium text-slate-700 mb-1">
        Nombre completo <span class="text-red-500">*</span>
      </label>
      <input
        id="new-fullname"
        v-model="form.fullName"
        type="text"
        :class="[
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          errors.fullName ? 'border-red-300' : 'border-slate-300',
        ]"
        placeholder="ej: Juan Pérez"
      />
      <p v-if="errors.fullName" class="mt-1 text-xs text-red-600">{{ errors.fullName }}</p>
    </div>

    <!-- Password -->
    <div>
      <label for="new-password" class="block text-sm font-medium text-slate-700 mb-1">
        Contraseña <span class="text-red-500">*</span>
      </label>
      <input
        id="new-password"
        v-model="form.password"
        type="password"
        :class="[
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          errors.password ? 'border-red-300' : 'border-slate-300',
        ]"
        placeholder="Mínimo 6 caracteres"
      />
      <p v-if="errors.password" class="mt-1 text-xs text-red-600">{{ errors.password }}</p>
    </div>

    <!-- Role -->
    <div>
      <label for="new-role" class="block text-sm font-medium text-slate-700 mb-1">
        Rol
      </label>
      <select
        id="new-role"
        v-model="form.role"
        class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="USER">Técnico</option>
        <option value="ADMIN">Administrador</option>
      </select>
    </div>

    <!-- Submit -->
    <button
      type="submit"
      :disabled="loading"
      class="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-sm font-semibold text-white
             hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
             disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      <svg
        v-if="loading"
        class="animate-spin w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      Crear usuario
    </button>
  </form>
</template>
