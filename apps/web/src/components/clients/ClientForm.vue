<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { Client } from "@mantenti/types";

const props = defineProps<{
  client?: Client | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [data: Record<string, unknown>];
  cancel: [];
}>();

const form = ref({
  name: "",
  location: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  frequencyDays: null as number | null,
  nextMaintenanceAgreedAt: "",
  nextMaintenanceAt: "",
});

const errors = ref<Record<string, string>>({});

// Populate form when editing
watch(
  () => props.client,
  (c) => {
    if (c) {
      form.value = {
        name: c.name,
        location: c.location ?? "",
        contactName: c.contactName ?? "",
        contactPhone: c.contactPhone ?? "",
        contactEmail: c.contactEmail ?? "",
        frequencyDays: c.frequencyDays,
        nextMaintenanceAgreedAt: c.nextMaintenanceAgreedAt
          ? new Date(c.nextMaintenanceAgreedAt).toISOString().slice(0, 10)
          : "",
        nextMaintenanceAt: c.nextMaintenanceAt
          ? new Date(c.nextMaintenanceAt).toISOString().slice(0, 10)
          : "",
      };
    }
  },
  { immediate: true }
);

const isEditing = computed(() => !!props.client);

function validate(): boolean {
  errors.value = {};
  if (!form.value.name.trim()) {
    errors.value.name = "El nombre es requerido";
  }
  if (form.value.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.contactEmail)) {
    errors.value.contactEmail = "Email inválido";
  }
  if (form.value.frequencyDays !== null && form.value.frequencyDays < 1) {
    errors.value.frequencyDays = "Debe ser mayor a 0";
  }
  return Object.keys(errors.value).length === 0;
}

function handleSubmit() {
  if (!validate()) return;

  const data: Record<string, unknown> = {
    name: form.value.name.trim(),
    location: form.value.location.trim() || undefined,
    contactName: form.value.contactName.trim() || undefined,
    contactPhone: form.value.contactPhone.trim() || undefined,
    contactEmail: form.value.contactEmail.trim() || undefined,
    frequencyDays: form.value.frequencyDays,
  };

  if (isEditing.value) {
    data.nextMaintenanceAgreedAt = form.value.nextMaintenanceAgreedAt
      ? new Date(form.value.nextMaintenanceAgreedAt).toISOString()
      : null;
    data.nextMaintenanceAt = form.value.nextMaintenanceAt
      ? new Date(form.value.nextMaintenanceAt).toISOString()
      : null;
  }

  emit("submit", data);
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <!-- Name -->
    <div>
      <label for="client-name" class="block text-sm font-medium text-slate-700 mb-1.5">
        Nombre <span class="text-red-500">*</span>
      </label>
      <input
        id="client-name"
        v-model="form.name"
        type="text"
        :class="[
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          errors.name
            ? 'border-red-300 text-red-900'
            : 'border-slate-300 text-slate-900',
        ]"
        placeholder="Nombre del cliente"
      />
      <p v-if="errors.name" class="mt-1.5 text-xs text-red-600">{{ errors.name }}</p>
    </div>

    <!-- Location -->
    <div>
      <label for="client-location" class="block text-sm font-medium text-slate-700 mb-1.5">
        Ubicación
      </label>
      <input
        id="client-location"
        v-model="form.location"
        type="text"
        class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        placeholder="Dirección o ubicación"
      />
    </div>

    <!-- Contact section -->
    <fieldset class="border border-slate-200 rounded-lg p-4">
      <legend class="text-sm font-medium text-slate-700 px-2">Contacto</legend>
      <div class="space-y-4">
        <div>
          <label for="contact-name" class="block text-sm text-slate-600 mb-1">Nombre de contacto</label>
          <input
            id="contact-name"
            v-model="form.contactName"
            type="text"
            class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Persona de contacto"
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="contact-phone" class="block text-sm text-slate-600 mb-1">Teléfono</label>
            <input
              id="contact-phone"
              v-model="form.contactPhone"
              type="tel"
              class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div>
            <label for="contact-email" class="block text-sm text-slate-600 mb-1">Email</label>
            <input
              id="contact-email"
              v-model="form.contactEmail"
              type="email"
              :class="[
                'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.contactEmail ? 'border-red-300' : 'border-slate-300',
              ]"
              placeholder="contacto@empresa.cl"
            />
            <p v-if="errors.contactEmail" class="mt-1 text-xs text-red-600">{{ errors.contactEmail }}</p>
          </div>
        </div>
      </div>
    </fieldset>

    <!-- Frequency + Maintenance section -->
    <fieldset class="border border-slate-200 rounded-lg p-4">
      <legend class="text-sm font-medium text-slate-700 px-2">Mantenimiento</legend>
      <div class="space-y-4">
        <!-- Frequency -->
        <div>
          <label for="frequency" class="block text-sm text-slate-600 mb-1">
            Frecuencia (días)
          </label>
          <input
            id="frequency"
            v-model.number="form.frequencyDays"
            type="number"
            min="1"
            max="3650"
            :class="[
              'block w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              errors.frequencyDays ? 'border-red-300' : 'border-slate-300',
            ]"
            placeholder="Ej: 30 para mensual"
          />
          <p v-if="errors.frequencyDays" class="mt-1 text-xs text-red-600">{{ errors.frequencyDays }}</p>
          <p class="mt-1 text-xs text-slate-400">
            Cada cuántos días se repite el mantenimiento. La fecha base se calcula automáticamente.
          </p>
        </div>

        <!-- 3-state model (only when editing) -->
        <template v-if="isEditing">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <p class="font-medium mb-1">Modelo híbrido de próximo mantenimiento</p>
            <p>
              <strong>Base</strong>: se calcula de la última mantención + frecuencia.
              <strong>Acordado</strong>: fecha negociada con el cliente.
              <strong>Efectivo</strong>: la fecha que se muestra en el sistema.
            </p>
          </div>

          <div>
            <label for="agreed-date" class="block text-sm text-slate-600 mb-1">
              Fecha acordada con cliente
            </label>
            <input
              id="agreed-date"
              v-model="form.nextMaintenanceAgreedAt"
              type="date"
              class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p class="mt-1 text-xs text-slate-400">
              Si se establece, esta fecha tiene prioridad sobre la base.
            </p>
          </div>

          <div>
            <label for="effective-date" class="block text-sm text-slate-600 mb-1">
              Fecha efectiva (override manual)
            </label>
            <input
              id="effective-date"
              v-model="form.nextMaintenanceAt"
              type="date"
              class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p class="mt-1 text-xs text-slate-400">
              Sobreescribe todas las demás fechas. Déjalo vacío para usar la fecha acordada o base.
            </p>
          </div>
        </template>
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
        {{ isEditing ? "Guardar cambios" : "Crear cliente" }}
      </button>
    </div>
  </form>
</template>
