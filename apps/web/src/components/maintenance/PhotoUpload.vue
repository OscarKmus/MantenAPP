<script setup lang="ts">
import { ref, computed } from "vue";
import { usePhotoResize } from "@/composables/usePhotoResize";

const props = defineProps<{
  attachments: Array<{ id: string; fileName: string; mimeType: string; storagePath?: string }>;
  maxFiles?: number;
  disabled?: boolean;
  canRemove?: boolean;
}>();

const emit = defineEmits<{
  upload: [file: File];
  remove: [id: string];
}>();

const { resizePhoto } = usePhotoResize();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadError = ref<string | null>(null);

const remainingSlots = computed(() => {
  const max = props.maxFiles ?? 20;
  return Math.max(0, max - props.attachments.length);
});

const isFull = computed(() => remainingSlots.value <= 0);

function triggerFileInput() {
  if (!props.disabled && !isFull.value) {
    fileInput.value?.click();
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    processFiles(Array.from(input.files));
    input.value = ""; // Reset for re-selection
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  if (event.dataTransfer?.files) {
    processFiles(Array.from(event.dataTransfer.files));
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

async function processFiles(files: File[]) {
  uploadError.value = null;

  // Validate file count
  const available = remainingSlots.value;
  if (files.length > available) {
    uploadError.value = `Solo puedes subir ${available} archivo(s) más`;
    return;
  }

  // Validate each file
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      uploadError.value = `"${file.name}" no es una imagen válida`;
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      uploadError.value = `"${file.name}" excede el límite de 10MB`;
      return;
    }
  }

  uploading.value = true;
  uploadProgress.value = 0;

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadProgress.value = Math.round(((i) / files.length) * 100);

      // Resize before upload
      const resized = await resizePhoto(file);
      emit("upload", resized);
    }
    uploadProgress.value = 100;
  } catch (err: any) {
    uploadError.value = err.message || "Error al procesar la imagen";
  } finally {
    uploading.value = false;
    setTimeout(() => {
      uploadProgress.value = 0;
    }, 1000);
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Drop zone -->
    <div
      v-if="!isFull"
      :class="[
        'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        isDragging
          ? 'border-primary-400 bg-primary-50'
          : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ]"
      role="button"
      tabindex="0"
      :aria-label="isDragging ? 'Soltar archivo aquí' : 'Arrastra o selecciona fotos'"
      @click="triggerFileInput"
      @keydown.enter="triggerFileInput"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <div class="flex flex-col items-center gap-2">
        <svg
          class="w-8 h-8"
          :class="isDragging ? 'text-primary-500' : 'text-slate-400'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p class="text-sm font-medium" :class="isDragging ? 'text-primary-700' : 'text-slate-600'">
          {{ isDragging ? "Soltar aquí" : "Arrastra fotos o haz clic" }}
        </p>
        <p class="text-xs text-slate-400">
          JPEG, PNG, WebP · Máx 10MB · {{ remainingSlots }} restante{{ remainingSlots !== 1 ? "s" : "" }}
        </p>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic"
      multiple
      class="hidden"
      :disabled="disabled || isFull"
      @change="handleFileSelect"
    />

    <!-- Upload progress -->
    <div v-if="uploading" class="bg-primary-50 rounded-lg p-3">
      <div class="flex items-center gap-3">
        <svg class="animate-spin w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span class="text-sm text-primary-700">Procesando... {{ uploadProgress }}%</span>
      </div>
      <div class="mt-2 h-1.5 bg-primary-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-primary-500 rounded-full transition-all duration-300"
          :style="{ width: `${uploadProgress}%` }"
        />
      </div>
    </div>

    <!-- Error -->
    <p v-if="uploadError" class="text-sm text-red-600 flex items-center gap-1.5">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ uploadError }}
    </p>

    <!-- Thumbnail grid -->
    <div v-if="attachments.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
      <div
        v-for="att in attachments"
        :key="att.id"
        class="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
      >
        <img
          :src="`/api/files/${att.storagePath || ''}`"
          :alt="att.fileName"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <button
          v-if="!disabled && (canRemove !== false)"
          class="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0
                 group-hover:opacity-100 transition-opacity focus:opacity-100
                 focus:outline-none focus:ring-2 focus:ring-red-500"
          :aria-label="`Eliminar ${att.fileName}`"
          @click.stop="emit('remove', att.id)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
