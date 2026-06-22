import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/lib/api";
import { bulkDeleteEquipment as apiBulkDeleteEquipment } from "@/lib/api/admin";
import type { Equipment, EquipmentStatus } from "@mantenti/types";

export const useEquipmentStore = defineStore("equipment", () => {
  const equipment = ref<Equipment[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const statusFilter = ref<EquipmentStatus | "">("");

  async function fetchEquipment(clientId: string, status?: EquipmentStatus) {
    loading.value = true;
    error.value = null;
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const { data } = await api.get<{ equipment: Equipment[] }>(
        `/clients/${clientId}/equipment`,
        { params }
      );
      equipment.value = data.equipment;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error loading equipment";
    } finally {
      loading.value = false;
    }
  }

  async function createEquipment(clientId: string, input: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    try {
      console.log("[equipment store] POST /clients/" + clientId + "/equipment", input);
      const { data } = await api.post<{ equipment: Equipment }>(
        `/clients/${clientId}/equipment`,
        input
      );
      console.log("[equipment store] created OK:", data.equipment);
      equipment.value.push(data.equipment);
      return data.equipment;
    } catch (err: any) {
      console.error("[equipment store] create FAILED:", err?.response?.status, err?.response?.data, err?.message);
      error.value = err.response?.data?.error || "Error creating equipment";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateEquipment(id: string, input: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch<{ equipment: Equipment }>(`/equipment/${id}`, input);
      const idx = equipment.value.findIndex((e) => e.id === id);
      if (idx !== -1) {
        equipment.value[idx] = data.equipment;
      }
      return data.equipment;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error updating equipment";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteEquipment(id: string) {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/equipment/${id}`);
      equipment.value = equipment.value.filter((e) => e.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error deleting equipment";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function bulkDeleteEquipment(ids: string[], adminToken: string) {
    loading.value = true;
    error.value = null;
    try {
      await apiBulkDeleteEquipment(ids, adminToken);
      equipment.value = equipment.value.filter((e) => !ids.includes(e.id));
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error deleting equipment";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    equipment,
    loading,
    error,
    statusFilter,
    fetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    bulkDeleteEquipment,
  };
});
