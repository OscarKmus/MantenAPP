<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useNotificationStore } from "@/stores/notifications";
import type { Notification } from "@mantenti/types";

const store = useNotificationStore();
const router = useRouter();

onMounted(() => {
  store.fetchNotifications({ pageNum: 1 });
});

function handleClick(notification: Notification) {
  if (!notification.isRead) {
    store.markRead(notification.id);
  }
  if (notification.clientId) {
    router.push({ name: "client-detail", params: { id: notification.clientId } });
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadPage(pageNum: number) {
  store.fetchNotifications({ pageNum });
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Notificaciones</h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ store.unreadCount }} sin leer
        </p>
      </div>
      <button
        v-if="store.unreadCount > 0"
        class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm
               font-medium rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
        @click="store.markAllRead()"
      >
        Marcar todas leídas
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.notifications.length === 0" class="space-y-3">
      <div v-for="i in 5" :key="i" class="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
        <div class="h-4 bg-slate-200 rounded w-3/4 mb-2" />
        <div class="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="store.notifications.length === 0"
      class="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center"
    >
      <svg class="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <p class="text-slate-600 font-medium">Sin notificaciones</p>
      <p class="text-sm text-slate-500 mt-1">
        Las notificaciones de mantenciones próximas aparecerán aquí.
      </p>
    </div>

    <!-- List -->
    <div v-else class="space-y-2">
      <button
        v-for="n in store.notifications"
        :key="n.id"
        class="w-full text-left bg-white rounded-lg border border-slate-200 p-4
               hover:border-slate-300 hover:shadow-sm transition-all"
        :class="{ 'border-l-4 border-l-primary-500': !n.isRead }"
        @click="handleClick(n)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800">{{ n.title }}</p>
            <p class="text-sm text-slate-600 mt-1">{{ n.body }}</p>
            <p class="text-xs text-slate-400 mt-2">{{ formatTime(n.createdAt) }}</p>
          </div>
          <span
            v-if="!n.isRead"
            class="shrink-0 mt-1 w-2.5 h-2.5 rounded-full bg-primary-500"
          />
        </div>
      </button>
    </div>

    <!-- Pagination -->
    <div
      v-if="store.total > store.limit"
      class="flex items-center justify-center gap-4 mt-6"
    >
      <button
        class="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg
               hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="store.page <= 1"
        @click="loadPage(store.page - 1)"
      >
        Anterior
      </button>
      <span class="text-sm text-slate-500">
        Página {{ store.page }} de {{ Math.ceil(store.total / store.limit) }}
      </span>
      <button
        class="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg
               hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="store.page >= Math.ceil(store.total / store.limit)"
        @click="loadPage(store.page + 1)"
      >
        Siguiente
      </button>
    </div>
  </div>
</template>
