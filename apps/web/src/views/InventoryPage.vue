<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useInventoryStore } from "@/stores/inventory";
import { useClientStore } from "@/stores/clients";
import type { Equipment, Software, EquipmentStatus, LicenseType } from "@mantenti/types";

const router = useRouter();
const inventoryStore = useInventoryStore();
const clientStore = useClientStore();

const activeTab = ref<"equipment" | "software">("equipment");
const showDetailModal = ref(false);
const selectedEquipment = ref<Equipment | null>(null);

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  UNDER_MAINTENANCE: "En mantención",
  DECOMMISSIONED: "Dado de baja",
};

const STATUS_COLORS: Record<EquipmentStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-slate-100 text-slate-700",
  UNDER_MAINTENANCE: "bg-amber-100 text-amber-800",
  DECOMMISSIONED: "bg-red-100 text-red-800",
};

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

onMounted(async () => {
  await Promise.all([
    inventoryStore.fetchInventory(),
    inventoryStore.fetchCategories(),
    clientStore.fetchClients(),
  ]);
});

// Watch filters and refetch
watch(
  () => inventoryStore.filters,
  () => inventoryStore.fetchInventory(),
  { deep: true }
);

function openEquipmentDetail(eq: Equipment) {
  selectedEquipment.value = eq;
  showDetailModal.value = true;
}

function closeDetailModal() {
  showDetailModal.value = false;
  selectedEquipment.value = null;
}

