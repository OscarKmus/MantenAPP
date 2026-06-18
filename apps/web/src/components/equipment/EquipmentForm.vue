<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import type { Equipment, EquipmentStatus, EquipmentCategory, Software } from "@mantenti/types";
import { useInventoryStore } from "@/stores/inventory";
import api from "@/lib/api";

const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "UNDER_MAINTENANCE", label: "En mantención" },
  { value: "DECOMMISSIONED", label: "Dado de baja" },
];

const props = defineProps<{
  equipment?: Equipment | null;
  loading?: boolean;
  clientId?: string;
}>();

const emit = defineEmits<{
  submit: [data: Record<string, unknown>];
  cancel: [];
}>();

const inventoryStore = useInventoryStore();
const activeTab = ref<"datos" | "componentes">("datos");
const showCategoryDialog = ref(false);
const showCategoryManager = ref(false);
const newCategoryName = ref("");
const newCategoryIsComputer = ref(false);
const editingCategory = ref<EquipmentCategory | null>(null);
const categoryManagerForm = ref({ name: "", isComputer: false });
const clientSoftware = ref<Software[]>([]);

const form = ref({
  name: "",
  ip: "",
  mac: "",
  serial: "",
  assignedTo: "",
  status: "ACTIVE" as EquipmentStatus,
  categoryId: null as string | null,
  softwareId: null as string | null,
  processor: "",
  ram: "",
  disk: "",
});

const errors = ref<Record<string, string>>({});

// Load categories on mount
onMounted(async () => {
  await inventoryStore.fetchCategories();
});

// Watch equipment prop
watch(
  () => props.equipment,
  async (eq) => {
    if (eq) {
      form.value = {
        name: eq.name,
        ip: eq.ip ?? "",
        mac: eq.mac ?? "",
        serial: eq.serial ?? "",
        assignedTo: eq.assignedTo ?? "",
        status: eq.status,
        categoryId: eq.categoryId ?? null,
        softwareId: eq.softwareId ?? null,
        processor: eq.processor ?? "",
        ram: eq.ram ?? "",
        disk: eq.disk ?? "",
      };
    }
  },
  { immediate: true }
);

// Load client software when clientId changes
watch(
  () => props.clientId,
  async (cid) => {
    if (cid) {
      try {
        const { data } = await api.get<{ software: Software[] }>(`/clients/${cid}/software`);
        clientSoftware.value = data.software;
      } catch {
        clientSoftware.value = [];
      }
    } else {
      clientSoftware.value = [];
    }
  },
  { immediate: true }
);

const isEditing = computed(() => !!props.equipment);

const selectedCategory = computed(() => {
  if (!form.value.categoryId) return null;
  return inventoryStore.categories.find((c) => c.id === form.value.categoryId) ?? null;
});

const showComponentsTab = computed(() => {
  return selectedCategory.value?.isComputer ?? false;
});

function getSoftwareExpirationColor(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const daysUntil = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 30) return "text-red-600";
  if (daysUntil < 90) return "text-amber-600";
  return "text-green-600";
}

function getSoftwareExpirationLabel(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const daysUntil = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "vencida";
  if (daysUntil < 30) return `vence en ${daysUntil}d`;
  if (daysUntil < 90) return `vence en ${Math.floor(daysUntil / 30)}m`;
  return `vence en ${Math.floor(daysUntil / 30)}m`;
}

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
    status: form.value.status,
  };

  const ip = form.value.ip.trim();
  if (ip) data.ip = ip;
  const mac = form.value.mac.trim();
  if (mac) data.mac = mac;
  const serial = form.value.serial.trim();
  if (serial) data.serial = serial;
  const assignedTo = form.value.assignedTo.trim();
  if (assignedTo) data.assignedTo = assignedTo;

  // Category
  data.categoryId = form.value.categoryId || null;

  // Software
  data.softwareId = form.value.softwareId || null;

  // Components (simple strings)
  const processor = form.value.processor.trim();
  if (processor) data.processor = processor;
  const ram = form.value.ram.trim();
  if (ram) data.ram = ram;
  const disk = form.value.disk.trim();
  if (disk) data.disk = disk;

  emit("submit", data);
}

