<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import api from "@/lib/api";
import type { Maintenance } from "@mantenti/types";

const props = defineProps<{
  clientId: string;
}>();

const router = useRouter();
const maintenances = ref<(Maintenance & { technician?: { fullName: string }; _count?: { items: number } })[]>([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const limit = 20;

async function fetchHistory(pageNum: number = 1) {
  loading.value = true;
  try {
    const { data } = await api.get<{
      maintenances: typeof maintenances.value;
      total: number;
      page: number;
      limit: number;
    }>(`/clients/${props.clientId}/maintenances`, {
      params: { status: "CLOSED", page: pageNum, limit },
    });
    maintenances.value = data.maintenances;
    total.value = data.total;
    page.value = data.page;
  } catch {
    maintenances.value = [];
  } finally {
    loading.value = false;
  }
}

function navigateToDetail(id: string) {
  router.push({ name: "maintenance-flow", params: { id } });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

onMounted(() => fetchHistory());

watch(() => props.clientId, () => fetchHistory());
</script>

<template>
  <div>
    <!-- Loading skeleton -->
    <div v-if="loading && maintenances.length === 0" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
        <div class="h-4 bg-slate-200 rounded w-1/3 mb-2" />
        <div class="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="maintenances.length === 0"
      class="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center"
    >
      <svg class="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-slate-600 font-medium">Sin mantenciones cerradas</p>
      <p class="text-sm text-slate-500 mt-1">
        Las mantenciones cerradas aparecerán aquí.
      </p>
    </div>

    <!-- List -->
    <ul v-else class="space-y-2 list-none" role="list">
      <li
        v-for="m in maintenances"
        :key="m.id"
        role="listitem"
      >
      <button
        class="w-full text-left bg-white rounded-lg border border-slate-200 p-4
               hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer
               focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        @click="navigateToDetail(m.id)"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800">
              {{ formatDate(m.closedAt) }}
            </p>
            <div class="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span v-if="m.technician?.fullName" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {{ m.technician.fullName }}
              </span>
              <span v-if="m._count?.items" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {{ m._count.items }} equipos
              </span>
            </div>
          </div>
          <svg class="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        </button>
      </li>
    </ul>

    <!-- Pagination -->
    <div
      v-if="total > limit"
      class="flex items-center justify-center gap-4 mt-4"
    >
      <button
        class="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg
               hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed
               focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        :disabled="page <= 1"
        @click="fetchHistory(page - 1)"
      >
        Anterior
      </button>
      <span class="text-sm text-slate-500">
        Página {{ page }} de {{ Math.ceil(total / limit) }}
      </span>
      <button
        class="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg
               hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed
               focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        :disabled="page >= Math.ceil(total / limit)"
        @click="fetchHistory(page + 1)"
      >
        Siguiente
      </button>
    </div>
  </div>
</template>
