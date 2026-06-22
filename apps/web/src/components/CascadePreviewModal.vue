<script setup lang="ts">
/**
 * Cascade preview modal — shows entity breakdown before bulk delete.
 * Props: counts object + loading state.
 * Emits: confirm / cancel.
 */
import { computed } from "vue";

interface CascadeCounts {
  clients?: number;
  equipment: number;
  maintenanceItems: number;
  attachments: number;
}

const props = defineProps<{
  counts: CascadeCounts;
  loading?: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const breakdown = computed(() => {
  const parts: string[] = [];
  if (props.counts.clients) {
    parts.push(`${props.counts.clients} cliente${props.counts.clients !== 1 ? "s" : ""}`);
  }
  parts.push(`${props.counts.equipment} equipo${props.counts.equipment !== 1 ? "s" : ""}`);
  parts.push(
    `${props.counts.maintenanceItems} mantenció${props.counts.maintenanceItems !== 1 ? "nes" : "n"}`
  );
  parts.push(`${props.counts.attachments} adjunto${props.counts.attachments !== 1 ? "s" : ""}`);
  return parts.join(", ");
});
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      @click.self="emit('cancel')"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 class="text-lg font-bold text-slate-800 mb-1">Vista previa de eliminación</h2>
        <p class="text-sm text-slate-600 mb-4">
          Se eliminarán de forma permanente:
        </p>

        <div v-if="loading" class="flex items-center justify-center py-6">
          <svg class="animate-spin h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
        <p v-else class="text-sm font-medium text-slate-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {{ breakdown }} serán eliminados.
        </p>

        <div class="flex gap-3 mt-5">
          <button
            class="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium
                   text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            :disabled="loading"
            @click="emit('cancel')"
          >
            Cancelar
          </button>
          <button
            class="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-sm font-semibold text-white
                   hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500
                   focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="loading"
            @click="emit('confirm')"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
