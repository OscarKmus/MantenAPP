<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useClientStore } from "@/stores/clients";
import { useEquipmentStore } from "@/stores/equipment";
import EquipmentList from "@/components/equipment/EquipmentList.vue";
import ClientForm from "@/components/clients/ClientForm.vue";
import PdfStatus from "@/components/maintenance/PdfStatus.vue";
import MaintenanceHistoryList from "@/components/history/MaintenanceHistoryList.vue";
import api from "@/lib/api";
import type { Software, LicenseType, Maintenance } from "@mantenti/types";

const route = useRoute();
const router = useRouter();
const clientStore = useClientStore();
const equipmentStore = useEquipmentStore();

const activeTab = ref("resumen");
const showEditModal = ref(false);
const softwareList = ref<Software[]>([]);
const softwareLoading = ref(false);
const showSoftwareForm = ref(false);
const editingSoftware = ref<Software | null>(null);
const softwareForm = ref({
  name: "",
  licenseType: "OFFICE" as LicenseType,
  equipmentId: null as string | null,
  expiresAt: "",
  notes: "",
});

const latestMaintenance = ref<(Maintenance & { _count?: { items: number } }) | null>(null);
const latestMaintenanceLoading = ref(false);

const clientId = computed(() => route.params.id as string);
const client = computed(() => clientStore.currentClient);

const tabs = [
  { id: "resumen", label: "Resumen" },
  { id: "equipos", label: "Equipos" },
  { id: "software", label: "Software" },
  { id: "historial", label: "Historial" },
];

onMounted(async () => {
  await clientStore.fetchClient(clientId.value);
  await equipmentStore.fetchEquipment(clientId.value);
  await fetchSoftware();
  await fetchLatestMaintenance();
});

// Watch for route param changes
watch(clientId, async (id) => {
  await clientStore.fetchClient(id);
  await equipmentStore.fetchEquipment(id);
  await fetchSoftware();
  await fetchLatestMaintenance();
});

async function fetchSoftware() {
  softwareLoading.value = true;
  try {
    const { data } = await api.get<{ software: Software[] }>(
      `/clients/${clientId.value}/software`
    );
    softwareList.value = data.software;
  } catch {
    softwareList.value = [];
  } finally {
    softwareLoading.value = false;
  }
}

async function fetchLatestMaintenance() {
  latestMaintenanceLoading.value = true;
  try {
    const { data } = await api.get<{ maintenances: Maintenance[] }>(
      `/maintenances/client/${clientId.value}?limit=1`
    );
    const latest = data.maintenances?.[0] ?? null;
    // Only show if it's a closed maintenance
    latestMaintenance.value = latest?.status === "CLOSED" ? latest : null;
  } catch {
    latestMaintenance.value = null;
  } finally {
    latestMaintenanceLoading.value = false;
  }
}

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

// Software CRUD
function openSoftwareCreate() {
  editingSoftware.value = null;
  softwareForm.value = {
    name: "",
    licenseType: "OFFICE",
    equipmentId: null,
    expiresAt: "",
    notes: "",
  };
  showSoftwareForm.value = true;
}

function openSoftwareEdit(sw: Software) {
  editingSoftware.value = sw;
  softwareForm.value = {
    name: sw.name,
    licenseType: sw.licenseType,
    equipmentId: sw.equipmentId,
    expiresAt: new Date(sw.expiresAt).toISOString().split("T")[0],
    notes: sw.notes ?? "",
  };
  showSoftwareForm.value = true;
}

async function handleSoftwareSubmit() {
  if (!softwareForm.value.name.trim() || !softwareForm.value.expiresAt) {
    alert("Nombre y fecha de vencimiento son requeridos");
    return;
  }

  const payload: Record<string, unknown> = {
    name: softwareForm.value.name.trim(),
    licenseType: softwareForm.value.licenseType,
    clientId: clientId.value,
    expiresAt: new Date(softwareForm.value.expiresAt).toISOString(),
    ...(softwareForm.value.equipmentId && { equipmentId: softwareForm.value.equipmentId }),
    ...(softwareForm.value.notes.trim() && { notes: softwareForm.value.notes.trim() }),
  };

  try {
    if (editingSoftware.value) {
      await api.patch(`/software/${editingSoftware.value.id}`, payload);
    } else {
      await api.post("/software", payload);
    }
    showSoftwareForm.value = false;
    await fetchSoftware();
  } catch (e: any) {
    alert(e?.response?.data?.error || "Error al guardar software");
  }
}

