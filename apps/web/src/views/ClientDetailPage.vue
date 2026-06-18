<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useClientStore } from "@/stores/clients";
import { useEquipmentStore } from "@/stores/equipment";
import EquipmentList from "@/components/equipment/EquipmentList.vue";
import ClientForm from "@/components/clients/ClientForm.vue";

const route = useRoute();
const router = useRouter();
const clientStore = useClientStore();
const equipmentStore = useEquipmentStore();

const activeTab = ref("resumen");
const showEditModal = ref(false);

const clientId = computed(() => route.params.id as string);
const client = computed(() => clientStore.currentClient);

const tabs = [
  { id: "resumen", label: "Resumen" },
  { id: "equipos", label: "Equipos" },
  { id: "historial", label: "Historial", disabled: true },
];

onMounted(async () => {
  await clientStore.fetchClient(clientId.value);
  await equipmentStore.fetchEquipment(clientId.value);
});

// Watch for route param changes
watch(clientId, async (id) => {
  await clientStore.fetchClient(id);
  await equipmentStore.fetchEquipment(id);
});

function handleUpdateClient(data: Record<string, unknown>) {
  clientStore.updateClient(clientId.value, data).then(() => {
    showEditModal.value = false;
    clientStore.fetchClient(clientId.value);
  });
}

async function handleDeleteClient() {
  if (!client.value) return;
  const typed = prompt(
    `⚠️ Eliminación definitiva\n\n` +
    `Vas a eliminar el cliente "${client.value.name}".\n\n` +
    `Se borrarán también TODOS sus equipos, mantenciones, adjuntos e historial.\n\n` +
    `Esta acción no se puede deshacer.\n\n` +
    `Escribí exactamente el nombre del cliente para confirmar:`
  );
  if (typed !== client.value.name) {
    if (typed !== null) alert("El nombre no coincide. No se eliminó nada.");
    return;
  }
  try {
    await clientStore.deleteClient(client.value.id);
    router.push({ name: "clients" });
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || "No se pudo eliminar el cliente";
    alert(`No se pudo eliminar el cliente:\n\n${msg}`);
  }
}

async function handleCreateEquipment(data: Record<string, unknown>) {
  try {
    await equipmentStore.createEquipment(clientId.value, data);
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || "No se pudo crear el equipo";
    alert(`No se pudo crear el equipo:\n\n${msg}`);
  }
}

function handleUpdateEquipment(id: string, data: Record<string, unknown>) {
  equipmentStore.updateEquipment(id, data);
}

async function handleDeleteEquipment(id: string) {
  try {
    await equipmentStore.deleteEquipment(id);
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || "No se pudo eliminar el equipo";
    alert(`No se pudo eliminar el equipo:\n\n${msg}`);
  }
}

