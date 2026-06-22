<script setup lang="ts">
/**
 * Admin password modal.
 * Calls POST /api/admin/verify; emits success(token) or cancel.
 */
import { ref } from "vue";

const emit = defineEmits<{
  success: [token: string];
  cancel: [];
}>();

const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleSubmit() {
  if (!password.value.trim()) return;

  loading.value = true;
  error.value = "";

  try {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password.value }),
    });

    if (res.ok) {
      const data = await res.json();
      emit("success", data.token);
      password.value = "";
      return;
    }

    if (res.status === 401) {
      error.value = "Contraseña incorrecta";
    } else if (res.status === 429) {
      error.value = "Demasiados intentos. Intentá más tarde.";
    } else {
      error.value = "Error del servidor";
    }

    password.value = "";
  } catch {
    error.value = "Error de conexión";
    password.value = "";
  } finally {
    loading.value = false;
  }
}

function handleCancel() {
  password.value = "";
  error.value = "";
  emit("cancel");
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      @click.self="handleCancel"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 class="text-lg font-bold text-slate-800 mb-1">Verificación de administrador</h2>
        <p class="text-sm text-slate-500 mb-4">
          Ingresá la contraseña de administrador para continuar.
        </p>

        <form @submit.prevent="handleSubmit">
          <input
            v-model="password"
            type="password"
            placeholder="Contraseña"
            autocomplete="off"
            class="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                   disabled:bg-slate-100 disabled:cursor-not-allowed"
            :disabled="loading"
          />

          <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>

          <div class="flex gap-3 mt-4">
            <button
              type="button"
              class="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium
                     text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="loading"
              @click="handleCancel"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-sm font-semibold text-white
                     hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500
                     focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="loading || !password.trim()"
            >
              <span v-if="loading">Verificando...</span>
              <span v-else>Confirmar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
