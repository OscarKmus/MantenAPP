<script setup lang="ts">
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

defineProps<{
  open: boolean;
}>();

defineEmits<{
  close: [];
}>();

const route = useRoute();
const auth = useAuthStore();

const navItems = [
  {
    name: "Clientes",
    to: "/clients",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    name: "Inventario",
    to: "/inventory",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    name: "Usuarios",
    to: "/admin/users",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM12 7a4 4 0 11-8 0 4 4 0 018 0z",
    adminOnly: true,
  },
];

function isActive(to: string) {
  return route.path.startsWith(to);
}
</script>

<template>
  <!-- Mobile overlay -->
  <div
    v-if="open"
    class="fixed inset-0 bg-black/30 z-30 lg:hidden"
    @click="$emit('close')"
  />

  <!-- Sidebar -->
  <aside
    :class="[
      'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:transform-none shrink-0',
      open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    ]"
  >
    <nav class="flex flex-col h-full pt-4 pb-4">
      <div class="flex-1 px-3 space-y-1">
        <router-link
          v-for="item in navItems.filter((i) => !i.adminOnly || auth.isAdmin)"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive(item.to)
              ? 'bg-primary-50 text-primary-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          ]"
          @click="$emit('close')"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="item.icon" />
          </svg>
          {{ item.name }}
        </router-link>
      </div>
    </nav>
  </aside>
</template>
