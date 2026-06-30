<script setup lang="ts">
import { ref, watch } from "vue";
import type { Equipment, EquipmentStatus } from "@mantenti/types";
import { useAuthStore } from "@/stores/auth";
import EquipmentForm from "./EquipmentForm.vue";

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  UNDER_MAINTENANCE: "En mantención",
  DECOMMISSIONED: "Dado de baja",
};

const STATUS_COLORS: Record<EquipmentStatus, string> = {
  ACTIVE: "text-green-700 bg-green-50",
  INACTIVE: "text-slate-600 bg-slate-100",
  UNDER_MAINTENANCE: "text-amber-700 bg-amber-50",
  DECOMMISSIONED: "text-red-700 bg-red-50",
};

const props = defineProps<{
  equipment: Equipment[];
  loading?: boolean;
  clientId?: string;
}>();

const emit = defineEmits<{
  create: [data: Record<string, unknown>];
  update: [id: string, data: Record<string, unknown>];
  delete: [id: string];
}>();

const auth = useAuthStore();

const showForm = ref(false);
const editingEquipment = ref<Equipment | null>(null);
const statusFilter = ref<EquipmentStatus | "">("");
const showDetailModal = ref(false);
const selectedEquipment = ref<Equipment | null>(null);

const filteredEquipment = ref<Equipment[]>([]);

function applyFilter() {
  if (!statusFilter.value) {
    filteredEquipment.value = props.equipment;
  } else {
    filteredEquipment.value = props.equipment.filter((e) => e.status === statusFilter.value);
  }
}

watch(() => props.equipment, applyFilter, { immediate: true });
watch(statusFilter, applyFilter);

function openCreate() {
  editingEquipment.value = null;
  showForm.value = true;
}

function openEdit(eq: Equipment) {
  editingEquipment.value = eq;
  showForm.value = true;
}

function openDetail(eq: Equipment) {
  selectedEquipment.value = eq;
  showDetailModal.value = true;
}

function closeDetailModal() {
  showDetailModal.value = false;
  selectedEquipment.value = null;
}

function handleSubmit(data: Record<string, unknown>) {
  if (editingEquipment.value) {
    emit("update", editingEquipment.value.id, data);
  } else {
    emit("create", data);
  }
  showForm.value = false;
  editingEquipment.value = null;
}

function handleDelete(eq: Equipment) {
  const typed = prompt(
    `⚠️ Eliminación definitiva\n\n` +
    `Vas a eliminar el equipo "${eq.name}".\n\n` +
    `Se borrarán también TODAS sus mantenciones y adjuntos asociados.\n\n` +
    `Esta acción no se puede deshacer.\n\n` +
    `Escribí exactamente el nombre del equipo para confirmar:`
  );
  if (typed === eq.name) {
    emit("delete", eq.id);
  } else if (typed !== null) {
    alert("El nombre no coincide. No se eliminó nada.");
  }
}
</script>

