// ─── Enums ──────────────────────────────────────────────

export type EquipmentStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "UNDER_MAINTENANCE"
  | "DECOMMISSIONED";

export type MaintenanceStatus = "DRAFT" | "IN_PROGRESS" | "CLOSED";

export type AttachmentScope = "MAINTENANCE" | "MAINTENANCE_ITEM";

export type ComponentType =
  | "RAM"
  | "CPU"
  | "DISK"
  | "GPU"
  | "PSU"
  | "MOTHERBOARD"
  | "OTHER";

export type LicenseType =
  | "OFFICE"
  | "NORTON"
  | "PDF"
  | "AUTOCAD"
  | "ANTIVIRUS"
  | "OTHER";

// ─── Domain Models ──────────────────────────────────────

export interface User {
  id: string;
  username: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  location: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  frequencyDays: number | null;
  nextMaintenanceBaseAt: string | null;
  nextMaintenanceAgreedAt: string | null;
  nextMaintenanceAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: string;
  clientId: string;
  categoryId: string | null;
  softwareId: string | null;
  name: string;
  ip: string | null;
  mac: string | null;
  serial: string | null;
  assignedTo: string | null;
  status: EquipmentStatus;
  createdAt: string;
  updatedAt: string;
  category?: EquipmentCategory | null;
  software?: Software | null;
  components?: EquipmentComponent[];
}

export interface ActionType {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface Maintenance {
  id: string;
  clientId: string;
  technicianId: string;
  status: MaintenanceStatus;
  notes: string | null;
  signatureData: string | null;
  pdfPath: string | null;
  pdfEngine: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceItem {
  id: string;
  maintenanceId: string;
  equipmentId: string;
  actionTypeId: string | null;
  observations: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  scope: AttachmentScope;
  parentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
}

export interface Template {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateItem {
  id: string;
  templateId: string;
  equipmentId: string;
  sortOrder: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  clientId: string | null;
  createdAt: string;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

// ─── Inventory ──────────────────────────────────────────

export interface EquipmentCategory {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
  isComputer: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentComponent {
  id: string;
  equipmentId: string;
  type: ComponentType;
  name: string;
  specs: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Software {
  id: string;
  name: string;
  licenseType: LicenseType;
  clientId: string;
  equipmentId: string | null;
  expiresAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  type: "equipment" | "software";
  name: string;
  clientId: string;
  clientName?: string;
  status?: EquipmentStatus;
  categoryName?: string;
  licenseType?: LicenseType;
  expiresAt?: string;
  createdAt: string;
}