async function createCategory() {
  if (!newCategoryName.value.trim()) return;

  try {
    const category = await inventoryStore.createCategory({
      name: newCategoryName.value.trim(),
      isComputer: newCategoryIsComputer.value,
    });
    form.value.categoryId = category.id;
    showCategoryDialog.value = false;
    newCategoryName.value = "";
    newCategoryIsComputer.value = false;
  } catch (err: any) {
    alert(err.response?.data?.error || "Error creating category");
  }
}

function openCategoryManager() {
  showCategoryManager.value = true;
}

function openEditCategory(cat: EquipmentCategory) {
  editingCategory.value = cat;
  categoryManagerForm.value = { name: cat.name, isComputer: cat.isComputer };
}

async function saveCategoryEdit() {
  if (!editingCategory.value || !categoryManagerForm.value.name.trim()) return;

  try {
    await inventoryStore.updateCategory(editingCategory.value.id, {
      name: categoryManagerForm.value.name.trim(),
      isComputer: categoryManagerForm.value.isComputer,
    });
    editingCategory.value = null;
  } catch (err: any) {
    alert(err.response?.data?.error || "Error updating category");
  }
}

async function deleteCategory(cat: EquipmentCategory) {
  if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;

  try {
    await inventoryStore.deleteCategory(cat.id);
    if (form.value.categoryId === cat.id) {
      form.value.categoryId = null;
    }
  } catch (err: any) {
    alert(err.response?.data?.error || "Error deleting category");
  }
}