<template>
  <div>
    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div class="flex items-center gap-2">
        <select
          v-model="statusFilter"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
          <option value="UNDER_MAINTENANCE">En mantención</option>
          <option value="DECOMMISSIONED">Dados de baja</option>
        </select>
        <span class="text-sm text-slate-500">
          {{ filteredEquipment.length }} equipo{{ filteredEquipment.length !== 1 ? "s" : "" }}
        </span>
      </div>
      <button
        class="inline-flex items-center gap-2 px-3.5 py-2 bg-primary-600 text-white text-sm font-medium
               rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        @click="openCreate"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo equipo
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
        <div class="h-5 bg-slate-200 rounded w-1/3 mb-2" />
        <div class="h-4 bg-slate-100 rounded w-1/2" />
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredEquipment.length === 0"
      class="bg-slate-50 rounded-lg border border-dashed border-slate-300 p-8 text-center"
    >
      <svg class="w-10 h-10 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <p class="text-slate-600 font-medium mb-1">
        {{ statusFilter ? "Sin equipos con ese estado" : "Sin equipos registrados" }}
      </p>
      <p class="text-sm text-slate-500 mb-4">
        {{ statusFilter ? "Prueba con otro filtro." : "Agrega el primer equipo a este cliente." }}
      </p>
      <button
        v-if="!statusFilter"
        class="inline-flex items-center gap-2 px-3.5 py-2 bg-primary-600 text-white text-sm font-medium
               rounded-lg hover:bg-primary-700"
        @click="openCreate"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Agregar equipo
      </button>
    </div>

    <!-- Equipment cards -->
    <div v-else class="space-y-3">
      <div
        v-for="eq in filteredEquipment"
        :key="eq.id"
        class="bg-white rounded-lg border border-slate-200 p-4 hover:border-primary-300
               hover:shadow-md transition-all cursor-pointer group"
        @click="openDetail(eq)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-medium text-slate-800 truncate group-hover:text-primary-700 transition-colors">
                {{ eq.name }}
              </h4>
              <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[eq.status]]">
                {{ STATUS_LABELS[eq.status] }}
              </span>
              <span
                v-if="eq.category"
                class="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
              >
                {{ eq.category.name }}
              </span>
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span v-if="eq.ip" class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                {{ eq.ip }}
              </span>
              <span v-if="eq.serial" class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {{ eq.serial }}
              </span>
              <span v-if="eq.assignedTo" class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {{ eq.assignedTo }}
              </span>
            </div>
            <!-- Software badge -->
            <span v-if="eq.softwareLicenses && eq.softwareLicenses.length > 0"
                  class="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {{ eq.softwareLicenses[0].name }}<span v-if="eq.softwareLicenses.length > 1"> +{{ eq.softwareLicenses.length - 1 }}</span>
            </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50
                     focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              title="Editar"
              @click.stop="openEdit(eq)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              v-if="auth.isAdmin"
              class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                     focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              title="Eliminar"
              @click.stop="handleDelete(eq)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit modal -->
    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
        @click.self="showForm = false"
      >
        <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-xl font-bold text-slate-800 mb-5">
            {{ editingEquipment ? "Editar equipo" : "Nuevo equipo" }}
          </h2>
          <EquipmentForm
            :equipment="editingEquipment"
            :loading="loading"
            :client-id="clientId"
            @submit="handleSubmit"
            @cancel="showForm = false"
          />
        </div>
      </div>
    </Teleport>

    <!-- Detail Modal -->
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
          <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl z-10">
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
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
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
              <h3 class="text-sm font-semibold text-slate-700 mb-3">Red e identificación</h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-slate-500 text-xs">IP</p>
                  <p class="text-slate-800 font-medium">{{ selectedEquipment.ip || "—" }}</p>
                </div>
                <div>
                  <p class="text-slate-500 text-xs">MAC</p>
                  <p class="text-slate-800 font-medium">{{ selectedEquipment.mac || "—" }}</p>
                </div>
                <div>
                  <p class="text-slate-500 text-xs">Serie</p>
                  <p class="text-slate-800 font-medium">{{ selectedEquipment.serial || "—" }}</p>
                </div>
                <div>
                  <p class="text-slate-500 text-xs">Asignado a</p>
                  <p class="text-slate-800 font-medium">{{ selectedEquipment.assignedTo || "—" }}</p>
                </div>
              </div>
            </div>

            <!-- License Info -->
            <div class="bg-slate-50 rounded-xl p-4">
              <h3 class="text-sm font-semibold text-slate-700 mb-3">Software instalado</h3>
              <ul v-if="selectedEquipment.softwareLicenses && selectedEquipment.softwareLicenses.length > 0"
                  class="space-y-2 text-sm">
                <li v-for="sw in selectedEquipment.softwareLicenses" :key="sw.id"
                    class="border-l-2 border-slate-200 pl-3">
                  <p class="font-medium text-slate-700">{{ sw.name }}</p>
                  <p v-if="sw.licenseType" class="text-xs text-slate-500">Licencia: {{ sw.licenseType }}</p>
                  <p v-if="sw.expiresAt" class="text-xs text-slate-500">Vence: {{ new Date(sw.expiresAt).toLocaleDateString("es") }}</p>
                  <p v-if="sw.notes" class="text-xs text-slate-500 italic">{{ sw.notes }}</p>
                </li>
              </ul>
              <p v-else class="text-sm text-slate-500">Sin software instalado</p>
            </div>

            <!-- Components -->
            <div
              v-if="selectedEquipment.processor || selectedEquipment.ram || selectedEquipment.disk"
              class="bg-slate-50 rounded-xl p-4"
            >
              <h3 class="text-sm font-semibold text-slate-700 mb-3">Componentes</h3>
              <div class="space-y-2 text-sm">
                <div v-if="selectedEquipment.processor" class="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                  <span class="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">CPU</span>
                  <span class="text-slate-800">{{ selectedEquipment.processor }}</span>
                </div>
                <div v-if="selectedEquipment.ram" class="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                  <span class="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">RAM</span>
                  <span class="text-slate-800">{{ selectedEquipment.ram }}</span>
                </div>
                <div v-if="selectedEquipment.disk" class="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                  <span class="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Disco</span>
                  <span class="text-slate-800">{{ selectedEquipment.disk }}</span>
                </div>
              </div>
            </div>

            <!-- Dates -->
            <div class="text-xs text-slate-400 space-y-1">
              <p>Creado: {{ new Date(selectedEquipment.createdAt).toLocaleDateString("es") }}</p>
              <p>Actualizado: {{ new Date(selectedEquipment.updatedAt).toLocaleDateString("es") }}</p>
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
                  openEdit(selectedEquipment!);
                  closeDetailModal();
                "
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
