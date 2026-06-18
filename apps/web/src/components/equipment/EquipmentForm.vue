<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { Equipment, EquipmentStatus } from "@mantenti/types";

const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "UNDER_MAINTENANCE", label: "En mantención" },
  { value: "DECOMMISSIONED", label: "Dado de baja" },
];

const props = defineProps<{
  equipment?: Equipment | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [data: Record<string, unknown>];
  cancel: [];
}>();

const form = ref({
  name: "",
  ip: "",
  mac: "",
  serial: "",
  assignedTo: "",
  status: "ACTIVE" as EquipmentStatus,
});

const errors = ref<Record<string, string>>({});

watch(
  () => props.equipment,
  (eq) => {
    if (eq) {
      form.value = {
        name: eq.name,
        ip: eq.ip ?? "",
        mac: eq.mac ?? "",
        serial: eq.serial ?? "",
        assignedTo: eq.assignedTo ?? "",
        status: eq.status,
      };
    }
  },
  { immediate: true }
);

const isEditing = computed(() => !!props.equipment);

function validate(): boolean {
  errors.value = {};

  if (!form.value.name.trim()) {
    errors.value.name = "El nombre es requerido";
  }

  if (form.value.ip && !/^(\d{1,3}\.){3}\d{1,3}$/.test(form.value.ip)) {
    errors.value.ip = "Formato IP inválido (ej: 192.168.1.10)";
  }

  if (form.value.mac && !/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(form.value.mac)) {
    errors.value.mac = "Formato MAC inválido (ej: aa:bb:cc:dd:ee:ff)";
  }

  return Object.keys(errors.value).length === 0;
}

function handleSubmit() {
  if (!validate()) return;

  const data: Record<string, unknown> = {
    name: form.value.name.trim(),
    ip: form.value.ip.trim() || null,
    mac: form.value.mac.trim() || null,
    serial: form.value.serial.trim() || null,
    assignedTo: form.value.assignedTo.trim() || null,
    status: form.value.status,
  };

  emit("submit", data);
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Name -->
    <div>
      <label for="eq-name" class="block text-sm font-medium text-slate-700 mb-1.5">
        Nombre <span class="text-red-500">*</span>
      </label>
      <input
        id="eq-name"
        v-model="form.name"
        type="text"
        :class="[
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          errors.name ? 'border-red-300' : 'border-slate-300',
        ]"
        placeholder="Nombre del equipo"
      />
      <p v-if="errors.name" class="mt-1.5 text-xs text-red-600">{{ errors.name }}</p>
    </div>

    <!-- Status -->
    <div>
      <label for="eq-status" class="block text-sm font-medium text-slate-700 mb-1.5">
        Estado
      </label>
      <select
        id="eq-status"
        v-model="form.status"
        class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Network fields -->
    <fieldset class="border border-slate-200 rounded-lg p-4">
      <legend class="text-sm font-medium text-slate-700 px-2">Red e identificación</legend>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="eq-ip" class="block text-sm text-slate-600 mb-1">Dirección IP</label>
          <input
            id="eq-ip"
            v-model="form.ip"
            type="text"
            :class="[
              'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              errors.ip ? 'border-red-300' : 'border-slate-300',
            ]"
            placeholder="192.168.1.10"
          />
          <p v-if="errors.ip" class="mt-1 text-xs text-red-600">{{ errors.ip }}</p>
        </div>
        <div>
          <label for="eq-mac" class="block text-sm text-slate-600 mb-1">MAC Address</label>
          <input
            id="eq-mac"
            v-model="form.mac"
            type="text"
            :class="[
              'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              errors.mac ? 'border-red-300' : 'border-slate-300',
            ]"
            placeholder="aa:bb:cc:dd:ee:ff"
          />
          <p v-if="errors.mac" class="mt-1 text-xs text-red-600">{{ errors.mac }}</p>
        </div>
        <div>
          <label for="eq-serial" class="block text-sm text-slate-600 mb-1">Número de serie</label>
          <input
            id="eq-serial"
            v-model="form.serial"
            type="text"
            class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="SN-12345"
          />
        </div>
        <div>
          <label for="eq-assigned" class="block text-sm text-slate-600 mb-1">Asignado a</label>
          <input
            id="eq-assigned"
            v-model="form.assignedTo"
            type="text"
            class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Nombre de usuario"
          />
        </div>
      </div>
    </fieldset>

    <!-- Actions -->
    <div class="flex gap-3 pt-2">
      <button
        type="button"
        class="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700
               hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="loading"
        class="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-sm font-semibold text-white
               hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
               disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <svg
          v-if="loading"
          class="animate-spin w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        {{ isEditing ? "Guardar cambios" : "Agregar equipo" }}
      </button>
    </div>
  </form>
</template>
