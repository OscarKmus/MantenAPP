<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useNotificationStore } from "@/stores/notifications";
import type { Notification } from "@mantenti/types";

const store = useNotificationStore();
const router = useRouter();
const isOpen = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

function toggleDrawer() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    store.fetchNotifications({ pageNum: 1 });
  }
}

function closeDrawer() {
  isOpen.value = false;
}

async function handleClickNotification(notification: Notification) {
  if (!notification.isRead) {
    await store.markRead(notification.id);
  }
  if (notification.clientId) {
    router.push({ name: "client-detail", params: { id: notification.clientId } });
  }
  closeDrawer();
}

async function handleMarkAllRead() {
  await store.markAllRead();
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString("es", { day: "numeric", month: "short" });
}

onMounted(() => {
  store.fetchUnreadCount();
  // Poll every 60 seconds
  pollTimer = setInterval(() => {
    store.fetchUnreadCount();
  }, 60000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <div class="relative">
    <!-- Bell button -->
    <button
      class="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100
             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
      aria-label="Notificaciones"
      @click="toggleDrawer"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <!-- Badge -->
      <span
        v-if="store.unreadCount > 0"
        :aria-label="`${store.unreadCount} notificaciones no leídas`"
        role="status"
        class="absolute -top-0.5 -right-0.5 flex items-center justify-center
               min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white
               bg-red-500 rounded-full"
      >
        {{ store.unreadCount > 99 ? "99+" : store.unreadCount }}
      </span>
    </button>

    <!-- Overlay -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="closeDrawer"
    />

    <!-- Drawer -->
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:duration-0"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in motion-reduce:duration-0"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-full mt-2 z-50 w-80 max-h-96 bg-white
               rounded-xl shadow-lg border border-slate-200 overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 class="text-sm font-semibold text-slate-800">Notificaciones</h3>
          <button
            v-if="store.unreadCount > 0"
            class="text-xs text-primary-600 hover:text-primary-700 font-medium"
            @click="handleMarkAllRead"
          >
            Marcar todas leídas
          </button>
        </div>

        <!-- Loading -->
        <div v-if="store.loading && store.notifications.length === 0" class="p-4 space-y-3">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div class="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        </div>

        <!-- Empty -->
        <div
          v-else-if="store.notifications.length === 0"
          class="p-8 text-center"
        >
          <svg class="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p class="text-sm text-slate-500">Sin notificaciones</p>
        </div>

        <!-- List -->
        <ul v-else role="list" class="overflow-y-auto max-h-72 list-none p-0 m-0">
          <li
            v-for="n in store.notifications"
            :key="n.id"
            role="listitem"
          >
          <button
            class="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors
                   border-b border-slate-50 last:border-0"
            :class="{ 'bg-primary-50/50': !n.isRead }"
            @click="handleClickNotification(n)"
          >
            <div class="flex items-start gap-3">
              <div
                class="mt-1.5 w-2 h-2 rounded-full shrink-0"
                :class="n.isRead ? 'bg-transparent' : 'bg-primary-500'"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800 truncate">{{ n.title }}</p>
                <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ n.body }}</p>
                <p class="text-[10px] text-slate-400 mt-1">{{ formatTime(n.createdAt) }}</p>
              </div>
            </div>
          </button>
          </li>
        </ul>

        <!-- Footer -->
        <div class="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          <button
            class="w-full text-center text-xs text-primary-600 hover:text-primary-700 font-medium"
            @click="router.push({ name: 'notifications' }); closeDrawer()"
          >
            Ver todas
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
