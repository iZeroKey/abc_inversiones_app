import { buildApiUrl, readApiPayload } from "@/lib/api-client";
import type { MaritalStatus, PaginationMeta, UserRole } from "@/types/loans";
export type { PaginationMeta, UserRole };

export const USERS_PAGE_SIZE = 10;
const usersPreferencesKey = "abc-users-page-preferences";
const usersPreferencesVersion = 1;
let usersPreferencesCache: UsersPagePreferences | null = null;

export type UsersTab = "users" | "requests";
export type RoleFilter = "all" | UserRole;
export type StatusFilter = "all" | "active" | "inactive";
export type UserColumnKey =
  | "user"
  | "contact"
  | "dni"
  | "bank"
  | "bankAccounts"
  | "maritalStatus"
  | "role"
  | "status"
  | "createdAt"
  | "action";
export type UserColumnGroup = "Identidad" | "Operativo" | "Sistema";
export type RequestStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | string;
export type RequestRoleFilter = "all" | "client" | "investor";
export type RequestStatusFilter =
  | "all"
  | "pending"
  | "in_review"
  | "approved"
  | "rejected";

export type ManagedUser = {
  id: string;
  authUserId?: string | null;
  publicCode?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  dni?: string | null;
  address?: string | null;
  bank?: string | null;
  bankAccounts?: string[];
  maritalStatus?: MaritalStatus | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  role?: UserRole | string;
  active?: boolean;
  isOwner?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AccessRequest = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roleRequested?: "client" | "investor" | string;
  status?: RequestStatus;
  observation?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  dni: string;
  address: string;
  bank: string;
  bankAccounts: string[];
  maritalStatus: MaritalStatus | "none";
  active: boolean;
  createAuthAccount: boolean;
  password: string;
};

export type LinkAuthFormState = {
  email: string;
  password: string;
};

export type CurrentUser =
  | {
      id?: string;
      role?: string;
      isOwner?: boolean;
    }
  | null
  | undefined;

export type UserEditPermissions = {
  canUpdateAdministrativeFields: boolean;
  canUpdateActive: boolean;
};

export type UsersPagePreferences = {
  activeTab?: UsersTab;
  visibleColumns?: UserColumnKey[];
};

export const roleItems: { label: string; value: RoleFilter }[] = [
  { label: "Todos los roles", value: "all" },
  { label: "Clientes", value: "client" },
  { label: "Inversionistas", value: "investor" },
  { label: "Administradores", value: "admin" },
];

export const statusItems: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Inactivos", value: "inactive" },
];

export const userColumnsConfig: Array<{
  key: UserColumnKey;
  label: string;
  group: UserColumnGroup;
  defaultVisible: boolean;
}> = [
  { key: "user", label: "Usuario", group: "Identidad", defaultVisible: true },
  {
    key: "contact",
    label: "Contacto",
    group: "Identidad",
    defaultVisible: true,
  },
  { key: "dni", label: "DNI", group: "Operativo", defaultVisible: true },
  { key: "bank", label: "Banco", group: "Operativo", defaultVisible: true },
  {
    key: "bankAccounts",
    label: "Cuentas",
    group: "Operativo",
    defaultVisible: false,
  },
  {
    key: "maritalStatus",
    label: "Estado civil",
    group: "Operativo",
    defaultVisible: false,
  },
  { key: "role", label: "Rol", group: "Sistema", defaultVisible: true },
  { key: "status", label: "Acceso", group: "Sistema", defaultVisible: true },
  {
    key: "createdAt",
    label: "Registro",
    group: "Sistema",
    defaultVisible: true,
  },
  { key: "action", label: "Acción", group: "Sistema", defaultVisible: true },
];

export const defaultVisibleUserColumns = userColumnsConfig
  .filter((column) => column.defaultVisible)
  .map((column) => column.key);

export const userColumnGroups: UserColumnGroup[] = [
  "Identidad",
  "Operativo",
  "Sistema",
];

export const editableRoleItems: { label: string; value: UserRole }[] = [
  { label: "Cliente", value: "client" },
  { label: "Inversionista", value: "investor" },
  { label: "Administrador", value: "admin" },
];

