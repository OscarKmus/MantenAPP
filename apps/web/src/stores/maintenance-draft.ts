import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/api";
import type {
  Maintenance,
  MaintenanceItem,
  Equipment,
  ActionType,
  Attachment,
} from "@mantenti/types";

export interface MaintenanceItemWithRelations extends MaintenanceItem {
  equipment: Equipment;
  actionType: ActionType | null;
}

export interface MaintenanceDraft {
  maintenance: Maintenance;
  items: MaintenanceItemWithRelations[];
  attachments: Attachment[];
}

const SESSION_KEY = "mantenti-maintenance-draft";

export const useMaintenanceDraftStore = defineStore("maintenance-draft", () => {
  const currentMaintenance = ref<Maintenance | null>(null);
  const items = ref<MaintenanceItemWithRelations[]>([]);
  const attachments = ref<Attachment[]>([]);
  const clientSignature = ref<string | null>(null);
  const technicianSignature = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentStep = ref(0); // 0=items, 1=report, 2=signature, 3=done

  const completedCount = computed(() =>
    items.value.filter((i) => i.completedAt !== null).length
  );

  const totalItems = computed(() => items.value.length);

  // Persist to sessionStorage
  function persistToSession() {
    try {
      const data = {
        maintenanceId: currentMaintenance.value?.id,
        currentStep: currentStep.value,
        clientSignature: clientSignature.value,
        technicianSignature: technicianSignature.value,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch {
      // sessionStorage may be full or unavailable
    }
  }

  function hydrateFromSession(): string | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      currentStep.value = data.currentStep ?? 0;
      clientSignature.value = data.clientSignature ?? data.signature ?? null;
      technicianSignature.value = data.technicianSignature ?? null;
      return data.maintenanceId ?? null;
    } catch {
      return null;
    }
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // Fetch full maintenance detail
  async function fetchMaintenance(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<{
        maintenance: Maintenance;
        items: MaintenanceItemWithRelations[];
        attachments: Attachment[];
      }>(`/maintenances/${id}`);
      currentMaintenance.value = data.maintenance;
      items.value = data.items;
      attachments.value = data.attachments;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error loading maintenance";
    } finally {
      loading.value = false;
    }
  }

  // Create a new maintenance draft
  async function startMaintenance(clientId: string, equipmentIds: string[], templateId?: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post<{ maintenance: Maintenance & { items: MaintenanceItemWithRelations[] } }>(
        "/maintenances",
        { clientId, equipmentIds, templateId }
      );
      currentMaintenance.value = data.maintenance;
      items.value = data.maintenance.items;
      attachments.value = [];
      clientSignature.value = null;
      technicianSignature.value = null;
      currentStep.value = 0;
      persistToSession();
      return data.maintenance;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error starting maintenance";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Update an item (action type, observations, completed)
  async function updateItem(itemId: string, input: Record<string, unknown>) {
    if (!currentMaintenance.value) return;
    try {
      const { data } = await api.patch<{ item: MaintenanceItemWithRelations }>(
        `/maintenances/${currentMaintenance.value.id}/items/${itemId}`,
        input
      );
      const idx = items.value.findIndex((i) => i.id === itemId);
      if (idx !== -1) {
        items.value[idx] = data.item;
      }
      return data.item;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error updating item";
      throw err;
    }
  }

  // Remove an item
  async function removeItem(itemId: string) {
    if (!currentMaintenance.value) return;
    try {
      await api.delete(`/maintenances/${currentMaintenance.value.id}/items/${itemId}`);
      items.value = items.value.filter((i) => i.id !== itemId);
      // Also remove attachments for this item
      attachments.value = attachments.value.filter((a) => a.parentId !== itemId);
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error removing item";
      throw err;
    }
  }

  // Upload attachment (to maintenance or item scope)
  async function addAttachment(file: File, scope: "MAINTENANCE" | "MAINTENANCE_ITEM", parentId: string) {
    if (!currentMaintenance.value) return;
    try {
      const formData = new FormData();
      formData.append("file", file);

      const url =
        scope === "MAINTENANCE"
          ? `/maintenances/${currentMaintenance.value.id}/attachments`
          : `/maintenances/${currentMaintenance.value.id}/items/${parentId}/attachments`;

      const { data } = await api.post<{ attachment: Attachment }>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      attachments.value.push(data.attachment);
      return data.attachment;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error uploading attachment";
      throw err;
    }
  }

  // Remove an attachment
  async function removeAttachment(attachmentId: string) {
    try {
      await api.delete(`/attachments/${attachmentId}`);
      attachments.value = attachments.value.filter((a) => a.id !== attachmentId);
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error removing attachment";
      throw err;
    }
  }

  // Set signature data URLs
  function setClientSignature(dataUrl: string | null) {
    clientSignature.value = dataUrl;
    persistToSession();
  }

  function setTechnicianSignature(dataUrl: string | null) {
    technicianSignature.value = dataUrl;
    persistToSession();
  }

  // Close maintenance with both signatures
  async function closeMaintenance() {
    if (!currentMaintenance.value || !clientSignature.value || !technicianSignature.value) {
      throw new Error("Missing maintenance or signatures");
    }

    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post<{ maintenance: Maintenance; pdfPath: string | null }>(
        `/maintenances/${currentMaintenance.value.id}/close`,
        {
          clientSignatureData: clientSignature.value,
          technicianSignatureData: technicianSignature.value,
        }
      );
      currentMaintenance.value = data.maintenance;
      currentStep.value = 3; // done step
      persistToSession();
      return data;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error closing maintenance";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Navigate steps
  function goToStep(step: number) {
    currentStep.value = step;
    persistToSession();
  }

  function nextStep() {
    if (currentStep.value < 3) {
      currentStep.value++;
      persistToSession();
    }
  }

  function prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--;
      persistToSession();
    }
  }

  // Reset the draft
  function reset() {
    currentMaintenance.value = null;
    items.value = [];
    attachments.value = [];
    clientSignature.value = null;
    technicianSignature.value = null;
    currentStep.value = 0;
    loading.value = false;
    error.value = null;
    clearSession();
  }

  // Get attachments for a specific item
  function getItemAttachments(itemId: string) {
    return attachments.value.filter(
      (a) => a.scope === "MAINTENANCE_ITEM" && a.parentId === itemId
    );
  }

  // Get maintenance-level attachments
  function getMaintenanceAttachments() {
    return attachments.value.filter((a) => a.scope === "MAINTENANCE");
  }

  return {
    currentMaintenance,
    items,
    attachments,
    clientSignature,
    technicianSignature,
    loading,
    error,
    currentStep,
    completedCount,
    totalItems,
    fetchMaintenance,
    startMaintenance,
    updateItem,
    removeItem,
    addAttachment,
    removeAttachment,
    setClientSignature,
    setTechnicianSignature,
    closeMaintenance,
    goToStep,
    nextStep,
    prevStep,
    reset,
    getItemAttachments,
    getMaintenanceAttachments,
    persistToSession,
    hydrateFromSession,
    clearSession,
  };
});
