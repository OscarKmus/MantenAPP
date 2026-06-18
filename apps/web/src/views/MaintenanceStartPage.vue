<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useClientStore } from "@/stores/clients";
import { useEquipmentStore } from "@/stores/equipment";
import { useMaintenanceDraftStore } from "@/stores/maintenance-draft";
import type { Equipment } from "@mantenti/types";

const route = useRoute();
const router = useRouter();
const clientStore = useClientStore();
const equipmentStore = useEquipmentStore();
const draftStore = useMaintenanceDraftStore();

const clientId = computed(() => route.query.clientId as string);
const selectedEquipmentIds = ref<Set<string>>(new Set());
const starting = ref(false);
const error = ref<string | null>(null);

const client = computed(() => clientStore.currentClient);
const equipment = computed(() => equipmentStore.equipment);

const hasSelection = computed(() => selectedEquipmentIds.value.size > 0);

onMounted(async () => {
  if (!clientId.value) {
    router.replace({ name: "clients" });
    return;
  }
  await clientStore.fetchClient(clientId.value);
  await equipmentStore.fetchEquipment(clientId.value);
});

function toggleEquipment(id: string) {
  const set = new Set(selectedEquipmentIds.value);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  selectedEquipmentIds.value = set;
}

function selectAll() {
  selectedEquipmentIds.value = new Set(equipment.value.map((e) => e.id));
}

function deselectAll() {
  selectedEquipmentIds.value = new Set();
}

async function handleStart() {
  if (!clientId.value || selectedEquipmentIds.value.size === 0) return;

  starting.value = true;
  error.value = null;

  try {
    const maintenance = await draftStore.startMaintenance(
      clientId.value,
      Array.from(selectedEquipmentIds.value)
    );
    router.push({ name: "maintenance-flow", params: { id: maintenance.id } });
  } catch (err: any) {
    error.value = err.response?.data?.error || "Error al iniciar mantención";
  } finally {
    starting.value = false;
  }
}

function handleBack() {
  router.push({ name: "client-detail", params: { id: clientId.value } });
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Back -->
    <button
      class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4
             focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
      @click="handleBack"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Volver a {{ client?.name ?? "cliente" }}
    </button>

    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Nueva mantención</h1>
      <p class="text-sm text-slate-500 mt-1">
        Selecciona los equipos para esta mantención de <strong>{{ client?.name }}</strong>
      </p>
    </div>

    <!-- Equipment selector -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-slate-700">
          Equipos ({{ selectedEquipmentIds.size }} seleccionados)
        </h2>
        <div class="flex gap-2">
          <button
            class="text-xs text-primary-600 hover:text-primary-700"
            @click="selectAll"
          >
            Todos
          </button>
          <span class="text-slate-300">|</span>
          <button
            class="text-xs text-slate-500 hover:text-slate-700"
            @click="deselectAll"
          >
            Ninguno
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="equipmentStore.loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-14 bg-slate-100 rounded-lg animate-pulse" />
      </div>

      <!-- Empty -->
      <div
        v-else-if="equipment.length === 0"
        class="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center"
      >
        <p class="text-slate-600 font-medium">Sin equipos registrados</p>
        <p class="text-sm text-slate-500 mt-1">Agrega equipos al cliente primero</p>
      </div>

      <!-- Equipment list -->
      <div v-else class="space-y-2">
        <button
          v-for="eq in equipment"
          :key="eq.id"
          :class="[
            'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
            selectedEquipmentIds.has(eq.id)
              ? 'border-primary-500 bg-primary-50'
              : 'border-slate-200 bg-white hover:border-slate-300',
          ]"
          @click="toggleEquipment(eq.id)"
        >
          <div class="flex items-center gap-3">
            <div
              :class="[
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                selectedEquipmentIds.has(eq.id)
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-slate-300',
              ]"
            >
              <svg
                v-if="selectedEquipmentIds.has(eq.id)"
                class="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-slate-800 truncate">{{ eq.name }}</div>
              <div class="text-xs text-slate-500 flex gap-2">
                <span v-if="eq.ip">{{ eq.ip }}</span>
                <span v-if="eq.serial">{{ eq.serial }}</span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Start button -->
    <div class="sticky bottom-0 bg-white border-t border-slate-200 -mx-4 px-4 py-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <button
        class="w-full px-6 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl
               shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2
               focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50
               disabled:cursor-not-allowed flex items-center justify-center gap-2"
        :disabled="!hasSelection || starting"
        @click="handleStart"
      >
        <svg
          v-if="starting"
          class="animate-spin w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Iniciar mantención con {{ selectedEquipmentIds.size }} equipo{{ selectedEquipmentIds.size !== 1 ? "s" : "" }}
      </button>
    </div>
  </div>
</template>
