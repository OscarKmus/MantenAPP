import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/lib/api";
import type { Equipment, Software, EquipmentCategory } from "@mantenti/types";

export const useInventoryStore = defineStore("inventory", () => {
  const equipment = ref<Equipment[]>([]);
  const software = ref<Software[]>([]);
  const categories = ref<EquipmentCategory[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Filters
  const filters = ref({
    clientId: "",
    categoryId: "",
    status: "",
    licenseType: "",
    search: "",
  });

  async function fetchInventory() {
    loading.value = true;
    error.value = null;
    try {
      const params: Record<string, string> = {};
      if (filters.value.clientId) params.clientId = filters.value.clientId;
      if (filters.value.categoryId) params.categoryId = filters.value.categoryId;
      if (filters.value.status) params.status = filters.value.status;
      if (filters.value.licenseType) params.licenseType = filters.value.licenseType;
      if (filters.value.search) params.search = filters.value.search;

      const { data } = await api.get<{ equipment: Equipment[]; software: Software[] }>(
        "/inventory",
        { params }
      );
      equipment.value = data.equipment;
      software.value = data.software;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error loading inventory";
    } finally {
      loading.value = false;
    }
  }

  async function fetchCategories() {
    try {
      const { data } = await api.get<{ categories: EquipmentCategory[] }>(
        "/equipment-categories"
      );
      categories.value = data.categories;
    } catch (err: any) {
      console.error("Error loading categories:", err);
    }
  }

  async function createCategory(input: { name: string; icon?: string; isComputer?: boolean }) {
    try {
      const { data } = await api.post<{ category: EquipmentCategory }>(
        "/equipment-categories",
        input
      );
      categories.value.push(data.category);
      return data.category;
    } catch (err: any) {
      throw err;
    }
  }

  async function updateCategory(id: string, input: { name?: string; icon?: string; isComputer?: boolean }) {
    try {
      const { data } = await api.patch<{ category: EquipmentCategory }>(
        `/equipment-categories/${id}`,
        input
      );
      const idx = categories.value.findIndex((c) => c.id === id);
      if (idx !== -1) {
        categories.value[idx] = data.category;
      }
      return data.category;
    } catch (err: any) {
      throw err;
    }
  }

  async function deleteCategory(id: string) {
    try {
      await api.delete(`/equipment-categories/${id}`);
      categories.value = categories.value.filter((c) => c.id !== id);
    } catch (err: any) {
      throw err;
    }
  }

  function setFilter(key: keyof typeof filters.value, value: string) {
    filters.value[key] = value;
  }

  function resetFilters() {
    filters.value = {
      clientId: "",
      categoryId: "",
      status: "",
      licenseType: "",
      search: "",
    };
  }

  return {
    equipment,
    software,
    categories,
    loading,
    error,
    filters,
    fetchInventory,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    setFilter,
    resetFilters,
  };
});