const nextMaintenanceDisplay = computed(() => {
  if (!client.value?.nextMaintenanceAt) return null;
  const date = new Date(client.value.nextMaintenanceAt);
  return date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Back button -->
    <button
      class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4
             focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
      @click="router.push({ name: 'clients' })"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Volver a clientes
    </button>

    <!-- Loading -->
    <div v-if="clientStore.loading && !client" class="animate-pulse space-y-6">
      <div class="h-8 bg-slate-200 rounded w-1/3" />
      <div class="h-4 bg-slate-100 rounded w-1/4" />
      <div class="h-10 bg-slate-100 rounded w-full" />
      <div class="h-48 bg-slate-100 rounded" />
    </div>

    <!-- Error -->
    <div v-else-if="clientStore.error && !client" class="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
      <p class="text-red-700 font-medium">{{ clientStore.error }}</p>
      <button
        class="mt-3 text-sm text-red-600 underline"
        @click="clientStore.fetchClient(clientId)"
      >
        Reintentar
      </button>
    </div>

    <!-- Client content -->
    <template v-else-if="client">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">{{ client.name }}</h1>
          <p v-if="client.location" class="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ client.location }}
          </p>
        </div>
        <button
          class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm
                 font-medium rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          @click="showEditModal = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
        <button
          class="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 text-sm
                 font-medium rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          title="Eliminar cliente"
          @click="handleDeleteClient"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Eliminar
        </button>
      </div>

      <!-- Tabs -->
      <div class="border-b border-slate-200 mb-6 -mx-4 px-4 overflow-x-auto">
        <nav class="flex gap-1 min-w-max" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :disabled="tab.disabled"
            :class="[
              'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/50'
                : tab.disabled
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50',
            ]"
            @click="!tab.disabled && (activeTab = tab.id)"
          >
            {{ tab.label }}
            <span v-if="tab.disabled" class="text-xs ml-1">(próximamente)</span>
          </button>
        </nav>
      </div>

      <!-- Tab: Resumen -->
      <div v-if="activeTab === 'resumen'" class="space-y-6">
        <!-- Start maintenance button -->
        <button
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3
                 bg-primary-600 text-white text-sm font-semibold rounded-xl shadow-sm
                 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500
                 focus:ring-offset-2 transition-colors"
          @click="router.push({ name: 'maintenance-start', query: { clientId } })"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Iniciar mantención
        </button>

        <!-- Quick stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white rounded-xl border border-slate-200 p-4">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Equipos</p>
            <p class="text-2xl font-bold text-slate-800">{{ client.equipmentCount }}</p>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-4">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Frecuencia</p>
            <p class="text-2xl font-bold text-slate-800">
              {{ client.frequencyDays ? `${client.frequencyDays}d` : "—" }}
            </p>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-4">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Próx. mantención</p>
            <p class="text-lg font-bold text-slate-800">
              {{ nextMaintenanceDisplay || "Sin fecha" }}
            </p>
          </div>
        </div>

        <!-- Contact info -->
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <h3 class="font-semibold text-slate-800 mb-4">Información de contacto</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-slate-500 mb-0.5">Contacto</p>
              <p class="text-slate-800 font-medium">{{ client.contactName || "—" }}</p>
            </div>
            <div>
              <p class="text-slate-500 mb-0.5">Teléfono</p>
              <p class="text-slate-800 font-medium">{{ client.contactPhone || "—" }}</p>
            </div>
            <div>
              <p class="text-slate-500 mb-0.5">Email</p>
              <p class="text-slate-800 font-medium">{{ client.contactEmail || "—" }}</p>
            </div>
            <div>
              <p class="text-slate-500 mb-0.5">Ubicación</p>
              <p class="text-slate-800 font-medium">{{ client.location || "—" }}</p>
            </div>
          </div>
        </div>

        <!-- Maintenance dates detail -->
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <h3 class="font-semibold text-slate-800 mb-4">Fechas de mantenimiento</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div class="p-3 bg-slate-50 rounded-lg">
              <p class="text-slate-500 text-xs mb-1">Base (automática)</p>
              <p class="text-slate-800 font-medium">
                {{ client.nextMaintenanceBaseAt
                  ? new Date(client.nextMaintenanceBaseAt).toLocaleDateString("es")
                  : "—" }}
              </p>
            </div>
            <div class="p-3 bg-blue-50 rounded-lg">
              <p class="text-blue-600 text-xs mb-1">Acordada</p>
              <p class="text-blue-800 font-medium">
                {{ client.nextMaintenanceAgreedAt
                  ? new Date(client.nextMaintenanceAgreedAt).toLocaleDateString("es")
                  : "—" }}
              </p>
            </div>
            <div class="p-3 bg-green-50 rounded-lg">
              <p class="text-green-600 text-xs mb-1">Efectiva</p>
              <p class="text-green-800 font-medium">
                {{ client.nextMaintenanceAt
                  ? new Date(client.nextMaintenanceAt).toLocaleDateString("es")
                  : "—" }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Equipos -->
      <div v-if="activeTab === 'equipos'">
        <EquipmentList
          :equipment="equipmentStore.equipment"
          :loading="equipmentStore.loading"
          @create="handleCreateEquipment"
          @update="handleUpdateEquipment"
          @delete="handleDeleteEquipment"
        />
      </div>

      <!-- Tab: Historial (placeholder) -->
      <div v-if="activeTab === 'historial'" class="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <svg class="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-slate-600 font-medium">Historial de mantenciones</p>
        <p class="text-sm text-slate-500 mt-1">Disponible en Slice 5</p>
      </div>
    </template>

    <!-- Edit modal -->
    <Teleport to="body">
      <div
        v-if="showEditModal && client"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        @click.self="showEditModal = false"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-xl font-bold text-slate-800 mb-5">Editar cliente</h2>
          <ClientForm
            :client="client"
            :loading="clientStore.loading"
            @submit="handleUpdateClient"
            @cancel="showEditModal = false"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
