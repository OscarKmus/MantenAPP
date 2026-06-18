<script setup lang="ts">
import AppHeader from "./components/layout/AppHeader.vue";
import AppNav from "./components/layout/AppNav.vue";
import { useAuthStore } from "./stores/auth";
import { ref } from "vue";

const auth = useAuthStore();
const sidebarOpen = ref(false);
</script>

<template>
  <div v-if="!auth.user" class="min-h-dvh">
    <router-view />
  </div>
  <div v-else class="min-h-dvh flex flex-col">
    <AppHeader @toggle-nav="sidebarOpen = !sidebarOpen" />
    <div class="flex flex-1 overflow-hidden">
      <AppNav :open="sidebarOpen" @close="sidebarOpen = false" />
      <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <router-view />
      </main>
    </div>
  </div>
</template>