export const maritalStatusItems: {
  label: string;
  value: MaritalStatus | "none";
}[] = [
  { label: "Sin registrar", value: "none" },
  { label: "Soltero/a", value: "single" },
  { label: "Casado/a", value: "married" },
  { label: "No especificado", value: "unspecified" },
];

export const requestRoleItems: { label: string; value: RequestRoleFilter }[] = [
  { label: "Todos los roles", value: "all" },
  { label: "Clientes", value: "client" },
  { label: "Inversionistas", value: "investor" },
];

export const requestStatusItems: {
  label: string;
  value: RequestStatusFilter;
}[] = [
  { label: "Todos", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "En revisión", value: "in_review" },
  { label: "Aprobadas", value: "approved" },
  { label: "Rechazadas", value: "rejected" },
];

export const defaultUserForm: UserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "client",
  dni: "",
  address: "",
  bank: "",
  bankAccounts: [""],
  maritalStatus: "none",
  active: true,
  createAuthAccount: false,
  password: "",
};

export const defaultLinkAuthForm: LinkAuthFormState = {
  email: "",
  password: "",
};

export function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((currentItem) => currentItem.id === item.id);
  if (index === -1) return [item, ...items];
  return items.map((currentItem) =>
    currentItem.id === item.id ? item : currentItem,
  );
}

export function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export function serializeBankAccounts(value?: string[] | null) {
  const accounts = value?.length ? value : [""];
  return accounts;
}

export function normalizeMaritalStatus(value: UserFormState["maritalStatus"]) {
  return value === "none" ? null : value;
}

export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function parsePhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").replace(/^51/, "").slice(0, 9);
}

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%&*";
  const bytes = new Uint32Array(12);
  window.crypto.getRandomValues(bytes);
  const core = Array.from(
    bytes,
    (value) => alphabet[value % alphabet.length],
  ).join("");
  return `${core}${symbols[bytes[0] % symbols.length]}${bytes[1] % 10}`;
}

export function buildUserPayload(
  form: UserFormState,
  options?: UserEditPermissions,
) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: nullableText(form.phone) ? `+51 ${form.phone}` : null,
    email: options?.canUpdateAdministrativeFields
      ? nullableText(form.email)
      : undefined,
    dni: nullableText(form.dni),
    address: nullableText(form.address),
    bank: nullableText(form.bank),
    bankAccounts: form.bankAccounts
      .map((account) => account.trim())
      .filter(Boolean),
    maritalStatus: normalizeMaritalStatus(form.maritalStatus),
    active: options?.canUpdateActive ? form.active : undefined,
  };
}

export async function createUser(
  fetchWithAuth: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>,
  form: UserFormState,
) {
  const createAuthAccount = form.role === "admin" || form.createAuthAccount;
  const response = await fetchWithAuth(buildApiUrl("/api/v1/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...buildUserPayload(form, {
        canUpdateAdministrativeFields: true,
        canUpdateActive: true,
      }),
      role: form.role,
      createAuthAccount,
      password: createAuthAccount ? form.password : undefined,
    }),
  });
  return readApiPayload<ManagedUser>(response);
}

