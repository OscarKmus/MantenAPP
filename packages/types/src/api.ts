import type {
  User, Client, Equipment, Maintenance, MaintenanceItem, Attachment,
  ActionType, Template, TemplateItem, Notification,
  EquipmentCategory, EquipmentComponent, Software, InventoryItem,
} from "./models";

// ─── Auth ───────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export interface MeResponse {
  user: User;
}

// ─── Clients ────────────────────────────────────────────

export interface CreateClientRequest {
  name: string;
  location?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  frequencyDays?: number;
}

export interface UpdateClientRequest {
  name?: string;
  location?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  frequencyDays?: number;
  nextMaintenanceAt?: string | null;
  nextMaintenanceAgreedAt?: string | null;
}

export interface ClientListResponse {
  clients: Client[];
}

export interface ClientDetailResponse {
  client: Client;
  equipment: Equipment[];
  templates: Template[];
}

export interface ClientHistoryResponse {
  maintenances: Maintenance[];
  total: number;
  page: number;
  limit: number;
}

// ─── Equipment ──────────────────────────────────────────

export interface CreateEquipmentRequest {
  name: string;
  ip?: string;
  mac?: string;
  serial?: string;
  assignedTo?: string;
  status?: "ACTIVE" | "INACTIVE" | "UNDER_MAINTENANCE" | "DECOMMISSIONED";
}

export interface UpdateEquipmentRequest {
  name?: string;
  ip?: string;
  mac?: string;
  serial?: string;
  assignedTo?: string;
  status?: "ACTIVE" | "INACTIVE" | "UNDER_MAINTENANCE" | "DECOMMISSIONED";
  categoryId?: string | null;
  hasLicense?: boolean;
  licenseType?: string | null;
  licenseExpiresAt?: string | null;
  licenseNotes?: string | null;
}

export interface EquipmentListResponse {
  equipment: Equipment[];
}

// ─── Action Types ───────────────────────────────────────

export interface CreateActionTypeRequest {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateActionTypeRequest {
  name?: string;
  color?: string;
  icon?: string;
}

export interface ActionTypeListResponse {
  actionTypes: ActionType[];
}

// ─── Maintenances ───────────────────────────────────────

export interface CreateMaintenanceRequest {
  clientId: string;
  equipmentIds: string[];
  templateId?: string;
}

export interface UpdateMaintenanceRequest {
  notes?: string;
  status?: "DRAFT" | "IN_PROGRESS" | "CLOSED";
}

export interface UpdateMaintenanceItemRequest {
  actionTypeId?: string;
  observations?: string;
}

export interface CloseMaintenanceRequest {
  signatureData: string;
}

export interface MaintenanceDetailResponse {
  maintenance: Maintenance;
  items: (MaintenanceItem & { equipment: Equipment; actionType: ActionType | null })[];
  attachments: Attachment[];
}

// ─── Templates ──────────────────────────────────────────

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  equipmentIds: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  equipmentIds?: string[];
}

export interface TemplateListResponse {
  templates: Template[];
}

// ─── Notifications ──────────────────────────────────────

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface PushSubscribeRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ─── Health ─────────────────────────────────────────────

export interface HealthResponse {
  status: "ok";
  timestamp: string;
}

// ─── Equipment Categories ───────────────────────────────

export interface CreateEquipmentCategoryRequest {
  name: string;
  icon?: string;
  isComputer?: boolean;
  sortOrder?: number;
}

export interface UpdateEquipmentCategoryRequest {
  name?: string;
  icon?: string | null;
  isComputer?: boolean;
  sortOrder?: number;
}

export interface EquipmentCategoryListResponse {
  categories: EquipmentCategory[];
}

// ─── Equipment Components ───────────────────────────────

export interface CreateEquipmentComponentRequest {
  type: string;
  name: string;
  specs?: string;
  sortOrder?: number;
}

export interface UpdateEquipmentComponentRequest {
  type?: string;
  name?: string;
  specs?: string | null;
  sortOrder?: number;
}

export interface EquipmentComponentListResponse {
  components: EquipmentComponent[];
}

// ─── Software ───────────────────────────────────────────

export interface CreateSoftwareRequest {
  name: string;
  licenseType: string;
  clientId: string;
  equipmentId?: string | null;
  expiresAt: string;
  notes?: string;
}

export interface UpdateSoftwareRequest {
  name?: string;
  licenseType?: string;
  equipmentId?: string | null;
  expiresAt?: string;
  notes?: string | null;
}

export interface SoftwareListResponse {
  software: Software[];
}

// ─── Inventory ──────────────────────────────────────────

export interface InventoryListResponse {
  equipment: Equipment[];
  software: Software[];
}

export interface InventoryFilters {
  clientId?: string;
  categoryId?: string;
  status?: string;
  licenseType?: string;
  search?: string;
}
