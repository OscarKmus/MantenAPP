<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useActionTypeStore } from "@/stores/action-types";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{
  modelValue: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const store = useActionTypeStore();
const auth = useAuthStore();
const showCreate = ref(false);
const newName = ref("");
const newColor = ref("#3b82f6");
const creating = ref(false);

onMounted(() => {
  if (store.actionTypes.length === 0) {
    store.fetchActionTypes();
  }
});

const selectedType = computed(() =>
  store.actionTypes.find((at) => at.id === props.modelValue) ?? null
);

function handleSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value === "__create__") {
    openCreate();
    // Reset select to current value
    (event.target as HTMLSelectElement).value = props.modelValue ?? "";
  } else {
    emit("update:modelValue", value || null);
  }
}

function openCreate() {
  showCreate.value = true;
  newName.value = "";
  newColor.value = "#3b82f6";
}

async function handleCreate() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const type = await store.createActionType({
      name: newName.value.trim(),
      color: newColor.value,
    });
    emit("update:modelValue", type.id);
    showCreate.value = false;
  } catch {
    // Error already set in store
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-slate-700">Tipo de acción</label>

    <div class="relative">
      <select
        :value="modelValue ?? ''"
        class="block w-full rounded-lg border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm shadow-sm
               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
               appearance-none bg-white"
        @change="handleSelect"
      >
        <option value="">Seleccionar tipo...</option>
        <option
          v-for="at in store.actionTypes"
          :key="at.id"
          :value="at.id"
        >
          {{ at.name }}
        </option>
        <option v-if="auth.isAdmin" value="__create__">+ Nuevo tipo</option>
      </select>
      <!-- Color indicator -->
      <div
        class="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-slate-300"
        :style="{ backgroundColor: selectedType?.color ?? '#cbd5e1' }"
      />
    </div>

    <!-- Inline create form (ADMIN only) -->
    <div
      v-if="showCreate && auth.isAdmin"
      class="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3"
    >
      <div>
        <input
          v-model="newName"
          type="text"
          placeholder="Nombre del tipo"
          class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500"
          maxlength="100"
          @keydown.enter="handleCreate"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="text-xs text-slate-600">Color:</label>
        <input
          v-model="newColor"
          type="color"
          class="w-8 h-8 rounded border border-slate-300 cursor-pointer"
        />
        <div class="flex-1" />
        <button
          type="button"
          class="text-xs text-slate-500 hover:text-slate-700"
          @click="showCreate = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg
                 hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1.5"
          :disabled="!newName.trim() || creating"
          @click="handleCreate"
        >
          <svg
            v-if="creating"
            class="animate-spin w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Crear
        </button>
      </div>
    </div>
  </div>
</template>
