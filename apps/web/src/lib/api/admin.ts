/**
 * Admin API functions for bulk delete operations.
 * Uses the shared axios instance from api.ts.
 */
import api from "@/lib/api";

interface VerifyResponse {
  ok: boolean;
  token: string;
  expiresIn: number;
}

interface CascadePreviewResponse {
  clients?: number;
  equipment: number;
  maintenanceItems: number;
  attachments: number;
}

interface BulkDeleteResponse {
  deleted: number;
  ids: string[];
}

export async function verifyAdminPassword(password: string): Promise<VerifyResponse> {
  const { data } = await api.post<VerifyResponse>("/admin/verify", { password });
  return data;
}

export async function cascadePreviewClients(ids: string[]): Promise<CascadePreviewResponse> {
  const { data } = await api.post<CascadePreviewResponse>("/clients/cascade-preview", { ids });
  return data;
}

export async function bulkDeleteClients(ids: string[], adminToken: string): Promise<BulkDeleteResponse> {
  const { data } = await api.post<BulkDeleteResponse>(
    "/clients/bulk-delete",
    { ids },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return data;
}

export async function cascadePreviewEquipment(ids: string[]): Promise<CascadePreviewResponse> {
  const { data } = await api.post<CascadePreviewResponse>("/equipment/cascade-preview", { ids });
  return data;
}

export async function bulkDeleteEquipment(ids: string[], adminToken: string): Promise<BulkDeleteResponse> {
  const { data } = await api.post<BulkDeleteResponse>(
    "/equipment/bulk-delete",
    { ids },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return data;
}