const filteredEquipment = computed(() => inventoryStore.equipment);
const filteredSoftware = computed(() => inventoryStore.software);
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Inventario</h1>
      <p class="text-sm text-slate-500 mt-1">
        Gestiona equipos, componentes y licencias de software
      </p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-slate-200 mb-6">
      <nav class="flex gap-1" role="tablist">
        <button
          role="tab"
          :aria-selected="activeTab === 'equipment'"
          :class="[
            'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
            activeTab === 'equipment'
              ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50',
          ]"
          @click="activeTab = 'equipment'"
        >
          Equipos
          <span class="ml-1 text-xs text-slate-400">({{ filteredEquipment.length }})</span>
        </button>
        <button
          role="tab"
          :aria-selected="activeTab === 'software'"
          :class="[
            'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
            activeTab === 'software'
              ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50',
          ]"
          @click="activeTab = 'software'"
        >
          Software
          <span class="ml-1 text-xs text-slate-400">({{ filteredSoftware.length }})</span>
        </button>
      </nav>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Search -->
        <div class="lg:col-span-2">
          <label for="search" class="block text-sm font-medium text-slate-700 mb-1.5">
            Buscar
          </label>
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="search"
              v-model="inventoryStore.filters.search"
              type="text"
              placeholder="Buscar por nombre..."
              class="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <!-- Client filter -->
        <div>
          <label for="client-filter" class="block text-sm font-medium text-slate-700 mb-1.5">
            Cliente
          </label>
          <select
            id="client-filter"
            v-model="inventoryStore.filters.clientId"
            class="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos los clientes</option>
            <option v-for="client in clientStore.clients" :key="client.id" :value="client.id">
              {{ client.name }}
            </option>
          </select>
        </div>

        <!-- Category filter (equipment only) -->
        <div v-if="activeTab === 'equipment'">
          <label for="category-filter" class="block text-sm font-medium text-slate-700 mb-1.5">
            Categoría
          </label>
          <select
            id="category-filter"
            v-model="inventoryStore.filters.categoryId"
            class="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todas las categorías</option>
            <option
              v-for="cat in inventoryStore.categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Status filter (equipment only) -->
        <div v-if="activeTab === 'equipment'">
          <label for="status-filter" class="block text-sm font-medium text-slate-700 mb-1.5">
            Estado
          </label>
          <select
            id="status-filter"
            v-model="inventoryStore.filters.status"
            class="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="UNDER_MAINTENANCE">En mantención</option>
            <option value="DECOMMISSIONED">Dado de baja</option>
          </select>
        </div>

        <!-- License type filter (software only) -->
        <div v-if="activeTab === 'software'">
          <label for="license-filter" class="block text-sm font-medium text-slate-700 mb-1.5">
            Tipo de licencia
          </label>
          <select
            id="license-filter"
            v-model="inventoryStore.filters.licenseType"
            class="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos los tipos</option>
            <option value="OFFICE">Office</option>
            <option value="NORTON">Norton</option>
            <option value="PDF">PDF</option>
            <option value="AUTOCAD">AutoCAD</option>
            <option value="ANTIVIRUS">Antivirus</option>
            <option value="OTHER">Otro</option>
          </select>
        </div>
      </div>

      <!-- Reset filters -->
      <div class="mt-3 flex justify-end">
        <button
          class="text-sm text-slate-500 hover:text-slate-700 underline"
          @click="inventoryStore.resetFilters()"
        >
          Limpiar filtros
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="inventoryStore.loading" class="space-y-3">
      <div
        v-for="i in 5"
        :key="i"
        class="bg-white rounded-lg border border-slate-200 p-4 animate-pulse"
      >
        <div class="h-5 bg-slate-200 rounded w-1/3 mb-2" />
        <div class="h-4 bg-slate-100 rounded w-1/2" />
      </div>
    </div>

    <!-- Equipment Tab -->
    <template v-else-if="activeTab === 'equipment'">
      <!-- Empty state -->
      <div
        v-if="filteredEquipment.length === 0"
        class="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center"
      >
        <svg
          class="w-12 h-12 text-slate-400 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <p class="text-slate-600 font-medium mb-1">Sin equipos encontrados</p>
        <p class="text-sm text-slate-500">
          Prueba ajustando los filtros o agrega equipos desde la ficha de cada cliente.
        </p>
      </div>

      <!-- Equipment grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="eq in filteredEquipment"
          :key="eq.id"
          class="bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300
                 hover:shadow-md transition-all cursor-pointer group"
          @click="openEquipmentDetail(eq)"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-slate-800 truncate group-hover:text-primary-700 transition-colors">
                {{ eq.name }}
              </h3>
              <p v-if="eq.category" class="text-xs text-slate-500 mt-0.5">
                {{ eq.category.name }}
              </p>
            </div>
            <span
              :class="[
                'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                STATUS_COLORS[eq.status],
              ]"
            >
              {{ STATUS_LABELS[eq.status] }}
            </span>
          </div>

          <!-- Info -->
          <div class="space-y-1.5 text-xs text-slate-500">
            <div v-if="eq.ip" class="flex items-center gap-1.5">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              {{ eq.ip }}
            </div>
            <div v-if="eq.serial" class="flex items-center gap-1.5">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              {{ eq.serial }}
            </div>
            <div v-if="eq.assignedTo" class="flex items-center gap-1.5">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {{ eq.assignedTo }}
            </div>
          </div>

          <!-- License badge -->
          <div v-if="eq.hasLicense" class="mt-3 pt-3 border-t border-slate-100">
            <span class="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              Licencia asignada
            </span>
          </div>

          <!-- Components preview -->
          <div
            v-if="eq.components && eq.components.length > 0"
            class="mt-3 pt-3 border-t border-slate-100"
          >
            <div class="flex flex-wrap gap-1">
              <span
                v-for="comp in eq.components.slice(0, 3)"
                :key="comp.id"
                class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
              >
                {{ comp.type }}: {{ comp.name }}
              </span>
              <span
                v-if="eq.components.length > 3"
                class="text-xs text-slate-400"
              >
                +{{ eq.components.length - 3 }} más
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Software Tab -->
    <template v-else-if="activeTab === 'software'">
      <!-- Empty state -->
      <div
        v-if="filteredSoftware.length === 0"
        class="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center"
      >
        <svg
          class="w-12 h-12 text-slate-400 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <p class="text-slate-600 font-medium mb-1">Sin software registrado</p>
        <p class="text-sm text-slate-500">
          Agrega licencias de software desde la ficha de cada cliente.
        </p>
      </div>

      <!-- Software table (desktop) / cards (mobile) -->
      <div v-else>
        <!-- Desktop table -->
        <div class="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table class="w-full">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Software
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Tipo
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Cliente
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Equipo
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Vencimiento
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="sw in filteredSoftware"
                :key="sw.id"
                class="hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-800">{{ sw.name }}</p>
                  <p v-if="sw.notes" class="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                    {{ sw.notes }}
                  </p>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    {{ LICENSE_LABELS[sw.licenseType] || sw.licenseType }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-slate-600">
                  {{ (sw as any).client?.name || "—" }}
                </td>
                <td class="px-4 py-3 text-sm text-slate-600">
                  {{ (sw as any).equipment?.name || "—" }}
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      getLicenseExpirationColor(sw.expiresAt),
                    ]"
                  >
                    {{ getLicenseExpirationText(sw.expiresAt) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="md:hidden space-y-3">
          <div
            v-for="sw in filteredSoftware"
            :key="sw.id"
            class="bg-white rounded-xl border border-slate-200 p-4"
          >
            <div class="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 class="font-semibold text-slate-800">{{ sw.name }}</h3>
                <span class="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  {{ LICENSE_LABELS[sw.licenseType] || sw.licenseType }}
                </span>
              </div>
              <span
                :class="[
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  getLicenseExpirationColor(sw.expiresAt),
                ]"
              >
                {{ getLicenseExpirationText(sw.expiresAt) }}
              </span>
            </div>
            <div class="space-y-1 text-xs text-slate-500">
              <p v-if="(sw as any).client?.name">
                Cliente: {{ (sw as any).client.name }}
              </p>
              <p v-if="(sw as any).equipment?.name">
                Equipo: {{ (sw as any).equipment.name }}
              </p>
              <p v-if="sw.notes" class="text-slate-400 italic">{{ sw.notes }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Equipment Detail Modal -->
    <Teleport to="body">
      <div
        v-if="showDetailModal && selectedEquipment"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
        @click.self="closeDetailModal"
      >
        <div
          class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg
                 max-h-[90vh] overflow-y-auto"
        >
          <!-- Header -->
          <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-slate-800">
                {{ selectedEquipment.name }}
              </h2>
              <button
                class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
                @click="closeDetailModal"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="px-6 py-4 space-y-5">
            <!-- Status & Category -->
            <div class="flex flex-wrap gap-2">
              <span
                :class="[
                  'text-xs font-medium px-2.5 py-1 rounded-full',
                  STATUS_COLORS[selectedEquipment.status],
                ]"
              >
                {{ STATUS_LABELS[selectedEquipment.status] }}
              </span>
              <span
                v-if="selectedEquipment.category"
                class="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full"
              >
                {{ selectedEquipment.category.name }}
              </span>
            </div>

            <!-- Network & Identification -->
            <div class="bg-slate-50 rounded-xl p-4">
              <h3 class="text-sm font-semibold text-slate-700 mb-3">
                Red e identificación
              </h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-slate-500 text-xs">IP</p>
                  <p class="text-slate-800 font-medium">
                    {{ selectedEquipment.ip || "—" }}
                  </p>
                </div>
                <div>
                  <p class="text-slate-500 text-xs">MAC</p>
                  <p class="text-slate-800 font-medium">
                    {{ selectedEquipment.mac || "—" }}
                  </p>
                </div>
                <div>
                  <p class="text-slate-500 text-xs">Serie</p>
                  <p class="text-slate-800 font-medium">
                    {{ selectedEquipment.serial || "—" }}
                  </p>
                </div>
                <div>
                  <p class="text-slate-500 text-xs">Asignado a</p>
                  <p class="text-slate-800 font-medium">
                    {{ selectedEquipment.assignedTo || "—" }}
                  </p>
                </div>
              </div>
            </div>

            <!-- License Info -->
            <div class="bg-slate-50 rounded-xl p-4">
              <h3 class="text-sm font-semibold text-slate-700 mb-3">
                Licencia
              </h3>
              <div v-if="selectedEquipment.hasLicense" class="space-y-2 text-sm">
                <div>
                  <p class="text-slate-500 text-xs">Tipo</p>
                  <p class="text-slate-800 font-medium">
                    {{ selectedEquipment.licenseType || "—" }}
                  </p>
                </div>
                <div>
                  <p class="text-slate-500 text-xs">Vencimiento</p>
                  <p class="text-slate-800 font-medium">
                    {{
                      selectedEquipment.licenseExpiresAt
                        ? new Date(selectedEquipment.licenseExpiresAt).toLocaleDateString("es")
                        : "—"
                    }}
                  </p>
                </div>
                <div v-if="selectedEquipment.licenseNotes">
                  <p class="text-slate-500 text-xs">Notas</p>
                  <p class="text-slate-800">{{ selectedEquipment.licenseNotes }}</p>
                </div>
              </div>
              <p v-else class="text-sm text-green-600 font-medium">
                Sin licencias por el momento
              </p>
            </div>

            <!-- Components -->
            <div
              v-if="
                selectedEquipment.category?.isComputer &&
                selectedEquipment.components &&
                selectedEquipment.components.length > 0
              "
              class="bg-slate-50 rounded-xl p-4"
            >
              <h3 class="text-sm font-semibold text-slate-700 mb-3">
                Componentes
              </h3>
              <div class="space-y-2">
                <div
                  v-for="comp in selectedEquipment.components"
                  :key="comp.id"
                  class="flex items-center justify-between bg-white rounded-lg px-3 py-2"
                >
                  <div>
                    <span class="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded mr-2">
                      {{ comp.type }}
                    </span>
                    <span class="text-sm text-slate-800">{{ comp.name }}</span>
                  </div>
                  <span v-if="comp.specs" class="text-xs text-slate-500">
                    {{ comp.specs }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Dates -->
            <div class="text-xs text-slate-400 space-y-1">
              <p>
                Creado:
                {{ new Date(selectedEquipment.createdAt).toLocaleDateString("es") }}
              </p>
              <p>
                Actualizado:
                {{ new Date(selectedEquipment.updatedAt).toLocaleDateString("es") }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl">
            <div class="flex gap-3">
              <button
                class="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium
                       text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                @click="closeDetailModal"
              >
                Cerrar
              </button>
              <button
                class="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-sm font-semibold text-white
                       hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                @click="
                  closeDetailModal();
                  router.push({
                    name: 'client-detail',
                    params: { id: selectedEquipment?.clientId },
                    query: { tab: 'equipos' },
                  });
                "
              >
                Ver en cliente
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
