import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/api";
import type { Client, Equipment, Template } from "@mantenti/types";

interface ClientWithMeta extends Client {
  equipmentCount: number;
}

export const useClientStore = defineStore("clients", () => {
  const clients = ref<ClientWithMeta[]>([]);
  const currentClient = ref<(Client & { equipment: Equipment[]; templates: Template[]; equipmentCount: number }) | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const searchQuery = ref("");

  const filteredClients = computed(() => {
    if (!searchQuery.value) return clients.value;
    const q = searchQuery.value.toLowerCase();
    return clients.value.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.contactName?.toLowerCase().includes(q)
    );
  });

  async function fetchClients(query?: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<{ clients: ClientWithMeta[] }>("/clients", {
        params: query ? { q: query } : {},
      });
      clients.value = data.clients;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error loading clients";
    } finally {
      loading.value = false;
    }
  }

  async function fetchClient(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<{
        client: Client;
        equipment: Equipment[];
        templates: Template[];
        equipmentCount: number;
      }>(`/clients/${id}`);
      currentClient.value = data as any;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error loading client";
    } finally {
      loading.value = false;
    }
  }

  async function createClient(input: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post<{ client: Client }>("/clients", input);
      clients.value.push({ ...data.client, equipmentCount: 0 } as ClientWithMeta);
      return data.client;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error creating client";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateClient(id: string, input: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.patch<{ client: Client }>(`/clients/${id}`, input);
      const idx = clients.value.findIndex((c) => c.id === id);
      if (idx !== -1) {
        clients.value[idx] = { ...clients.value[idx], ...data.client };
      }
      if (currentClient.value?.id === id) {
        currentClient.value = { ...currentClient.value, ...data.client };
      }
      return data.client;
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error updating client";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteClient(id: string) {
    loading.value = true;
    error.value = null;
    try {
      await api.delete(`/clients/${id}`);
      clients.value = clients.value.filter((c) => c.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.error || "Error deleting client";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    clients,
    currentClient,
    loading,
    error,
    searchQuery,
    filteredClients,
    fetchClients,
    fetchClient,
    createClient,
    updateClient,
    deleteClient,
  };
});
