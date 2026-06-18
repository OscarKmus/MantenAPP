<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { MaintenanceItemWithRelations } from "@/stores/maintenance-draft";
import type { Attachment } from "@mantenti/types";
import ActionTypeSelect from "./ActionTypeSelect.vue";
import PhotoUpload from "./PhotoUpload.vue";

const props = defineProps<{
  item: MaintenanceItemWithRelations;
  itemAttachments: Attachment[];
  isActive: boolean;
}>();

const emit = defineEmits<{
  update: [itemId: string, data: Record<string, unknown>];
  remove: [itemId: string];
  uploadPhoto: [file: File];
  removePhoto: [id: string];
  toggleComplete: [itemId: string, completed: boolean];
}>();

const observations = ref(props.item.observations ?? "");
const actionTypeId = ref<string | null>(props.item.actionTypeId);

// Sync when item changes
watch(
  () => props.item,
  (item) => {
    observations.value = item.observations ?? "";
    actionTypeId.value = item.actionTypeId;
  }
);

const isCompleted = computed(() => props.item.completedAt !== null);

function handleActionTypeChange(value: string | null) {
  actionTypeId.value = value;
  emit("update", props.item.id, { actionTypeId: value });
}

function handleObservationsBlur() {
  if (observations.value !== (props.item.observations ?? "")) {
    emit("update", props.item.id, { observations: observations.value || null });
  }
}

function handleToggleComplete() {
  emit("toggleComplete", props.item.id, !isCompleted.value);
}
</script>

<template>
  <div
    :class="[
      'bg-white rounded-xl border transition-all',
      isActive ? 'border-primary-300 shadow-md ring-1 ring-primary-200' : 'border-slate-200',
    ]"
  >
    <!-- Equipment header -->
    <div class="flex items-center justify-between p-4 border-b border-slate-100">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-slate-800 truncate">{{ item.equipment.name }}</h3>
          <span
            v-if="item.actionType?.color"
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ backgroundColor: item.actionType.color }"
          />
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-1">
          <span v-if="item.equipment.ip">{{ item.equipment.ip }}</span>
          <span v-if="item.equipment.serial">SN: {{ item.equipment.serial }}</span>
          <span v-if="item.equipment.assignedTo">{{ item.equipment.assignedTo }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            isCompleted
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          ]"
          @click="handleToggleComplete"
        >
          <svg
            v-if="isCompleted"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg
            v-else
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4" />
          </svg>
          {{ isCompleted ? "Completado" : "Marcar" }}
        </button>
      </div>
    </div>

    <!-- Form content (visible when active) -->
    <div v-if="isActive" class="p-4 space-y-4">
      <!-- Action type -->
      <ActionTypeSelect
        :model-value="actionTypeId"
        @update:model-value="handleActionTypeChange"
      />

      <!-- Observations -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Observaciones</label>
        <textarea
          v-model="observations"
          rows="3"
          class="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                 resize-none"
          placeholder="Describe el trabajo realizado, hallazgos, recomendaciones..."
          maxlength="2000"
          @blur="handleObservationsBlur"
        />
        <p class="mt-1 text-xs text-slate-400 text-right">
          {{ observations.length }}/2000
        </p>
      </div>

      <!-- Photos -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Fotos del equipo</label>
        <PhotoUpload
          :attachments="itemAttachments"
          :max-files="10"
          @upload="(file) => emit('uploadPhoto', file)"
          @remove="(id) => emit('removePhoto', id)"
        />
      </div>
    </div>

    <!-- Collapsed summary -->
    <div v-else class="px-4 py-2 text-xs text-slate-500 flex items-center gap-2">
      <span v-if="item.actionType">{{ item.actionType.name }}</span>
      <span v-if="item.observations" class="truncate">{{ item.observations }}</span>
      <span v-if="itemAttachments.length > 0">{{ itemAttachments.length }} foto(s)</span>
    </div>
  </div>
</template>
