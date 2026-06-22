<script setup lang="ts">
/**
 * Floating bottom bar for bulk actions.
 * Shows selection count and delete button.
 */
defineProps<{
  count: number;
  label: string;
}>();

const emit = defineEmits<{
  delete: [];
  clear: [];
}>();
</script>

<template>
  <Transition name="bar">
    <div
      v-if="count > 0"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3
             bg-white border border-slate-200 shadow-xl rounded-xl px-5 py-3"
    >
      <span class="text-sm font-medium text-slate-700">
        {{ count }} seleccionado{{ count !== 1 ? "s" : "" }}
      </span>
      <button
        class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold
               rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500
               focus:ring-offset-2 transition-colors"
        @click="emit('delete')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Borrar {{ count }} {{ label }}
      </button>
      <button
        class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100
               focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
        title="Limpiar selección"
        @click="emit('clear')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.bar-enter-active,
.bar-leave-active {
  transition: all 0.25s ease;
}
.bar-enter-from,
.bar-leave-to {
  opacity: 0;
  transform: translate(-50%, 100%);
}
</style>
