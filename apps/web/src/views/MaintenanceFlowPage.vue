<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMaintenanceDraftStore } from "@/stores/maintenance-draft";
import { useAuthStore } from "@/stores/auth";
import StepIndicator from "@/components/maintenance/StepIndicator.vue";
import ItemCard from "@/components/maintenance/ItemCard.vue";
import PhotoUpload from "@/components/maintenance/PhotoUpload.vue";
import SignaturePad from "@/components/maintenance/SignaturePad.vue";
import PdfStatus from "@/components/maintenance/PdfStatus.vue";

const route = useRoute();
const router = useRouter();
const draftStore = useMaintenanceDraftStore();
const auth = useAuthStore();

const maintenanceId = computed(() => route.params.id as string);

const steps = ["Equipos", "Reporte", "Firma", "Listo"];

const activeItemIndex = ref(0);
const technicianSignaturePadRef = ref<InstanceType<typeof SignaturePad> | null>(null);
const clientSignaturePadRef = ref<InstanceType<typeof SignaturePad> | null>(null);
const closing = ref(false);
const closeError = ref<string | null>(null);
const pdfPath = ref<string | null>(null);

onMounted(async () => {
  // Try to hydrate from session
  const savedId = draftStore.hydrateFromSession();

  if (savedId === maintenanceId.value && draftStore.currentMaintenance) {
    // Already have this maintenance loaded
    return;
  }

  // Fetch from API
  await draftStore.fetchMaintenance(maintenanceId.value);

  if (!draftStore.currentMaintenance) {
    router.replace({ name: "clients" });
    return;
  }

  // Restore step from session if same maintenance
  if (savedId === maintenanceId.value) {
    // Step already hydrated
  } else {
    draftStore.currentStep = 0;
  }
});

const items = computed(() => draftStore.items);
const currentStep = computed(() => draftStore.currentStep);

const activeItem = computed(() => items.value[activeItemIndex.value] ?? null);

const maintenanceAttachments = computed(() => draftStore.getMaintenanceAttachments());

function handleUpdateItem(itemId: string, data: Record<string, unknown>) {
  draftStore.updateItem(itemId, data);
}

function handleToggleComplete(itemId: string, completed: boolean) {
  draftStore.updateItem(itemId, { completed });
}

function handleRemoveItem(itemId: string) {
  if (confirm("¿Eliminar este equipo de la mantención?")) {
    draftStore.removeItem(itemId);
    if (activeItemIndex.value >= items.value.length) {
      activeItemIndex.value = Math.max(0, items.value.length - 1);
    }
  }
}

function handleItemPhotoUpload(file: File) {
  if (!activeItem.value) return;
  draftStore.addAttachment(file, "MAINTENANCE_ITEM", activeItem.value.id);
}

function handleItemPhotoRemove(attachmentId: string) {
  draftStore.removeAttachment(attachmentId);
}

function handleGeneralPhotoUpload(file: File) {
  if (!draftStore.currentMaintenance) return;
  draftStore.addAttachment(file, "MAINTENANCE", draftStore.currentMaintenance.id);
}

function handleGeneralPhotoRemove(attachmentId: string) {
  draftStore.removeAttachment(attachmentId);
}

function goToPrevItem() {
  if (activeItemIndex.value > 0) {
    activeItemIndex.value--;
  }
}

function goToNextItem() {
  if (activeItemIndex.value < items.value.length - 1) {
    activeItemIndex.value++;
  }
}

async function handleClose() {
  if (!draftStore.technicianSignature || !draftStore.clientSignature) {
    closeError.value = "Ambas firmas son requeridas";
    return;
  }

  closing.value = true;
  closeError.value = null;

  try {
    const result = await draftStore.closeMaintenance();
    pdfPath.value = result?.pdfPath ?? null;
    draftStore.goToStep(3);
  } catch (err: any) {
    closeError.value = err.response?.data?.error || "Error al cerrar la mantención";
  } finally {
    closing.value = false;
  }
}

function handleBackToClient() {
  if (draftStore.currentMaintenance) {
    draftStore.clearSession();
    router.push({ name: "client-detail", params: { id: draftStore.currentMaintenance.clientId } });
  } else {
    router.push({ name: "clients" });
  }
}

