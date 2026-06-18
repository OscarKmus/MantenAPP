<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();

const username = ref("");
const password = ref("");
const usernameError = ref<string | null>(null);
const passwordError = ref<string | null>(null);

function validate(): boolean {
  usernameError.value = null;
  passwordError.value = null;

  if (!username.value.trim()) {
    usernameError.value = "El usuario es requerido";
  }
  if (!password.value) {
    passwordError.value = "La contraseña es requerida";
  }

  return !usernameError.value && !passwordError.value;
}

async function handleSubmit() {
  if (!validate()) return;

  try {
    await auth.login(username.value, password.value);
    router.push({ name: "clients" });
  } catch {
    // Error is handled by the store
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary-600/20">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-800">Mantenti</h1>
        <p class="text-sm text-slate-500 mt-1">Gestión de mantenimiento IT</p>
      </div>

      <!-- Form -->
      <form
        class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5"
        @submit.prevent="handleSubmit"
      >
        <!-- Global error -->
        <div
          v-if="auth.error"
          class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
          role="alert"
        >
          {{ auth.error }}
        </div>

        <!-- Username -->
        <div>
          <label for="username" class="block text-sm font-medium text-slate-700 mb-1.5">
            Usuario
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            :class="[
              'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              usernameError
                ? 'border-red-300 text-red-900 placeholder-red-300'
                : 'border-slate-300 text-slate-900 placeholder-slate-400',
            ]"
            placeholder="Tu usuario"
            @input="usernameError = null"
          />
          <p v-if="usernameError" class="mt-1.5 text-xs text-red-600">{{ usernameError }}</p>
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-slate-700 mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            :class="[
              'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              passwordError
                ? 'border-red-300 text-red-900 placeholder-red-300'
                : 'border-slate-300 text-slate-900 placeholder-slate-400',
            ]"
            placeholder="Tu contraseña"
            @input="passwordError = null"
          />
          <p v-if="passwordError" class="mt-1.5 text-xs text-red-600">{{ passwordError }}</p>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="auth.loading"
          :class="[
            'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all',
            'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ]"
        >
          <svg
            v-if="auth.loading"
            class="animate-spin w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ auth.loading ? "Ingresando..." : "Iniciar sesión" }}
        </button>
      </form>
    </div>
  </div>
</template>