function openAddComponent() {
  // Deprecated - components are now simple string fields
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Tabs -->
    <div class="border-b border-slate-200 -mx-6 px-6 overflow-x-auto">
      <nav class="flex gap-1 min-w-max" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'datos'"
          :class="[
            'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
            activeTab === 'datos'
              ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50',
          ]"
          @click="activeTab = 'datos'"
        >
          Datos
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'componentes'"
          :disabled="!showComponentsTab"
          :class="[
            'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
            activeTab === 'componentes'
              ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/50'
              : !showComponentsTab
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50',
          ]"
          @click="showComponentsTab && (activeTab = 'componentes')"
        >
          Componentes
          <span v-if="!showComponentsTab" class="text-xs ml-1">(solo computadoras)</span>
        </button>
      </nav>
    </div>

    <!-- Tab: Datos -->
    <div v-if="activeTab === 'datos'" class="space-y-4">
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

      <!-- Category -->
      <div>
        <label for="eq-category" class="block text-sm font-medium text-slate-700 mb-1.5">
          Categoría
        </label>
        <div class="flex gap-2">
          <select
            id="eq-category"
            v-model="form.categoryId"
            class="flex-1 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option :value="null">Sin categoría</option>
            <option
              v-for="cat in inventoryStore.categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}{{ cat.isComputer ? " 💻" : "" }}
            </option>
          </select>
          <button
            type="button"
            class="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600
                   hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            title="Crear nueva categoría"
            @click="showCategoryDialog = true"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600
                   hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            title="Gestionar categorías"
            @click="openCategoryManager"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
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

      <!-- Software instalado -->
      <div>
        <label for="eq-software" class="block text-sm font-medium text-slate-700 mb-1.5">
          Software instalado
          <span class="text-slate-400 font-normal">(opcional)</span>
        </label>
        <select
          id="eq-software"
          v-model="form.softwareId"
          class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option :value="null">Sin software asignado</option>
          <option
            v-for="sw in clientSoftware"
            :key="sw.id"
            :value="sw.id"
          >
            {{ sw.name }} — {{ getSoftwareExpirationLabel(sw.expiresAt) }}
          </option>
        </select>
        <p v-if="clientSoftware.length === 0 && clientId" class="mt-1.5 text-xs text-slate-500">
          Este cliente no tiene software registrado. Creá uno desde la pestaña Software del cliente.
        </p>
      </div>
    </div>

    <!-- Tab: Componentes -->
    <div v-if="activeTab === 'componentes'" class="space-y-4">
      <p class="text-sm text-slate-600">
        Especificaciones de hardware de este equipo.
      </p>

      <!-- Procesador -->
      <div>
        <label for="eq-processor" class="block text-sm font-medium text-slate-700 mb-1.5">
          Procesador
        </label>
        <input
          id="eq-processor"
          v-model="form.processor"
          type="text"
          class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="ej: Intel Core i7-12700"
        />
      </div>

      <!-- RAM -->
      <div>
        <label for="eq-ram" class="block text-sm font-medium text-slate-700 mb-1.5">
          RAM
        </label>
        <input
          id="eq-ram"
          v-model="form.ram"
          type="text"
          class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="ej: 16GB DDR4 3200MHz"
        />
      </div>

      <!-- Disco -->
      <div>
        <label for="eq-disk" class="block text-sm font-medium text-slate-700 mb-1.5">
          Disco
        </label>
        <input
          id="eq-disk"
          v-model="form.disk"
          type="text"
          class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="ej: 1TB NVMe SSD"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-2 border-t border-slate-200">
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

    <!-- Create Category Dialog -->
    <Teleport to="body">
      <div
        v-if="showCategoryDialog"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
        @click.self="showCategoryDialog = false"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
          <h3 class="text-lg font-bold text-slate-800 mb-4">Nueva categoría</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                v-model="newCategoryName"
                type="text"
                class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="ej: Servidor, Tablet..."
                @keyup.enter="createCategory"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                id="new-cat-computer"
                v-model="newCategoryIsComputer"
                type="checkbox"
                class="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <label for="new-cat-computer" class="text-sm text-slate-700">
                Es computadora (habilita pestaña de componentes)
              </label>
            </div>
          </div>
          <div class="flex gap-3 mt-5">
            <button
              type="button"
              class="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium
                     text-slate-700 hover:bg-slate-50"
              @click="showCategoryDialog = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-sm font-semibold text-white
                     hover:bg-primary-700"
              @click="createCategory"
            >
              Crear
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Category Manager Modal -->
    <Teleport to="body">
      <div
        v-if="showCategoryManager"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
        @click.self="showCategoryManager = false"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-slate-800">Gestionar categorías</h3>
            <button
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              @click="showCategoryManager = false"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Category list -->
          <div class="space-y-2 max-h-60 overflow-y-auto mb-4">
            <div
              v-for="cat in inventoryStore.categories"
              :key="cat.id"
              class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
            >
              <div v-if="editingCategory?.id === cat.id" class="flex-1 flex items-center gap-2">
                <input
                  v-model="categoryManagerForm.name"
                  type="text"
                  class="flex-1 rounded border border-slate-300 px-2 py-1 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
                  @keyup.enter="saveCategoryEdit"
                />
                <label class="flex items-center gap-1 text-xs text-slate-600">
                  <input
                    v-model="categoryManagerForm.isComputer"
                    type="checkbox"
                    class="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  PC
                </label>
                <button
                  type="button"
                  class="p-1 rounded text-green-600 hover:bg-green-50"
                  @click="saveCategoryEdit"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="p-1 rounded text-slate-400 hover:bg-slate-100"
                  @click="editingCategory = null"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div v-else class="flex-1 flex items-center gap-2">
                <span class="text-sm text-slate-800">{{ cat.name }}</span>
                <span v-if="cat.isComputer" class="text-xs text-slate-500">(PC)</span>
              </div>
              <div v-if="editingCategory?.id !== cat.id" class="flex items-center gap-1">
                <button
                  type="button"
                  class="p-1.5 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                  @click="openEditCategory(cat)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                  @click="deleteCategory(cat)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <p v-if="inventoryStore.categories.length === 0" class="text-sm text-slate-500 text-center py-4">
              No hay categorías creadas
            </p>
          </div>

          <!-- Close button -->
          <button
            type="button"
            class="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium
                   text-slate-700 hover:bg-slate-50"
            @click="showCategoryManager = false"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Teleport>
  </form>
</template>
