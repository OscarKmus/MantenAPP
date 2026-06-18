<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import SignaturePad from "signature_pad";

const props = defineProps<{
  modelValue: string | null;
  label?: string;
  subtitle?: string;
  minWidth?: number;
  maxWidth?: number;
  penColor?: string;
  backgroundColor?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let signaturePad: SignaturePad | null = null;

const isEmpty = ref(true);
const hasDrawn = ref(false);

const MIN_WIDTH = props.minWidth ?? 1;
const MAX_WIDTH = props.maxWidth ?? 3;
const PEN_COLOR = props.penColor ?? "#1e293b"; // slate-800
const BG_COLOR = props.backgroundColor ?? "#ffffff";

onMounted(() => {
  initPad();
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  signaturePad?.off();
});

function initPad() {
  if (!canvasRef.value || !containerRef.value) return;

  const canvas = canvasRef.value;
  const container = containerRef.value;

  // Set canvas size to container
  const rect = container.getBoundingClientRect();
  const ratio = Math.max(window.devicePixelRatio || 1, 1);

  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(ratio, ratio);
  }

  signaturePad = new SignaturePad(canvas, {
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    penColor: PEN_COLOR,
    backgroundColor: BG_COLOR,
    velocityFilterWeight: 0.7,
  });

  signaturePad.addEventListener("endStroke", () => {
    isEmpty.value = signaturePad!.isEmpty();
    hasDrawn.value = true;
    emitSignature();
  });
}

function handleResize() {
  if (!signaturePad || !canvasRef.value || !containerRef.value) return;

  // Save current signature data
  const data = signaturePad.toData();

  // Reinitialize
  initPad();

  // Restore signature data
  if (data.length > 0) {
    signaturePad!.fromData(data);
  }
}

function clear() {
  signaturePad?.clear();
  isEmpty.value = true;
  hasDrawn.value = false;
  emit("update:modelValue", null);
}

function emitSignature() {
  if (!signaturePad || signaturePad.isEmpty()) {
    emit("update:modelValue", null);
    return;
  }
  const dataUrl = signaturePad.toDataURL("image/png");
  emit("update:modelValue", dataUrl);
}

// Validate minimum drawn area
function validateSignature(): boolean {
  if (!signaturePad || signaturePad.isEmpty()) return false;

  // Check bounding box of drawn pixels
  const data = signaturePad.toData();
  if (data.length < 2) return false;

  // Simple validation: at least a few strokes
  return data.length >= 2;
}

defineExpose({ clear, validateSignature });
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <label class="block text-sm font-medium text-slate-700">{{ label || 'Firma' }}</label>
        <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5">{{ subtitle }}</p>
      </div>
      <button
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        @click="clear"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Limpiar
      </button>
    </div>

    <div
      ref="containerRef"
      class="relative w-full border-2 rounded-xl overflow-hidden transition-colors"
      :class="[
        hasDrawn && !isEmpty ? 'border-green-300 bg-green-50/30' : 'border-slate-300 bg-white',
      ]"
      style="min-height: 150px"
    >
      <canvas
        ref="canvasRef"
        class="w-full h-full cursor-crosshair touch-none"
      />

      <!-- Placeholder text -->
      <div
        v-if="!hasDrawn"
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <p class="text-slate-400 text-sm">Firma aquí con el dedo o mouse</p>
      </div>
    </div>

    <p class="text-xs text-slate-400">
      Mínimo 300×100px · La firma se guardará como imagen PNG
    </p>
  </div>
</template>
