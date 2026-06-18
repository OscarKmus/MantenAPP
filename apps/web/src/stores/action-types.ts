import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/lib/api";
import type { ActionType } from "@mantenti/types";

export const useActionTypeStore = defineStore("action-types", () => {
  const actionTypes = ref<ActionType[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchActionTypes() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<{ actionTypes: ActionType[] }>("/action-types");
      actionTypes.value = data.actionTypes;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error loading action types";
    } finally {
      loading.value = false;
    }
  }

  async function createActionType(input: { name: string; color?: string; icon?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post<{ actionType: ActionType }>("/action-types", input);
      actionTypes.value.push(data.actionType);
      return data.actionType;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error creating action type";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateActionType(id: string, input: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch<{ actionType: ActionType }>(`/action-types/${id}`, input);
      const idx = actionTypes.value.findIndex((at) => at.id === id);
      if (idx !== -1) {
        actionTypes.value[idx] = data.actionType;
      }
      return data.actionType;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error updating action type";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteActionType(id: string) {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/action-types/${id}`);
      actionTypes.value = actionTypes.value.filter((at) => at.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error deleting action type";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    actionTypes,
    loading,
    error,
    fetchActionTypes,
    createActionType,
    updateActionType,
    deleteActionType,
  };
});
