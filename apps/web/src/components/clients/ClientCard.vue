<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted } from "vue";
import type { Client } from "@mantenti/types";

interface ClientWithMeta extends Client {
  equipmentCount: number;
}

const props = defineProps<{
  client: ClientWithMeta;
  selected?: boolean;
}>();

const emit = defineEmits<{
  click: [];
  delete: [id: string];
  toggle: [id: string];
}>();

const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

function toggleMenu(e: Event) {
  e.stopPropagation();
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

function handleDelete(e: Event) {
  e.stopPropagation();
  const typed = prompt(
    `⚠️ Eliminación definitiva\n\n` +
    `Vas a eliminar el cliente "${props.client.name}".\n\n` +
    `Se borrarán también TODOS sus equipos, mantenciones, adjuntos e historial.\n\n` +
    `Esta acción no se puede deshacer.\n\n` +
    `Escribí exactamente el nombre del cliente para confirmar:`
  );
  if (typed === props.client.name) {
    emit("delete", props.client.id);
  } else if (typed !== null) {
    alert("El nombre no coincide. No se eliminó nada.");
  }
  closeMenu();
}

function handleCardClick() {
  if (!menuOpen.value) {
    emit("click");
  }
}

function onDocumentClick(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    closeMenu();
  }
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));

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
  <div
    class="relative w-full text-left bg-white rounded-xl border border-slate-200 p-4 shadow-sm
           hover:shadow-md hover:border-primary-200 transition-all duration-200
           focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2
           active:scale-[0.98] cursor-pointer"
    @click="handleCardClick"
  >
    <!-- Header: checkbox + name + badge + menu -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <label
        v-if="selected !== undefined"
        class="flex items-center shrink-0 mt-0.5"
        @click.stop
      >
        <input
          type="checkbox"
          :checked="selected"
          class="w-4 h-4 rounded border-slate-300 text-primary-600
                 focus:ring-primary-500 cursor-pointer"
          @change="emit('toggle', client.id)"
        />
      </label>
      <h3 class="font-semibold text-slate-800 text-base leading-tight truncate flex-1 min-w-0">
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

      <!-- Actions menu -->
      <div ref="menuRef" class="relative shrink-0" @click.stop>
        <button
          type="button"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100
                 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          title="Más acciones"
          aria-label="Más acciones"
          @click="toggleMenu"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        <div
          v-if="menuOpen"
          class="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg
                 py-1 z-20"
        >
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50
                   flex items-center gap-2"
            @click.stop="handleCardClick(); closeMenu()"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Ver detalle
          </button>
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50
                   flex items-center gap-2"
            @click="handleDelete"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>
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
  </div>
</template>
