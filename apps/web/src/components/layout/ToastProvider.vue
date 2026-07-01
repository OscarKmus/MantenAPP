<script setup lang="ts">
/**
 * Toast provider — renders toast stack at bottom-right.
 * Mount at app root; use useToast() in children to trigger.
 */
import { provideToast } from "@/composables/useToast";
import type { Toast } from "@/composables/useToast";

const { toasts, dismiss } = provideToast();

const typeStyles: Record<string, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-blue-600 text-white",
};

const typeIcons: Record<string, string> = {
  success: "M5 13l4 4L19 7",
  error: "M6 18L18 6M6 6l12 12",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};
</script>

<template>
  <div>
    <slot />
    <!-- Toast stack -->
    <Teleport to="body">
      <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <TransitionGroup name="toast">
          <div
            v-for="toast in toasts"
            :key="toast.id"
            :class="[
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm',
              typeStyles[toast.type],
            ]"
          >
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="typeIcons[toast.type]" />
            </svg>
            <span class="flex-1">{{ toast.message }}</span>
            <button
              class="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
              @click="dismiss(toast.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
