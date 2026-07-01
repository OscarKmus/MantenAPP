<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useClientStore } from "@/stores/clients";
import { useMultiSelect } from "@/composables/useMultiSelect";
import { useToast } from "@/composables/useToast";
import { cascadePreviewClients, bulkDeleteClients } from "@/lib/api/admin";
import ClientCard from "@/components/clients/ClientCard.vue";
import ClientForm from "@/components/clients/ClientForm.vue";
import AdminPasswordModal from "@/components/AdminPasswordModal.vue";
import CascadePreviewModal from "@/components/CascadePreviewModal.vue";
import BulkActionBar from "@/components/BulkActionBar.vue";

const router = useRouter();
const store = useClientStore();
const toast = useToast();

const showCreateModal = ref(false);

// Bulk delete state
const clientsRef = computed(() => store.filteredClients);
const multiSelect = useMultiSelect(clientsRef);
const showCascadePreview = ref(false);
const showAdminPassword = ref(false);
const cascadeCounts = ref<{ clients?: number; equipment: number; maintenanceItems: number; attachments: number }>({ equipment: 0, maintenanceItems: 0, attachments: 0 });
const cascadeLoading = ref(false);
const bulkDeleting = ref(false);

onMounted(() => {
  store.fetchClients();
});

function handleSearch() {
  store.fetchClients(store.searchQuery || undefined);
}

function handleCreate(data: Record<string, unknown>) {
  store.createClient(data).then(() => {
    showCreateModal.value = false;
  });
}

function goToClient(id: string) {
  router.push({ name: "client-detail", params: { id } });
}

async function handleDelete(id: string) {
  try {
    await store.deleteClient(id);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string };
    const msg = err?.response?.data?.error || err?.message || "No se pudo eliminar el cliente";
    toast.error(`No se pudo eliminar el cliente: ${msg}`);
  }
}

// Bulk delete flow
function handleBulkDeleteClick() {
  showCascadePreview.value = true;
  loadCascadePreview();
}

async function loadCascadePreview() {
  cascadeLoading.value = true;
  try {
    const ids = [...multiSelect.selectedIds.value];
    cascadeCounts.value = await cascadePreviewClients(ids);
  } catch {
    toast.error("Error al cargar la vista previa");
    showCascadePreview.value = false;
  } finally {
    cascadeLoading.value = false;
  }
}

function handleCascadeConfirm() {
  showCascadePreview.value = false;
  showAdminPassword.value = true;
}

function handleCascadeCancel() {
  showCascadePreview.value = false;
}

async function handleAdminSuccess(token: string) {
  showAdminPassword.value = false;
  bulkDeleting.value = true;
  try {
    const ids = [...multiSelect.selectedIds.value];
    await store.bulkDeleteClients(ids, token);
    toast.success(`${ids.length} cliente${ids.length !== 1 ? "s" : ""} eliminado${ids.length !== 1 ? "s" : ""}`);
    multiSelect.clear();
    store.fetchClients();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string };
    const msg = err?.response?.data?.error || err?.message || "Error al eliminar clientes";
    toast.error(msg);
  } finally {
    bulkDeleting.value = false;
  }
}

function handleAdminCancel() {
  showAdminPassword.value = false;
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Clientes</h1>
        <p class="text-sm text-slate-500 mt-1">Gestiona tus clientes y su mantenimiento</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold
               rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2
               focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        @click="showCreateModal = true"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo cliente
      </button>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <svg
          class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="store.searchQuery"
          type="text"
          placeholder="Buscar clientes..."
          class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @input="handleSearch"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="store.loading && !store.clients.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
        <div class="h-5 bg-slate-200 rounded w-3/4 mb-3" />
        <div class="h-4 bg-slate-100 rounded w-1/2 mb-3" />
        <div class="flex justify-between">
          <div class="h-3 bg-slate-100 rounded w-1/4" />
          <div class="h-3 bg-slate-100 rounded w-1/4" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="store.error"
      class="bg-red-50 border border-red-200 rounded-xl p-6 text-center"
    >
      <svg class="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-red-700 font-medium">{{ store.error }}</p>
      <button
        class="mt-3 text-sm text-red-600 underline hover:text-red-800"
        @click="store.fetchClients()"
      >
        Reintentar
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!store.loading && store.filteredClients.length === 0"
      class="bg-white rounded-xl border border-slate-200 p-12 text-center"
    >
      <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-slate-800 mb-2">
        {{ store.searchQuery ? "Sin resultados" : "Sin clientes aún" }}
      </h3>
      <p class="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
        {{ store.searchQuery
          ? "No se encontraron clientes con ese nombre. Intenta con otro término."
          : "Comienza agregando tu primer cliente para gestionar su mantenimiento."
        }}
      </p>
      <button
        v-if="!store.searchQuery"
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold
               rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        @click="showCreateModal = true"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Crear primer cliente
      </button>
    </div>

    <!-- Client grid header with select-all -->
    <div
      v-if="store.filteredClients.length > 0"
      class="flex items-center gap-3 mb-4"
    >
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          :checked="multiSelect.isAllSelected.value"
          :indeterminate="multiSelect.someSelected.value && !multiSelect.isAllSelected.value"
          class="w-4 h-4 rounded border-slate-300 text-primary-600
                 focus:ring-primary-500 cursor-pointer"
          @change="multiSelect.toggleAll()"
        />
        <span class="text-sm text-slate-600">
          {{ multiSelect.isAllSelected.value ? "Deseleccionar todos" : "Seleccionar todos" }}
        </span>
      </label>
    </div>

    <!-- Client grid -->
    <div v-if="store.filteredClients.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ClientCard
        v-for="client in store.filteredClients"
        :key="client.id"
        :client="client"
        :selected="multiSelect.selectedIds.value.has(client.id)"
        @click="goToClient(client.id)"
        @delete="handleDelete"
        @toggle="multiSelect.toggleOne"
      />
    </div>

    <!-- Create modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        @click.self="showCreateModal = false"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-xl font-bold text-slate-800 mb-5">Nuevo cliente</h2>
          <ClientForm
            :loading="store.loading"
            @submit="handleCreate"
            @cancel="showCreateModal = false"
          />
        </div>
      </div>
    </Teleport>

    <!-- Bulk action bar -->
    <BulkActionBar
      :count="multiSelect.selectedIds.value.size"
      label="clientes"
      @delete="handleBulkDeleteClick"
      @clear="multiSelect.clear()"
    />

    <!-- Cascade preview modal -->
    <CascadePreviewModal
      v-if="showCascadePreview"
      :counts="cascadeCounts"
      :loading="cascadeLoading"
      @confirm="handleCascadeConfirm"
      @cancel="handleCascadeCancel"
    />

    <!-- Admin password modal -->
    <AdminPasswordModal
      v-if="showAdminPassword"
      @success="handleAdminSuccess"
      @cancel="handleAdminCancel"
    />
  </div>
</template>
