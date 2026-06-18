<script setup lang="ts">
import { computed } from "vue";
import type { Client } from "@mantenti/types";

interface ClientWithMeta extends Client {
  equipmentCount: number;
}

const props = defineProps<{
  client: ClientWithMeta;
}>();

const emit = defineEmits<{
  click: [];
}>();

const nextMaintenanceLabel = computed(() => {
  if (!props.client.nextMaintenanceAt) return null;
  const date = new Date(props.client.nextMaintenanceAt);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: "Vencida", color: "text-red-600 bg-red-50" };
  if (diffDays === 0) return { text: "Hoy", color: "text-amber-600 bg-amber-50" };
  if (diffDays <= 3) return { text: `En ${diffDays}d`, color: "text-amber-600 bg-amber-50" };
  if (diffDays <= 7) return { text: `En ${diffDays}d`, color: "text-blue-600 bg-blue-50" };
  return {
    text: date.toLocaleDateString("es", { day: "numeric", month: "short" }),
    color: "text-slate-600 bg-slate-100",
  };
});

const formattedDate = computed(() => {
  if (!props.client.nextMaintenanceAt) return null;
  return new Date(props.client.nextMaintenanceAt).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});
</script>

<template>
  <button
    class="w-full text-left bg-white rounded-xl border border-slate-200 p-4 shadow-sm
           hover:shadow-md hover:border-primary-200 transition-all duration-200
           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
           active:scale-[0.98] min-h-[44px]"
    @click="emit('click')"
  >
    <!-- Header: name + badge -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <h3 class="font-semibold text-slate-800 text-base leading-tight truncate">
        {{ client.name }}
      </h3>
      <span
        v-if="nextMaintenanceLabel"
        :class="[
          'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
          nextMaintenanceLabel.color,
        ]"
      >
        {{ nextMaintenanceLabel.text }}
      </span>
    </div>

    <!-- Location -->
    <p v-if="client.location" class="text-sm text-slate-500 flex items-center gap-1.5 mb-2 truncate">
      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {{ client.location }}
    </p>

    <!-- Footer: equipment count + maintenance date -->
    <div class="flex items-center justify-between text-xs text-slate-400">
      <span class="flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {{ client.equipmentCount }} equipo{{ client.equipmentCount !== 1 ? "s" : "" }}
      </span>
      <span v-if="formattedDate" class="flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {{ formattedDate }}
      </span>
    </div>
  </button>
</template>