export async function updateUser(
  fetchWithAuth: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>,
  userId: string,
  form: UserFormState,
  options: UserEditPermissions,
) {
  const response = await fetchWithAuth(buildApiUrl(`/api/v1/users/${userId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildUserPayload(form, options)),
  });
  return readApiPayload<ManagedUser>(response);
}

export async function linkAuthAccount(
  fetchWithAuth: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>,
  userId: string,
  form: LinkAuthFormState,
) {
  const response = await fetchWithAuth(
    buildApiUrl(`/api/v1/users/${userId}/auth-account`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
      }),
    },
  );
  return readApiPayload<ManagedUser>(response);
}

export async function reviewAccessRequest(
  fetchWithAuth: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>,
  requestId: string,
  status: "approved" | "rejected",
  observation: string,
  initialPassword?: string,
) {
  const response = await fetchWithAuth(
    buildApiUrl(`/api/v1/access-requests/${requestId}/status`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        observation: observation.trim() || undefined,
        initialPassword:
          status === "approved" ? initialPassword?.trim() : undefined,
      }),
    },
  );
  return readApiPayload<AccessRequest>(response);
}

export function readUsersPreferences(): UsersPagePreferences {
  if (usersPreferencesCache) return usersPreferencesCache;
  try {
    const preferences = JSON.parse(
      localStorage.getItem(usersPreferencesKey) ?? "{}",
    ) as UsersPagePreferences & { version?: number };
    usersPreferencesCache =
      preferences.version === undefined ||
      preferences.version === usersPreferencesVersion
        ? preferences
        : {};
    return usersPreferencesCache;
  } catch {
    usersPreferencesCache = {};
    return {};
  }
}

export function writeUsersPreferences(nextPreferences: UsersPagePreferences) {
  const currentPreferences = readUsersPreferences();
  usersPreferencesCache = { ...currentPreferences, ...nextPreferences };
  localStorage.setItem(
    usersPreferencesKey,
    JSON.stringify({
      ...usersPreferencesCache,
      version: usersPreferencesVersion,
    }),
  );
}

export function normalizeRequestStatus(
  status?: RequestStatus | null,
): RequestStatusFilter {
  if (status === "approved" || status === "rejected" || status === "in_review")
    return status;
  return "pending";
}

export function getRequestStatusLabel(status?: RequestStatus | null) {
  const labels: Record<RequestStatusFilter, string> = {
    all: "Todos",
    approved: "Aprobada",
    in_review: "En revisión",
    pending: "Pendiente",
    rejected: "Rechazada",
  };
  return labels[normalizeRequestStatus(status)];
}

export function normalizeRole(role?: string | null) {
  if (role === "admin" || role === "investor" || role === "client") return role;
  return "client";
}

export function normalizeEditableRole(role?: string | null): UserRole {
  return normalizeRole(role) as UserRole;
}

export function canManageUser(
  currentUser: CurrentUser,
  targetUser: ManagedUser | null,
) {
  if (!currentUser || !targetUser) return false;
  if (targetUser.isOwner) return false;
  if (currentUser.isOwner) return true;
  if (currentUser.id === targetUser.id) return true;
  return (
    currentUser.role === "admin" && normalizeRole(targetUser.role) !== "admin"
  );
}

export function canUseAdministrativeUpdate(
  currentUser: CurrentUser,
  targetUser: ManagedUser | null,
) {
  if (!currentUser || !targetUser) return false;
  if (targetUser.isOwner) return false;
  if (currentUser.isOwner) return true;
  return (
    currentUser.role === "admin" &&
    currentUser.id !== targetUser.id &&
    normalizeRole(targetUser.role) !== "admin"
  );
}

export function canLinkAuthAccount(
  currentUser: CurrentUser,
  targetUser: ManagedUser | null,
) {
  if (!targetUser?.id || targetUser.authUserId) return false;
  const role = normalizeRole(targetUser.role);
  if (role === "admin") return false;
  return canUseAdministrativeUpdate(currentUser, targetUser);
}

export function getUserEditPermissions(
  currentUser: CurrentUser,
  targetUser: ManagedUser | null,
): UserEditPermissions {
  const canUpdateAdministrativeFields = canUseAdministrativeUpdate(
    currentUser,
    targetUser,
  );
  return {
    canUpdateAdministrativeFields,
    canUpdateActive: canUpdateAdministrativeFields,
  };
}

export function getRoleLabel(role?: string | null) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    client: "Cliente",
    investor: "Inversionista",
  };
  return labels[role ?? ""] ?? role ?? "-";
}

export function displayPersonName(person: {
  firstName?: string;
  lastName?: string;
  email?: string | null;
}) {
  const name = [person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || person.email || "Usuario sin nombre";
}

export function getMaritalStatusLabel(status?: MaritalStatus | null) {
  const labels: Record<MaritalStatus, string> = {
    single: "Soltero/a",
    married: "Casado/a",
    unspecified: "No especificado",
  };
  return status ? labels[status] : "Sin registrar";
}

export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function initials(person: {
  firstName?: string;
  lastName?: string;
  email?: string | null;
}) {
  const first = person.firstName?.trim()[0];
  const last = person.lastName?.trim()[0];
  const fallback = person.email?.trim()[0] ?? "U";
  return `${first ?? fallback}${last ?? ""}`.toUpperCase();
}

export function isPendingRequest(status?: RequestStatus) {
  return !status || status === "pending" || status === "in_review";
}

export function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
