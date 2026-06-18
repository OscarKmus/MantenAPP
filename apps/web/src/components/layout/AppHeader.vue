<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

defineEmits<{
  toggleNav: [];
}>();
</script>

<template>
  <header class="bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-3 shrink-0">
    <!-- Mobile menu button -->
    <button
      class="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label="Abrir menú"
      @click="$emit('toggleNav')"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Logo -->
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <span class="font-semibold text-slate-800 text-lg tracking-tight">Mantenti</span>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- User info -->
    <div v-if="auth.user" class="flex items-center gap-3">
      <span class="text-sm text-slate-600 hidden sm:inline">{{ auth.user.fullName }}</span>
      <button
        class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Cerrar sesión"
        @click="auth.logout()"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  </header>
</template>
