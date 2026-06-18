<script setup lang="ts">
import { ref } from "vue";
import type { Equipment, EquipmentStatus } from "@mantenti/types";
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
}>();

const emit = defineEmits<{
  create: [data: Record<string, unknown>];
  update: [id: string, data: Record<string, unknown>];
  delete: [id: string];
}>();

const showForm = ref(false);
const editingEquipment = ref<Equipment | null>(null);
const statusFilter = ref<EquipmentStatus | "">("");

const filteredEquipment = ref<Equipment[]>([]);

function applyFilter() {
  if (!statusFilter.value) {
    filteredEquipment.value = props.equipment;
  } else {
    filteredEquipment.value = props.equipment.filter((e) => e.status === statusFilter.value);
  }
}

// Watch for changes
import { watch } from "vue";
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
  if (confirm(`¿Eliminar "${eq.name}"?\n\nSi tiene historial de mantenciones, no se podrá borrar.`)) {
    emit("delete", eq.id);
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
        class="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-medium text-slate-800 truncate">{{ eq.name }}</h4>
              <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[eq.status]]">
                {{ STATUS_LABELS[eq.status] }}
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
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50
                     focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              title="Editar"
              @click="openEdit(eq)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                     focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              title="Eliminar"
              @click="handleDelete(eq)"
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
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        @click.self="showForm = false"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-xl font-bold text-slate-800 mb-5">
            {{ editingEquipment ? "Editar equipo" : "Nuevo equipo" }}
          </h2>
          <EquipmentForm
            :equipment="editingEquipment"
            :loading="loading"
            @submit="handleSubmit"
            @cancel="showForm = false"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