async function handleSoftwareDelete(sw: Software) {
  const typed = prompt(
    `Vas a eliminar la licencia "${sw.name}".\n\n` +
    `Escribí exactamente el nombre para confirmar:`
  );
  if (typed === sw.name) {
    try {
      await api.delete(`/software/${sw.id}`);
      await fetchSoftware();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Error al eliminar software");
    }
  } else if (typed !== null) {
    alert("El nombre no coincide. No se eliminó nada.");
  }
}

const LICENSE_LABELS: Record<LicenseType, string> = {
  OFFICE: "Office",
  NORTON: "Norton",
  PDF: "PDF",
  AUTOCAD: "AutoCAD",
  ANTIVIRUS: "Antivirus",
  OTHER: "Otro",
};

function getLicenseExpirationColor(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const daysUntil = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "bg-red-100 text-red-800";
  if (daysUntil < 30) return "bg-red-100 text-red-800";
  if (daysUntil < 90) return "bg-amber-100 text-amber-800";
  return "bg-green-100 text-green-800";
}

function getLicenseExpirationText(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const daysUntil = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return `Vencida hace ${Math.abs(daysUntil)} días`;
  if (daysUntil === 0) return "Vence hoy";
  if (daysUntil === 1) return "Vence mañana";
  if (daysUntil < 30) return `Vence en ${daysUntil} días`;
  if (daysUntil < 90) return `Vence en ${Math.floor(daysUntil / 30)} meses`;
  return `Vence en ${Math.floor(daysUntil / 30)} meses`;
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

        <!-- Latest maintenance PDF -->
        <div
          v-if="latestMaintenance"
          class="bg-white rounded-xl border border-slate-200 p-5"
        >
          <h3 class="font-semibold text-slate-800 mb-3">Último reporte</h3>
          <div class="flex items-center gap-4 mb-4">
            <div class="flex-1">
              <p class="text-sm text-slate-600">
                Cerrada el {{ new Date(latestMaintenance.closedAt!).toLocaleDateString("es", {
                  day: "numeric", month: "long", year: "numeric"
                }) }}
              </p>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ latestMaintenance._count?.items ?? "?" }} equipos revisados
              </p>
            </div>
          </div>
          <PdfStatus
            :maintenance-id="latestMaintenance.id"
            :pdf-path="latestMaintenance.pdfPath"
            @update:pdf-path="latestMaintenance.pdfPath = $event as any"
          />
        </div>
      </div>

      <!-- Tab: Equipos -->
      <div v-if="activeTab === 'equipos'">
        <EquipmentList
          :equipment="equipmentStore.equipment"
          :loading="equipmentStore.loading"
          :client-id="clientId"
          @create="handleCreateEquipment"
          @update="handleUpdateEquipment"
          @delete="handleDeleteEquipment"
        />
      </div>

      <!-- Tab: Software -->
      <div v-if="activeTab === 'software'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-slate-500">
            {{ softwareList.length }} licencia{{ softwareList.length !== 1 ? "s" : "" }}
          </p>
          <button
            class="inline-flex items-center gap-2 px-3.5 py-2 bg-primary-600 text-white text-sm font-medium
                   rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            @click="openSoftwareCreate"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Agregar software
          </button>
        </div>

        <!-- Loading -->
        <div v-if="softwareLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
            <div class="h-5 bg-slate-200 rounded w-1/3 mb-2" />
            <div class="h-4 bg-slate-100 rounded w-1/2" />
          </div>
        </div>

        <!-- Empty -->
        <div
          v-else-if="softwareList.length === 0"
          class="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center"
        >
          <svg class="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <p class="text-slate-600 font-medium mb-1">Sin software registrado</p>
          <p class="text-sm text-slate-500 mb-4">
            Agrega licencias de software para este cliente.
          </p>
          <button
            class="inline-flex items-center gap-2 px-3.5 py-2 bg-primary-600 text-white text-sm font-medium
                   rounded-lg hover:bg-primary-700"
            @click="openSoftwareCreate"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Agregar software
          </button>
        </div>

        <!-- Software cards -->
        <div v-else class="space-y-3">
          <div
            v-for="sw in softwareList"
            :key="sw.id"
            class="bg-white rounded-lg border border-slate-200 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-medium text-slate-800">{{ sw.name }}</h4>
                  <span class="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    {{ LICENSE_LABELS[sw.licenseType] || sw.licenseType }}
                  </span>
                  <span
                    :class="[
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      getLicenseExpirationColor(sw.expiresAt),
                    ]"
                  >
                    {{ getLicenseExpirationText(sw.expiresAt) }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span v-if="(sw as any).equipment?.name" class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {{ (sw as any).equipment.name }}
                  </span>
                  <span class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Vence: {{ new Date(sw.expiresAt).toLocaleDateString("es") }}
                  </span>
                </div>
                <p v-if="sw.notes" class="text-xs text-slate-400 mt-1 italic">{{ sw.notes }}</p>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-1 shrink-0">
                <button
                  class="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50
                         focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                  title="Editar"
                  @click="openSoftwareEdit(sw)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                         focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  title="Eliminar"
                  @click="handleSoftwareDelete(sw)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Historial -->
      <div v-if="activeTab === 'historial'">
        <MaintenanceHistoryList :client-id="clientId" />
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

    <!-- Software form modal -->
    <Teleport to="body">
      <div
        v-if="showSoftwareForm"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
        @click.self="showSoftwareForm = false"
      >
        <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-xl font-bold text-slate-800 mb-5">
            {{ editingSoftware ? "Editar software" : "Agregar software" }}
          </h2>
          <form @submit.prevent="handleSoftwareSubmit" class="space-y-4">
            <!-- Name -->
            <div>
              <label for="sw-name" class="block text-sm font-medium text-slate-700 mb-1.5">
                Nombre <span class="text-red-500">*</span>
              </label>
              <input
                id="sw-name"
                v-model="softwareForm.name"
                type="text"
                class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="ej: Microsoft Office 365"
              />
            </div>

            <!-- License Type -->
            <div>
              <label for="sw-type" class="block text-sm font-medium text-slate-700 mb-1.5">
                Tipo de licencia
              </label>
              <select
                id="sw-type"
                v-model="softwareForm.licenseType"
                class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="OFFICE">Office</option>
                <option value="NORTON">Norton</option>
                <option value="PDF">PDF</option>
                <option value="AUTOCAD">AutoCAD</option>
                <option value="ANTIVIRUS">Antivirus</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>

            <!-- Equipment (optional) -->
            <div>
              <label for="sw-equipment" class="block text-sm font-medium text-slate-700 mb-1.5">
                Equipo <span class="text-slate-400 text-xs">(opcional)</span>
              </label>
              <select
                id="sw-equipment"
                v-model="softwareForm.equipmentId"
                class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option :value="null">Sin equipo asignado</option>
                <option
                  v-for="eq in equipmentStore.equipment"
                  :key="eq.id"
                  :value="eq.id"
                >
                  {{ eq.name }}
                </option>
              </select>
            </div>

            <!-- Expires At -->
            <div>
              <label for="sw-expires" class="block text-sm font-medium text-slate-700 mb-1.5">
                Fecha de vencimiento <span class="text-red-500">*</span>
              </label>
              <input
                id="sw-expires"
                v-model="softwareForm.expiresAt"
                type="date"
                class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <!-- Notes -->
            <div>
              <label for="sw-notes" class="block text-sm font-medium text-slate-700 mb-1.5">
                Notas
              </label>
              <textarea
                id="sw-notes"
                v-model="softwareForm.notes"
                rows="3"
                class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Información adicional..."
              />
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700
                       hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                @click="showSoftwareForm = false"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-sm font-semibold text-white
                       hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {{ editingSoftware ? "Guardar cambios" : "Agregar software" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
