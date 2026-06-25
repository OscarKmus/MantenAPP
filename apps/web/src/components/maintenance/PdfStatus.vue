<script setup lang="ts">
import { computed } from "vue";
import { usePdfStore } from "@/stores/pdf";

const props = defineProps<{
  maintenanceId: string;
  pdfPath: string | null;
}>();

const emit = defineEmits<{
  "update:pdfPath": [value: string | null];
}>();

const pdfStore = usePdfStore();

const isGenerating = computed(() => pdfStore.isGenerating(props.maintenanceId));
const hasPdf = computed(() => !!props.pdfPath);

async function handleDownload() {
  try {
    await pdfStore.downloadPdf(props.maintenanceId);
  } catch (err: any) {
    alert(err.message);
  }
}

async function handleGenerateAndDownload() {
  try {
    await pdfStore.generateAndDownload(props.maintenanceId);
    // After generation, update pdfPath
    emit("update:pdfPath", "generated");
  } catch (err: any) {
    alert(err.message);
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- PDF ready -->
    <button
      v-if="hasPdf && !isGenerating"
      class="w-full px-5 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl
             hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500
             focus:ring-offset-2 flex items-center justify-center gap-2
             active:scale-[0.98] transition-transform"
      @click="handleDownload"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Descargar PDF
    </button>

    <!-- PDF not generated -->
    <button
      v-else-if="!hasPdf && !isGenerating"
      class="w-full px-5 py-3 border-2 border-dashed border-slate-300 text-slate-600 text-sm
             font-medium rounded-xl hover:border-primary-400 hover:text-primary-600
             hover:bg-primary-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500
             flex items-center justify-center gap-2 transition-colors"
      @click="handleGenerateAndDownload"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Generar PDF
    </button>

    <!-- Generating -->
    <div
      v-else
      class="w-full px-5 py-3 bg-slate-100 text-slate-500 text-sm font-medium rounded-xl
             flex items-center justify-center gap-2"
    >
      <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      Generando PDF...
    </div>

    <!-- Regenerate option if PDF exists -->
    <button
      v-if="hasPdf && !isGenerating"
      class="text-xs text-slate-400 hover:text-primary-600 underline text-center
             focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
      @click="handleGenerateAndDownload"
    >
      Regenerar PDF
    </button>
  </div>
</template>
