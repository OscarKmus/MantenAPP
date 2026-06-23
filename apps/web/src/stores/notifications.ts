import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/lib/api";
import type { Notification } from "@mantenti/types";

export const useNotificationStore = defineStore("notifications", () => {
  const notifications = ref<Notification[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const page = ref(1);
  const total = ref(0);
  const limit = 20;

  async function fetchNotifications(params?: { unreadOnly?: boolean; pageNum?: number }) {
    loading.value = true;
    try {
      const { data } = await api.get<{
        notifications: Notification[];
        unreadCount: number;
        total: number;
        page: number;
        limit: number;
      }>("/notifications", {
        params: {
          ...(params?.unreadOnly ? { unreadOnly: "true" } : {}),
          page: params?.pageNum ?? page.value,
          limit,
        },
      });
      notifications.value = data.notifications;
      unreadCount.value = data.unreadCount;
      total.value = data.total;
      page.value = data.page;
    } catch {
      // Silent fail — bell will retry on next poll
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount() {
    try {
      const { data } = await api.get<{ unreadCount: number }>("/notifications", {
        params: { unreadOnly: "true", limit: 1 },
      });
      unreadCount.value = data.unreadCount;
    } catch {
      // Silent fail
    }
  }

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      const idx = notifications.value.findIndex((n) => n.id === id);
      if (idx !== -1 && !notifications.value[idx].isRead) {
        notifications.value[idx].isRead = true;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch {
      // Silent fail
    }
  }

  async function markAllRead() {
    try {
      await api.post("/notifications/read-all");
      notifications.value.forEach((n) => {
        n.isRead = true;
      });
      unreadCount.value = 0;
    } catch {
      // Silent fail
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    page,
    total,
    limit,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
  };
});