function handleBackToClientConfirm() {
  const confirmed = confirm(
    "¿Volver al cliente?\n\nTu progreso se guarda en este navegador. Podés retomar la mantención desde el detalle del cliente."
  );
  if (confirmed) {
    handleBackToClient();
  }
}

function handleGoToStep(step: number) {
  // Don't allow going forward past signature if not signed
  if (step > 1 && (!draftStore.technicianSignature || !draftStore.clientSignature) && step !== 3) {
    return;
  }
  draftStore.goToStep(step);
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Loading -->
    <div v-if="draftStore.loading && !draftStore.currentMaintenance" class="space-y-6">
      <div class="h-8 bg-slate-200 rounded w-1/3 animate-pulse" />
      <div class="h-48 bg-slate-100 rounded-xl animate-pulse" />
    </div>

    <!-- Error -->
    <div
      v-else-if="draftStore.error && !draftStore.currentMaintenance"
      class="bg-red-50 border border-red-200 rounded-xl p-8 text-center"
    >
      <p class="text-red-700 font-medium">{{ draftStore.error }}</p>
      <button
        class="mt-3 text-sm text-red-600 underline"
        @click="router.push({ name: 'clients' })"
      >
        Volver a clientes
      </button>
    </div>

    <!-- Main content -->
    <template v-else-if="draftStore.currentMaintenance">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-800">Mantención en curso</h1>
            <p class="text-sm text-slate-500 mt-1">
              {{ items.length }} equipos · {{ draftStore.completedCount }} completados
            </p>
          </div>
          <button
            v-if="currentStep < 3"
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                   text-slate-500 hover:text-slate-700 hover:bg-slate-100
                   focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            @click="handleBackToClientConfirm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver a cliente
          </button>
        </div>
      </div>

      <!-- Step indicator -->
      <div class="mb-8">
        <StepIndicator
          :current-step="currentStep"
          :steps="steps"
          @go-to="handleGoToStep"
        />
      </div>

      <!-- Step 0: Items -->
      <div v-if="currentStep === 0" class="space-y-4">
        <!-- Item navigation (mobile-first: one at a time) -->
        <div class="flex items-center justify-between mb-2">
          <button
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                   text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="activeItemIndex === 0"
            @click="goToPrevItem"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Anterior
          </button>
          <span class="text-sm text-slate-500">
            {{ activeItemIndex + 1 }} / {{ items.length }}
          </span>
          <button
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                   text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="activeItemIndex >= items.length - 1"
            @click="goToNextItem"
          >
            Siguiente
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Active item card -->
        <ItemCard
          v-if="activeItem"
          :key="activeItem.id"
          :item="activeItem"
          :item-attachments="draftStore.getItemAttachments(activeItem.id)"
          :is-active="true"
          :is-admin="auth.isAdmin"
          @update="handleUpdateItem"
          @remove="handleRemoveItem"
          @upload-photo="handleItemPhotoUpload"
          @remove-photo="handleItemPhotoRemove"
          @toggle-complete="handleToggleComplete"
        />

        <!-- Item list (compact) -->
        <div class="mt-6 border-t border-slate-200 pt-4">
          <h3 class="text-sm font-semibold text-slate-700 mb-3">Todos los equipos</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              v-for="(item, idx) in items"
              :key="item.id"
              :class="[
                'text-left px-3 py-2 rounded-lg border text-sm transition-all',
                idx === activeItemIndex
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : item.completedAt
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              ]"
              @click="activeItemIndex = idx"
            >
              <div class="flex items-center gap-1.5">
                <svg
                  v-if="item.completedAt"
                  class="w-3.5 h-3.5 text-green-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="truncate">{{ item.equipment.name }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Next step button -->
        <div class="sticky bottom-0 bg-white border-t border-slate-200 -mx-4 px-4 py-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <button
            class="w-full px-6 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl
                   hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500
                   flex items-center justify-center gap-2"
            @click="draftStore.nextStep()"
          >
            Continuar al reporte
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Step 1: Report preview -->
      <div v-else-if="currentStep === 1" class="space-y-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <h2 class="text-lg font-semibold text-slate-800 mb-4">Resumen de mantención</h2>

          <!-- Summary table -->
          <div class="space-y-3">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
            >
              <div class="flex-1 min-w-0">
                <div class="font-medium text-slate-800">{{ item.equipment.name }}</div>
                <div class="text-sm text-slate-500 mt-0.5">
                  {{ item.actionType?.name ?? "Sin tipo" }}
                </div>
                <div v-if="item.observations" class="text-sm text-slate-600 mt-1">
                  {{ item.observations }}
                </div>
              </div>
              <div
                v-if="item.actionType?.color"
                class="w-3 h-3 rounded-full shrink-0 mt-1"
                :style="{ backgroundColor: item.actionType.color }"
              />
            </div>
          </div>
        </div>

        <!-- General photos -->
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-700 mb-3">Fotos generales del sitio</h3>
          <PhotoUpload
            :attachments="maintenanceAttachments"
            :max-files="10"
            :can-remove="auth.isAdmin"
            @upload="handleGeneralPhotoUpload"
            @remove="handleGeneralPhotoRemove"
          />
        </div>

        <!-- Navigation -->
        <div class="flex gap-3">
          <button
            class="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-700
                   hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            @click="draftStore.prevStep()"
          >
            <div class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </div>
          </button>
          <button
            class="flex-1 px-4 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl
                   hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            @click="draftStore.nextStep()"
          >
            <div class="flex items-center justify-center gap-2">
              Continuar a firma
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      <!-- Step 2: Signature -->
      <div v-else-if="currentStep === 2" class="space-y-6">
        <!-- Technician signature -->
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <SignaturePad
            ref="technicianSignaturePadRef"
            :model-value="draftStore.technicianSignature"
            label="Firma del técnico"
            subtitle="Confirmá que realizaste la mantención"
            @update:model-value="draftStore.setTechnicianSignature"
          />
        </div>

        <!-- Client signature -->
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <SignaturePad
            ref="clientSignaturePadRef"
            :model-value="draftStore.clientSignature"
            label="Firma del cliente"
            subtitle="Firma del responsable del cliente que recibe la mantención"
            @update:model-value="draftStore.setClientSignature"
          />
        </div>

        <!-- Error -->
        <div v-if="closeError" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {{ closeError }}
        </div>

        <!-- Navigation -->
        <div class="flex gap-3">
          <button
            class="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-700
                   hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            @click="draftStore.prevStep()"
          >
            <div class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </div>
          </button>
          <button
            class="flex-1 px-4 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl
                   hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="!draftStore.technicianSignature || !draftStore.clientSignature || closing"
            @click="handleClose"
          >
            <svg
              v-if="closing"
              class="animate-spin w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Confirmar firmas y cerrar
          </button>
        </div>
      </div>

      <!-- Step 3: Done -->
      <div v-else-if="currentStep === 3" class="text-center py-12">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-slate-800 mb-2">¡Mantención cerrada!</h2>
        <p class="text-slate-500 mb-8">
          La mantención ha sido registrada exitosamente con firma digital.
        </p>

        <div class="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-6 text-left max-w-sm mx-auto">
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-500">Equipos revisados:</span>
              <span class="font-medium text-slate-800">{{ items.length }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Completados:</span>
              <span class="font-medium text-green-700">{{ draftStore.completedCount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Firma técnico:</span>
              <span class="font-medium text-green-700">Capturada</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Firma cliente:</span>
              <span class="font-medium text-green-700">Capturada</span>
            </div>
          </div>
        </div>

        <!-- PDF Status -->
        <div class="max-w-sm mx-auto mb-6">
          <PdfStatus
            :maintenance-id="maintenanceId"
            :pdf-path="pdfPath"
            @update:pdf-path="pdfPath = $event"
          />
        </div>

        <button
          class="px-6 py-3 bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl
                 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
          @click="handleBackToClient"
        >
          Volver al cliente
        </button>
      </div>
    </template>
  </div>
</template>
