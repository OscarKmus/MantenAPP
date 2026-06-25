<script setup lang="ts">
defineProps<{
  currentStep: number;
  steps: string[];
}>();

const emit = defineEmits<{
  goTo: [step: number];
}>();
</script>

<template>
  <nav class="flex items-center justify-between" aria-label="Progreso">
    <ol class="flex items-center w-full">
      <li
        v-for="(label, idx) in steps"
        :key="idx"
        :class="[
          'flex items-center',
          idx < steps.length - 1 ? 'flex-1' : '',
        ]"
      >
        <button
          type="button"
          :class="[
            'flex items-center gap-2 text-sm font-medium transition-colors',
            idx === currentStep
              ? 'text-primary-700'
              : idx < currentStep
                ? 'text-green-700'
                : 'text-slate-400',
          ]"
          @click="emit('goTo', idx)"
        >
          <span
            :class="[
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors',
              idx === currentStep
                ? 'border-primary-600 bg-primary-600 text-white'
                : idx < currentStep
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-slate-300 bg-white text-slate-400',
            ]"
          >
            <svg
              v-if="idx < currentStep"
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else>{{ idx + 1 }}</span>
          </span>
          <span class="hidden sm:inline">{{ label }}</span>
        </button>
        <!-- Connector line -->
        <div
          v-if="idx < steps.length - 1"
          :class="[
            'flex-1 h-0.5 mx-3 rounded transition-colors',
            idx < currentStep ? 'bg-green-400' : 'bg-slate-200',
          ]"
        />
      </li>
    </ol>
  </nav>
</template>
