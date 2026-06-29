import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import {
  BadgeCheckIcon,
  BanknoteIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  CopyIcon,
  Dice5Icon,
  EyeIcon,
  IdCardIcon,
  KeyRoundIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Settings2Icon,
  ShieldIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  DataTableCard,
  DataTableColumnHeader,
  DataTableSkeleton,
  DataTableStaticHeader,
} from "@/components/data-table-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Drawer,
  DrawerPopup,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-media-query"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import { getAuthQueryScope } from "@/features/loans/loan-queries"
import { queryKeys } from "@/lib/query-keys"
import { realtimeDomainEvent, type RealtimeDomainDetail } from "@/lib/realtime"
import { cn } from "@/lib/utils"
import type { ApiResponse, MaritalStatus, PaginationMeta, UserRole } from "@/types/loans"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
const USERS_PAGE_SIZE = 10
const usersPreferencesKey = "abc-users-page-preferences"
const usersPreferencesVersion = 1
let usersPreferencesCache: UsersPagePreferences | null = null

type UsersTab = "users" | "requests"
type RoleFilter = "all" | UserRole
type StatusFilter = "all" | "active" | "inactive"
type UserColumnKey = "user" | "contact" | "dni" | "bank" | "bankAccounts" | "maritalStatus" | "role" | "status" | "createdAt" | "action"
type UserColumnGroup = "Identidad" | "Operativo" | "Sistema"
type RequestStatus = "pending" | "in_review" | "approved" | "rejected" | string
type RequestRoleFilter = "all" | "client" | "investor"
type RequestStatusFilter = "all" | "pending" | "in_review" | "approved" | "rejected"

type ManagedUser = {
  id: string
  authUserId?: string | null
  publicCode?: string | null
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  dni?: string | null
  address?: string | null
  bank?: string | null
  bankAccounts?: string[]
  maritalStatus?: MaritalStatus | null
  avatarUrl?: string | null
  avatar?: string | null
  role?: UserRole | string
  active?: boolean
  isOwner?: boolean
  createdAt?: string
  updatedAt?: string
}

type AccessRequest = {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  roleRequested?: "client" | "investor" | string
  status?: RequestStatus
  observation?: string | null
  createdAt?: string
  updatedAt?: string
}

type UserFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  dni: string
  address: string
  bank: string
  bankAccounts: string[]
  maritalStatus: MaritalStatus | "none"
  active: boolean
  createAuthAccount: boolean
  password: string
}

type LinkAuthFormState = {
  email: string
  password: string
}

type CurrentUser = {
  id?: string
  role?: string
  isOwner?: boolean
} | null | undefined

type UserEditPermissions = {
  canUpdateAdministrativeFields: boolean
  canUpdateActive: boolean
}

type UsersEnvelope = {
  users?: ManagedUser[]
  items?: ManagedUser[]
  results?: ManagedUser[]
}

type RequestsEnvelope = {
  accessRequests?: AccessRequest[]
  requests?: AccessRequest[]
  items?: AccessRequest[]
  results?: AccessRequest[]
}

const roleItems: { label: string; value: RoleFilter }[] = [
  { label: "Todos los roles", value: "all" },
  { label: "Clientes", value: "client" },
  { label: "Inversionistas", value: "investor" },
  { label: "Administradores", value: "admin" },
]

const statusItems: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Inactivos", value: "inactive" },
]

const userColumnsConfig: Array<{ key: UserColumnKey; label: string; group: UserColumnGroup; defaultVisible: boolean }> = [
  { key: "user", label: "Usuario", group: "Identidad", defaultVisible: true },
  { key: "contact", label: "Contacto", group: "Identidad", defaultVisible: true },
  { key: "dni", label: "DNI", group: "Operativo", defaultVisible: true },
  { key: "bank", label: "Banco", group: "Operativo", defaultVisible: true },
  { key: "bankAccounts", label: "Cuentas", group: "Operativo", defaultVisible: false },
  { key: "maritalStatus", label: "Estado civil", group: "Operativo", defaultVisible: false },
  { key: "role", label: "Rol", group: "Sistema", defaultVisible: true },
  { key: "status", label: "Acceso", group: "Sistema", defaultVisible: true },
  { key: "createdAt", label: "Registro", group: "Sistema", defaultVisible: true },
  { key: "action", label: "Acción", group: "Sistema", defaultVisible: true },
]

const defaultVisibleUserColumns = userColumnsConfig
  .filter((column) => column.defaultVisible)
  .map((column) => column.key)

const userColumnGroups: UserColumnGroup[] = ["Identidad", "Operativo", "Sistema"]

type UsersPagePreferences = {
  activeTab?: UsersTab
  visibleColumns?: UserColumnKey[]
}

const editableRoleItems: { label: string; value: UserRole }[] = [
  { label: "Cliente", value: "client" },
  { label: "Inversionista", value: "investor" },
  { label: "Administrador", value: "admin" },
]

const maritalStatusItems: { label: string; value: MaritalStatus | "none" }[] = [
  { label: "Sin registrar", value: "none" },
  { label: "Soltero/a", value: "single" },
  { label: "Casado/a", value: "married" },
  { label: "No especificado", value: "unspecified" },
]

const requestRoleItems: { label: string; value: RequestRoleFilter }[] = [
  { label: "Todos los roles", value: "all" },
  { label: "Clientes", value: "client" },
  { label: "Inversionistas", value: "investor" },
]

const requestStatusItems: { label: string; value: RequestStatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "En revisión", value: "in_review" },
  { label: "Aprobadas", value: "approved" },
  { label: "Rechazadas", value: "rejected" },
]

const defaultUserForm: UserFormState = {
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
}

const defaultLinkAuthForm: LinkAuthFormState = {
  email: "",
  password: "",
}

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("No se encontró VITE_API_URL para consultar el servidor.")
  }

  return API_BASE_URL
}

function unwrapUsers(data: ManagedUser[] | UsersEnvelope | null | undefined) {
  if (Array.isArray(data)) return data
  return data?.users ?? data?.items ?? data?.results ?? []
}

function unwrapRequests(data: AccessRequest[] | RequestsEnvelope | null | undefined) {
  if (Array.isArray(data)) return data
  return data?.accessRequests ?? data?.requests ?? data?.items ?? data?.results ?? []
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((currentItem) => currentItem.id === item.id)
  if (index === -1) return [item, ...items]

  return items.map((currentItem) => (currentItem.id === item.id ? item : currentItem))
}

async function readApiPayload<T>(response: Response): Promise<ApiResponse<T>> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "No se pudo completar la solicitud.")
  }

  return payload
}

async function fetchUsers(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  params?: { page?: number; limit?: number },
): Promise<{ users: ManagedUser[]; meta?: { pagination?: PaginationMeta } & Record<string, unknown> }> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  const url = qs ? `${getApiBaseUrl()}/api/v1/users?${qs}` : `${getApiBaseUrl()}/api/v1/users`
  const response = await fetchWithAuth(url)
  const payload = await readApiPayload<ManagedUser[] | UsersEnvelope>(response)
  return { users: unwrapUsers(payload.data), meta: payload.meta }
}

async function fetchAccessRequests(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/access-requests`)
  const payload = await readApiPayload<AccessRequest[] | RequestsEnvelope>(response)
  return unwrapRequests(payload.data)
}

function nullableText(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

function serializeBankAccounts(value?: string[] | null) {
  const accounts = value?.length ? value : [""]
  return accounts
}

function normalizeMaritalStatus(value: UserFormState["maritalStatus"]) {
  return value === "none" ? null : value
}

function formatPhoneNumber(value: string) {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return ""

  const localDigits = digits.startsWith("51") && digits.length === 11 ? digits.slice(2) : digits
  if (localDigits.length === 9) {
    return `+51 ${localDigits.slice(0, 3)} ${localDigits.slice(3, 6)} ${localDigits.slice(6)}`
  }

  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const symbols = "!@#$%&*"
  const bytes = new Uint32Array(12)
  window.crypto.getRandomValues(bytes)
  const core = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("")
  return `${core}${symbols[bytes[0] % symbols.length]}${bytes[1] % 10}`
}

function buildUserPayload(form: UserFormState, options?: UserEditPermissions) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: nullableText(form.phone),
    email: options?.canUpdateAdministrativeFields ? nullableText(form.email) : undefined,
    dni: nullableText(form.dni),
    address: nullableText(form.address),
    bank: nullableText(form.bank),
    bankAccounts: form.bankAccounts.map((account) => account.trim()).filter(Boolean),
    maritalStatus: normalizeMaritalStatus(form.maritalStatus),
    active: options?.canUpdateActive ? form.active : undefined,
  }
}

async function createUser(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  form: UserFormState,
) {
  const createAuthAccount = form.role === "admin" || form.createAuthAccount
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...buildUserPayload(form, { canUpdateAdministrativeFields: true, canUpdateActive: true }),
      role: form.role,
      createAuthAccount,
      password: createAuthAccount ? form.password : undefined,
    }),
  })

  return readApiPayload<ManagedUser>(response)
}

async function updateUser(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  userId: string,
  form: UserFormState,
  options: UserEditPermissions,
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildUserPayload(form, options)),
  })

  return readApiPayload<ManagedUser>(response)
}

async function linkAuthAccount(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  userId: string,
  form: LinkAuthFormState,
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/users/${userId}/auth-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: form.email.trim(),
      password: form.password,
    }),
  })

  return readApiPayload<ManagedUser>(response)
}

async function reviewAccessRequest(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  requestId: string,
  status: "approved" | "rejected",
  observation: string,
  initialPassword?: string,
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/access-requests/${requestId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      observation: observation.trim() || undefined,
      initialPassword: status === "approved" ? initialPassword?.trim() : undefined,
    }),
  })

  return readApiPayload<AccessRequest>(response)
}

function readUsersPreferences(): UsersPagePreferences {
  if (usersPreferencesCache) return usersPreferencesCache

  try {
    const preferences = JSON.parse(localStorage.getItem(usersPreferencesKey) ?? "{}") as UsersPagePreferences & { version?: number }
    usersPreferencesCache =
      preferences.version === undefined || preferences.version === usersPreferencesVersion
        ? preferences
        : {}
    return usersPreferencesCache
  } catch {
    usersPreferencesCache = {}
    return {}
  }
}

function writeUsersPreferences(nextPreferences: UsersPagePreferences) {
  const currentPreferences = readUsersPreferences()
  usersPreferencesCache = { ...currentPreferences, ...nextPreferences }
  localStorage.setItem(usersPreferencesKey, JSON.stringify({ ...usersPreferencesCache, version: usersPreferencesVersion }))
}

function rememberVisibleIds<T extends { id: string }>(
  nextItems: T[],
  highlightNew: boolean,
  visibleIdsRef: React.MutableRefObject<Set<string>>,
  timeoutRef: React.MutableRefObject<number | undefined>,
  setNewIds: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  const previousIds = visibleIdsRef.current
  const nextIds = new Set(nextItems.map((item) => item.id))
  const addedIds =
    highlightNew && previousIds.size > 0
      ? nextItems.map((item) => item.id).filter((id) => !previousIds.has(id))
      : []

  visibleIdsRef.current = nextIds

  if (addedIds.length === 0) return

  if (timeoutRef.current !== undefined) {
    window.clearTimeout(timeoutRef.current)
  }

  setNewIds(new Set(addedIds))
  timeoutRef.current = window.setTimeout(() => {
    setNewIds(new Set())
    timeoutRef.current = undefined
  }, 2200)
}

export default function UsersPage({ initialTab = "users" }: { initialTab?: UsersTab }) {
  const { user, session, fetchWithAuth } = useAuth()
  const queryClient = useQueryClient()
  const queryScope = useMemo(() => getAuthQueryScope(user), [user])
  const [activeTab, setActiveTab] = useState<UsersTab>(() => readUsersPreferences().activeTab ?? initialTab)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [requestSearchQuery, setRequestSearchQuery] = useState("")
  const [requestRoleFilter, setRequestRoleFilter] = useState<RequestRoleFilter>("all")
  const [requestStatusFilter, setRequestStatusFilter] = useState<RequestStatusFilter>("all")
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [refreshingUsers, setRefreshingUsers] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [refreshingRequests, setRefreshingRequests] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [userForm, setUserForm] = useState<UserFormState>(defaultUserForm)
  const [savingUser, setSavingUser] = useState(false)
  const [linkingUser, setLinkingUser] = useState<ManagedUser | null>(null)
  const [linkAuthForm, setLinkAuthForm] = useState<LinkAuthFormState>(defaultLinkAuthForm)
  const [savingLinkAuth, setSavingLinkAuth] = useState(false)
  const [reviewingRequest, setReviewingRequest] = useState<AccessRequest | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [requestAction, setRequestAction] = useState<"approved" | "rejected" | null>(null)
  const [requestObservation, setRequestObservation] = useState("")
  const [requestInitialPassword, setRequestInitialPassword] = useState("")
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [newUserIds, setNewUserIds] = useState<Set<string>>(() => new Set())
  const [newRequestIds, setNewRequestIds] = useState<Set<string>>(() => new Set())
  const visibleUserIdsRef = useRef<Set<string>>(new Set())
  const visibleRequestIdsRef = useRef<Set<string>>(new Set())
  const newUserTimeoutRef = useRef<number | undefined>(undefined)
  const newRequestTimeoutRef = useRef<number | undefined>(undefined)

  const isAdmin = user?.role === "admin" || Boolean(user?.isOwner)

  const filteredUsers = useMemo(() => {
    const query = normalizeSearch(searchQuery)

    return users.filter((item) => {
      const matchesSearch =
        !query ||
        normalizeSearch(
          [
            item.firstName,
            item.lastName,
            item.email,
            item.phone,
            item.dni,
            item.bank,
            ...(item.bankAccounts ?? []),
            item.publicCode,
            item.id,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(query)
      const matchesRole = roleFilter === "all" || normalizeRole(item.role) === roleFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.active !== false) ||
        (statusFilter === "inactive" && item.active === false)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [roleFilter, searchQuery, statusFilter, users])

  const totalUserPages = Math.max(Math.ceil(filteredUsers.length / USERS_PAGE_SIZE), 1)
  const currentUserPage = Math.min(page, totalUserPages)

  const filteredRequests = useMemo(() => {
    const query = normalizeSearch(requestSearchQuery)

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        normalizeSearch(
          [
            request.firstName,
            request.lastName,
            request.email,
            request.phone,
            request.id,
            request.observation,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(query)
      const normalizedRole = normalizeRole(request.roleRequested)
      const matchesRole = requestRoleFilter === "all" || normalizedRole === requestRoleFilter
      const normalizedStatus = normalizeRequestStatus(request.status)
      const matchesStatus = requestStatusFilter === "all" || normalizedStatus === requestStatusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [requestRoleFilter, requestSearchQuery, requestStatusFilter, requests])

  const usersPagination = useMemo<PaginationMeta>(
    () => ({
      page: currentUserPage,
      limit: USERS_PAGE_SIZE,
      total: filteredUsers.length,
      totalPages: totalUserPages,
    }),
    [currentUserPage, filteredUsers.length, totalUserPages],
  )

  const stats = useMemo(() => {
    const total = users.length
    const clients = users.filter((item) => normalizeRole(item.role) === "client").length
    const investors = users.filter((item) => normalizeRole(item.role) === "investor").length
    const admins = users.filter((item) => normalizeRole(item.role) === "admin" || item.isOwner).length
    const pendingRequests = requests.filter((item) => isPendingRequest(item.status)).length

    return { admins, clients, investors, pendingRequests, total }
  }, [requests, users])

  const loadUsers = useCallback(
    async ({ keepContent = false }: { keepContent?: boolean } = {}) => {
      if (!session?.access_token || !isAdmin) return

      if (keepContent) {
        setRefreshingUsers(true)
      } else {
        setLoadingUsers(true)
      }
      setUsersError(null)

      try {
        const { users: nextUsers } = await queryClient.fetchQuery({
          meta: { persist: true },
          queryFn: () => fetchUsers(fetchWithAuth, { page, limit: USERS_PAGE_SIZE }),
          queryKey: queryKeys.users.list(queryScope, { page, limit: USERS_PAGE_SIZE }),
        })
        rememberVisibleIds(nextUsers, keepContent, visibleUserIdsRef, newUserTimeoutRef, setNewUserIds)
        setUsers(nextUsers)
      } catch (error) {
        setUsersError(getErrorMessage(error, "No se pudieron cargar los usuarios."))
      } finally {
        setLoadingUsers(false)
        setRefreshingUsers(false)
      }
    },
    [fetchWithAuth, isAdmin, page, queryClient, queryScope, session?.access_token],
  )

  const loadRequests = useCallback(
    async ({ keepContent = false }: { keepContent?: boolean } = {}) => {
      if (!session?.access_token || !isAdmin) return

      if (keepContent) {
        setRefreshingRequests(true)
      } else {
        setLoadingRequests(true)
      }
      setRequestsError(null)

      try {
        const nextRequests = await queryClient.fetchQuery({
          meta: { persist: true },
          queryFn: () => fetchAccessRequests(fetchWithAuth),
          queryKey: queryKeys.users.accessRequests(queryScope),
        })
        rememberVisibleIds(nextRequests, keepContent, visibleRequestIdsRef, newRequestTimeoutRef, setNewRequestIds)
        setRequests(nextRequests)
      } catch (error) {
        setRequestsError(getErrorMessage(error, "No se pudieron cargar las solicitudes."))
      } finally {
        setLoadingRequests(false)
        setRefreshingRequests(false)
      }
    },
    [fetchWithAuth, isAdmin, queryClient, queryScope, session?.access_token],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadUsers])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequests()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadRequests])

  useEffect(() => {
    const refreshFromRealtime = (event: Event) => {
      const detail = (event as CustomEvent<RealtimeDomainDetail>).detail
      if (!detail?.type) return

      if (detail.type.startsWith("user.")) {
        void loadUsers({ keepContent: true })
      }

      if (detail.type.startsWith("access-request.")) {
        void loadRequests({ keepContent: true })
      }
    }

    window.addEventListener(realtimeDomainEvent, refreshFromRealtime)
    return () => window.removeEventListener(realtimeDomainEvent, refreshFromRealtime)
  }, [loadRequests, loadUsers])

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const newUserTimeout = newUserTimeoutRef.current
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const newRequestTimeout = newRequestTimeoutRef.current
      if (newUserTimeout !== undefined) {
        window.clearTimeout(newUserTimeout)
      }
      if (newRequestTimeout !== undefined) {
        window.clearTimeout(newRequestTimeout)
      }
    }
  }, [])

  const openCreateDialog = () => {
    setUserForm(defaultUserForm)
    setEditingUser(null)
    setCreateOpen(true)
  }

  const openEditDialog = (selectedUser: ManagedUser) => {
    if (!canManageUser(user, selectedUser)) return

    setUserForm({
      firstName: selectedUser.firstName ?? "",
      lastName: selectedUser.lastName ?? "",
      email: selectedUser.email ?? "",
      phone: selectedUser.phone ?? "",
      role: normalizeEditableRole(selectedUser.role),
      dni: selectedUser.dni ?? "",
      address: selectedUser.address ?? "",
      bank: selectedUser.bank ?? "",
      bankAccounts: serializeBankAccounts(selectedUser.bankAccounts),
      maritalStatus: selectedUser.maritalStatus ?? "none",
      active: selectedUser.active !== false,
      createAuthAccount: Boolean(selectedUser.authUserId),
      password: "",
    })
    setEditingUser(selectedUser)
    setEditOpen(true)
  }

  const openLinkAuthDialog = (selectedUser: ManagedUser) => {
    if (!canLinkAuthAccount(user, selectedUser)) return

    setLinkingUser(selectedUser)
    setLinkAuthForm({
      email: selectedUser.email ?? "",
      password: generateTemporaryPassword(),
    })
  }

  const handleSubmitUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const permissions = editingUser
      ? getUserEditPermissions(user, editingUser)
      : { canUpdateAdministrativeFields: true, canUpdateActive: true }
    setSavingUser(true)

    try {
      const response = editingUser
        ? await updateUser(fetchWithAuth, editingUser.id, userForm, permissions)
        : await createUser(fetchWithAuth, userForm)
      const savedUser = response.data

      if (savedUser) {
        setUsers((currentUsers) => upsertById(currentUsers, savedUser))
        queryClient.setQueryData<ManagedUser[]>(
          queryKeys.users.list(queryScope),
          (currentUsers) => upsertById(currentUsers ?? [], savedUser),
        )
      }

      if (editingUser) {
        setEditingUser(savedUser ?? editingUser)
      }

      toastManager.add({
        type: "success",
        title: editingUser ? "Usuario actualizado" : "Usuario creado",
        description: "La información quedó sincronizada con el servidor.",
      })
      setCreateOpen(false)
      setEditOpen(false)
      setEditingUser(null)
    } catch (error) {
      toastManager.add({
        type: "error",
        title: editingUser ? "No se pudo actualizar" : "No se pudo crear",
        description: getErrorMessage(error, "Revisa los datos e intenta nuevamente."),
      })
    } finally {
      setSavingUser(false)
    }
  }

  const handleSubmitLinkAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!linkingUser) return

    setSavingLinkAuth(true)
    try {
      const response = await linkAuthAccount(fetchWithAuth, linkingUser.id, linkAuthForm)
      const linkedUser = response.data
      if (linkedUser) {
        setUsers((currentUsers) => upsertById(currentUsers, linkedUser))
        queryClient.setQueryData<ManagedUser[]>(
          queryKeys.users.list(queryScope),
          (currentUsers) => upsertById(currentUsers ?? [], linkedUser),
        )
      }
      toastManager.add({
        type: "success",
        title: "Cuenta vinculada",
        description: "El usuario ya puede ingresar con credenciales de acceso.",
      })
      setLinkingUser(null)
      setLinkAuthForm(defaultLinkAuthForm)
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo vincular",
        description: getErrorMessage(error, "Revisa el correo y la contraseña temporal."),
      })
    } finally {
      setSavingLinkAuth(false)
    }
  }

  const handleReviewRequest = async () => {
    if (!reviewingRequest || !requestAction) return

    if (requestAction === "approved" && requestInitialPassword.trim().length < 6) {
      toastManager.add({
        type: "warning",
        title: "Contraseña requerida",
        description: "Genera o escribe una contraseña temporal de al menos 6 caracteres.",
      })
      return
    }

    setSubmittingRequest(true)
    try {
      const response = await reviewAccessRequest(
        fetchWithAuth,
        reviewingRequest.id,
        requestAction,
        requestObservation,
        requestInitialPassword,
      )
      const reviewedRequest = response.data
      if (reviewedRequest) {
        setRequests((currentRequests) => upsertById(currentRequests, reviewedRequest))
        queryClient.setQueryData<AccessRequest[]>(
          queryKeys.users.accessRequests(queryScope),
          (currentRequests) => upsertById(currentRequests ?? [], reviewedRequest),
        )
        setSelectedRequest((currentRequest) =>
          currentRequest?.id === reviewedRequest.id ? reviewedRequest : currentRequest,
        )
      }
      toastManager.add({
        type: "success",
        title: requestAction === "approved" ? "Solicitud aprobada" : "Solicitud rechazada",
        description:
          requestAction === "approved"
            ? "El acceso fue aprobado con una contraseña temporal explícita."
            : "La solicitud quedó marcada como rechazada.",
      })
      setReviewingRequest(null)
      setRequestAction(null)
      setRequestObservation("")
      setRequestInitialPassword("")
      if (requestAction === "approved") {
        await queryClient.invalidateQueries({ queryKey: queryKeys.users.list(queryScope) })
        await loadUsers({ keepContent: true })
      }
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo revisar la solicitud",
        description: getErrorMessage(error, "El servidor rechazó la acción."),
      })
    } finally {
      setSubmittingRequest(false)
    }
  }

  const openReviewRequestDialog = (request: AccessRequest, action: "approved" | "rejected") => {
    setReviewingRequest(request)
    setRequestAction(action)
    setRequestObservation(request.observation ?? "")
    setRequestInitialPassword(action === "approved" ? generateTemporaryPassword() : "")
  }

  const handleRoleFilterChange = (value: RoleFilter | null) => {
    setRoleFilter(value ?? "all")
    setPage(1)
  }

  const handleStatusFilterChange = (value: StatusFilter | null) => {
    setStatusFilter(value ?? "all")
    setPage(1)
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-3 py-4 md:px-8 md:py-8">
        <Empty className="min-h-105 rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldIcon />
            </EmptyMedia>
            <EmptyTitle>Acceso restringido</EmptyTitle>
            <EmptyDescription>
              La administración de usuarios solo está disponible para administradores.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-5 px-3 py-4 md:px-8 md:py-8">
      <header className="flex items-start justify-between gap-3 border-b border-border pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
              Usuarios
            </h1>
            {loadingUsers ? (
              <Skeleton className="h-5 w-24 rounded-full" />
            ) : (
              <Badge variant="secondary">{stats.total} registros</Badge>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Administra perfiles, estado de acceso y solicitudes pendientes.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              void Promise.all([loadUsers({ keepContent: true }), loadRequests({ keepContent: true })])
            }}
            disabled={loadingUsers || refreshingUsers || loadingRequests || refreshingRequests}
            aria-label="Actualizar usuarios"
          >
            {refreshingUsers || refreshingRequests ? <Spinner /> : <RefreshCwIcon />}
          </Button>
          <Button className="max-sm:px-2" onClick={openCreateDialog}>
            <PlusIcon data-icon="inline-start" />
            <span className="max-sm:hidden">Nuevo usuario</span>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Total" value={stats.total} loading={loadingUsers} />
        <MetricTile label="Clientes" value={stats.clients} loading={loadingUsers} />
        <MetricTile label="Inversionistas" value={stats.investors} loading={loadingUsers} />
        <MetricTile label="Administradores" value={stats.admins} loading={loadingUsers} />
        <MetricTile label="Solicitudes pendientes" value={stats.pendingRequests} loading={loadingRequests} emphasis />
      </section>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = value as UsersTab
          setActiveTab(nextTab)
          writeUsersPreferences({ activeTab: nextTab })
        }}
        className="gap-5"
      >
        <TabsList className="w-full overflow-x-auto md:w-fit">
          <TabsTrigger value="users" className="flex-1 md:flex-none">
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 md:flex-none">
            Solicitudes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersWorkspace
            users={filteredUsers}
            highlightedUserIds={newUserIds}
            pagination={usersPagination}
            page={page}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            loading={loadingUsers}
            refreshing={refreshingUsers}
            error={usersError}
            currentUser={user}
            onEditUser={openEditDialog}
            onLinkAuth={openLinkAuthDialog}
            onPageChange={setPage}
            onRetry={() => void loadUsers({ keepContent: true })}
            onRoleFilterChange={handleRoleFilterChange}
            onSearchQueryChange={(query) => {
              setSearchQuery(query)
              setPage(1)
            }}
            onStatusFilterChange={handleStatusFilterChange}
          />
        </TabsContent>

        <TabsContent value="requests">
          <RequestsWorkspace
            requests={requests}
            filteredRequests={filteredRequests}
            highlightedRequestIds={newRequestIds}
            searchQuery={requestSearchQuery}
            roleFilter={requestRoleFilter}
            statusFilter={requestStatusFilter}
            loading={loadingRequests}
            error={requestsError}
            onRetry={() => void loadRequests({ keepContent: true })}
            onSearchQueryChange={setRequestSearchQuery}
            onRoleFilterChange={(value) => setRequestRoleFilter(value ?? "all")}
            onStatusFilterChange={(value) => setRequestStatusFilter(value ?? "all")}
            onInspect={setSelectedRequest}
            onReview={openReviewRequestDialog}
          />
        </TabsContent>
      </Tabs>

      <UserDialog
        open={createOpen}
        editingUser={null}
        currentUser={user}
        permissions={{ canUpdateAdministrativeFields: true, canUpdateActive: true }}
        form={userForm}
        saving={savingUser}
        onFormChange={setUserForm}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setEditingUser(null)
        }}
        onSubmit={handleSubmitUser}
      />

      <UserDialog
        open={editOpen}
        editingUser={editingUser}
        currentUser={user}
        permissions={getUserEditPermissions(user, editingUser)}
        form={userForm}
        saving={savingUser}
        onFormChange={setUserForm}
        onOpenChange={(open) => {
          setEditOpen(open)
        }}
        onSubmit={handleSubmitUser}
      />

      <LinkAuthDialog
        open={Boolean(linkingUser)}
        user={linkingUser}
        form={linkAuthForm}
        saving={savingLinkAuth}
        onFormChange={setLinkAuthForm}
        onOpenChange={(open) => {
          if (!open) setLinkingUser(null)
        }}
        onSubmit={handleSubmitLinkAuth}
      />

      <ReviewRequestDialog
        request={reviewingRequest}
        action={requestAction}
        observation={requestObservation}
        initialPassword={requestInitialPassword}
        submitting={submittingRequest}
        onObservationChange={setRequestObservation}
        onInitialPasswordChange={setRequestInitialPassword}
        onRegeneratePassword={() => setRequestInitialPassword(generateTemporaryPassword())}
        onCopyPassword={async () => {
          if (!requestInitialPassword) return
          await navigator.clipboard.writeText(requestInitialPassword)
          toastManager.add({
            type: "success",
            title: "Contraseña copiada",
            description: "La contraseña temporal quedó en el portapapeles.",
          })
        }}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingRequest(null)
            setRequestAction(null)
            setRequestObservation("")
            setRequestInitialPassword("")
          }
        }}
        onConfirm={() => void handleReviewRequest()}
      />

      <RequestDetailSheet
        request={selectedRequest}
        onOpenChange={(open) => {
          if (!open) setSelectedRequest(null)
        }}
        onReview={openReviewRequestDialog}
      />
    </main>
  )
}

function UsersWorkspace({
  users,
  highlightedUserIds,
  pagination,
  page,
  roleFilter,
  statusFilter,
  searchQuery,
  loading,
  refreshing,
  error,
  currentUser,
  onEditUser,
  onLinkAuth,
  onPageChange,
  onRetry,
  onRoleFilterChange,
  onSearchQueryChange,
  onStatusFilterChange,
}: {
  users: ManagedUser[]
  highlightedUserIds?: Set<string>
  pagination: PaginationMeta
  page: number
  roleFilter: RoleFilter
  statusFilter: StatusFilter
  searchQuery: string
  loading: boolean
  refreshing: boolean
  error: string | null
  currentUser: CurrentUser
  onEditUser: (user: ManagedUser) => void
  onLinkAuth: (user: ManagedUser) => void
  onPageChange: (page: number) => void
  onRetry: () => void
  onRoleFilterChange: (value: RoleFilter | null) => void
  onSearchQueryChange: (query: string) => void
  onStatusFilterChange: (value: StatusFilter | null) => void
}) {
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<UserColumnKey[]>(() => {
    const savedColumns = readUsersPreferences().visibleColumns?.filter((key) =>
      userColumnsConfig.some((column) => column.key === key),
    )
    return savedColumns?.length ? savedColumns : defaultVisibleUserColumns
  })
  const handleToggleColumn = (key: UserColumnKey, checked: boolean) => {
    setVisibleColumnKeys((current) => {
      if (checked) {
        const nextColumns = current.includes(key) ? current : [...current, key]
        writeUsersPreferences({ visibleColumns: nextColumns })
        return nextColumns
      }
      if (key === "user" || key === "action") return current
      const nextColumns = current.filter((columnKey) => columnKey !== key)
      writeUsersPreferences({ visibleColumns: nextColumns })
      return nextColumns
    })
  }
  const userColumns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        id: "user",
        accessorFn: (item) => `${displayPersonName(item)} ${item.publicCode ?? item.id}`,
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Usuario"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => <UserIdentity user={row.original} />,
        meta: {
          headerClassName: "w-[260px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "contact",
        accessorFn: (item) => `${item.email ?? ""} ${item.phone ?? ""} ${item.dni ?? ""}`,
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Contacto"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <ContactStack email={row.original.email} phone={row.original.phone} />
        ),
        meta: {
          headerClassName: "w-[250px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "dni",
        accessorFn: (item) => item.dni ?? "",
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="DNI"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) =>
          row.original.dni ? (
            <span className="font-mono text-sm">{row.original.dni}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Sin documento</span>
          ),
        meta: {
          headerClassName: "w-[120px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "bank",
        accessorFn: (item) => item.bank ?? "",
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Banco"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <span className={cn("block truncate", !row.original.bank && "text-muted-foreground")}>
            {row.original.bank || "Sin banco"}
          </span>
        ),
        meta: {
          headerClassName: "w-[150px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "bankAccounts",
        accessorFn: (item) => (item.bankAccounts ?? []).join(" "),
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Cuentas"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => <BankAccountsStack accounts={row.original.bankAccounts} />,
        meta: {
          headerClassName: "w-[220px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "maritalStatus",
        accessorFn: (item) => item.maritalStatus ? getMaritalStatusLabel(item.maritalStatus) : "",
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Estado civil"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <span className={cn("text-sm", !row.original.maritalStatus && "text-muted-foreground")}>
            {getMaritalStatusLabel(row.original.maritalStatus)}
          </span>
        ),
        meta: {
          headerClassName: "w-[150px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "role",
        accessorFn: (item) => getRoleLabel(normalizeRole(item.role)),
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Rol"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <RoleBadge role={row.original.role} isOwner={row.original.isOwner} />
        ),
        meta: {
          headerClassName: "w-[150px]",
        },
      },
      {
        id: "status",
        accessorFn: (item) => `${item.active === false ? "Inactivo" : "Activo"} ${item.authUserId ? "Con acceso" : "Operativo"}`,
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Estado"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <StatusBadge active={row.original.active !== false} />
            <AccessBadge user={row.original} />
          </div>
        ),
        meta: {
          headerClassName: "w-[160px]",
        },
      },
      {
        id: "createdAt",
        accessorFn: (item) => item.createdAt ?? "",
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Registro"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        meta: {
          headerClassName: "w-[120px]",
        },
      },
      {
        id: "action",
        enableSorting: false,
        header: () => <DataTableStaticHeader title="Acción" align="right" />,
        cell: ({ row }) => {
          const editable = canManageUser(currentUser, row.original)
          const linkable = canLinkAuthAccount(currentUser, row.original)

          return (
            <div className="flex justify-end gap-2">
              {linkable && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onLinkAuth(row.original)}
                >
                  <LinkIcon data-icon="inline-start" />
                  Acceso
                </Button>
              )}
              {editable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditUser(row.original)}
                >
                  <UserCogIcon data-icon="inline-start" />
                  Editar
                </Button>
              )}
            </div>
          )
        },
        meta: {
          headerClassName: "w-[220px] text-right",
          cellClassName: "text-right",
        },
      },
    ],
    [currentUser, onEditUser, onLinkAuth],
  )
  const visibleUserColumns = useMemo(
    () => userColumns.filter((column) => visibleColumnKeys.includes(column.id as UserColumnKey)),
    [userColumns, visibleColumnKeys],
  )

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        <InputGroup className="flex-1">
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            placeholder="Buscar por código, nombre, DNI, correo, teléfono o banco"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </InputGroup>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-140">
          <Select items={roleItems} value={roleFilter} onValueChange={onRoleFilterChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {roleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select items={statusItems} value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="w-full justify-between" />}>
              <Settings2Icon data-icon="inline-start" />
              Columnas
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {userColumnGroups.map((group) => (
                <DropdownMenuGroup key={group}>
                  <DropdownMenuLabel>{group}</DropdownMenuLabel>
                  {userColumnsConfig
                    .filter((column) => column.group === group)
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.key}
                        checked={visibleColumnKeys.includes(column.key)}
                        disabled={column.key === "user" || column.key === "action"}
                        onCheckedChange={(checked) => handleToggleColumn(column.key, Boolean(checked))}
                      >
                        {column.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <UsersSkeleton />
      ) : users.length === 0 ? (
        <Empty className="min-h-90 rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No hay usuarios para mostrar</EmptyTitle>
            <EmptyDescription>
              Ajusta los filtros o revisa las solicitudes para incorporar nuevos usuarios.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTableCard
          columns={visibleUserColumns}
          data={users}
          clientPagination
          getRowId={(item) => item.id}
          getRowClassName={(item) => cn(highlightedUserIds?.has(item.id) && "realtime-row-enter")}
          tableClassName="min-w-[1080px] table-fixed"
          bodyClassName={cn(refreshing && "opacity-70")}
          initialSorting={[{ id: "createdAt", desc: true }]}
          pagination={{
            page: pagination.page ?? page,
            pageSize: pagination.limit ?? USERS_PAGE_SIZE,
            totalPages: pagination.totalPages ?? 1,
            total: pagination.total,
            itemLabel: "usuarios",
            onPageChange,
          }}
        />
      )}
    </section>
  )
}

function RequestsWorkspace({
  requests,
  filteredRequests,
  highlightedRequestIds,
  searchQuery,
  roleFilter,
  statusFilter,
  loading,
  error,
  onRetry,
  onSearchQueryChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onInspect,
  onReview,
}: {
  requests: AccessRequest[]
  filteredRequests: AccessRequest[]
  highlightedRequestIds?: Set<string>
  searchQuery: string
  roleFilter: RequestRoleFilter
  statusFilter: RequestStatusFilter
  loading: boolean
  error: string | null
  onRetry: () => void
  onSearchQueryChange: (query: string) => void
  onRoleFilterChange: (value: RequestRoleFilter | null) => void
  onStatusFilterChange: (value: RequestStatusFilter | null) => void
  onInspect: (request: AccessRequest) => void
  onReview: (request: AccessRequest, action: "approved" | "rejected") => void
}) {
  const requestColumns = useMemo<ColumnDef<AccessRequest>[]>(
    () => [
      {
        id: "applicant",
        accessorFn: (request) => `${displayPersonName(request)} ${request.id}`,
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Solicitante"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{displayPersonName(row.original)}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{row.original.id}</p>
          </div>
        ),
        meta: {
          headerClassName: "w-[260px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "contact",
        accessorFn: (request) => `${request.email ?? ""} ${request.phone ?? ""}`,
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Contacto"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <ContactStack email={row.original.email} phone={row.original.phone} />
        ),
        meta: {
          headerClassName: "w-[260px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "roleRequested",
        accessorFn: (request) => getRoleLabel(request.roleRequested),
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Rol solicitado"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => getRoleLabel(row.original.roleRequested),
        meta: {
          headerClassName: "w-[150px]",
        },
      },
      {
        id: "status",
        accessorFn: (request) => getRequestStatusLabel(request.status),
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Estado"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => <RequestStatusBadge status={row.original.status} />,
        meta: {
          headerClassName: "w-[120px]",
        },
      },
      {
        id: "createdAt",
        accessorFn: (request) => request.createdAt ?? "",
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Creada"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        meta: {
          headerClassName: "w-[120px]",
        },
      },
      {
        id: "observation",
        accessorFn: (request) => request.observation ?? "",
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Observación"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <span className="block truncate text-muted-foreground">
            {row.original.observation || "-"}
          </span>
        ),
        meta: {
          headerClassName: "w-[210px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <DataTableStaticHeader title="Acción" align="right" />,
        cell: ({ row }) => {
          const pending = isPendingRequest(row.original.status)

          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInspect(row.original)}
              >
                <EyeIcon data-icon="inline-start" />
                Ver
              </Button>
              {pending && (
                <Button
                  size="sm"
                  onClick={() => onReview(row.original, "approved")}
                >
                  <CheckIcon data-icon="inline-start" />
                  Aprobar
                </Button>
              )}
            </div>
          )
        },
        meta: {
          headerClassName: "w-[170px] text-right",
          cellClassName: "text-right",
        },
      },
    ],
    [onInspect, onReview],
  )

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        <InputGroup className="flex-1">
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            placeholder="Buscar por nombre, correo, teléfono u observación"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </InputGroup>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-100">
          <Select items={requestRoleItems} value={roleFilter} onValueChange={onRoleFilterChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {requestRoleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select items={requestStatusItems} value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {requestStatusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <DataTableSkeleton
          rows={6}
          tableClassName="min-w-[900px] table-fixed"
          columns={[
            { className: "w-[260px]", headerWidth: "w-28", cellWidth: "w-44" },
            { className: "w-[260px]", headerWidth: "w-24", cellWidth: "w-52" },
            { className: "w-[150px]", headerWidth: "w-28", cellWidth: "w-24" },
            { className: "w-[120px]", headerWidth: "w-16", cellWidth: "w-20" },
            { className: "w-[120px]", headerWidth: "w-16", cellWidth: "w-24" },
            { className: "w-[210px]", headerWidth: "w-24", cellWidth: "w-36" },
            { className: "w-[170px] text-right", headerWidth: "ml-auto w-20", cellWidth: "ml-auto w-32" },
          ]}
        />
      ) : requests.length === 0 ? (
        <Empty className="min-h-90 rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserIcon />
            </EmptyMedia>
            <EmptyTitle>No hay solicitudes</EmptyTitle>
            <EmptyDescription>
              Cuando alguien solicite acceso, aparecerá en esta bandeja de revisión.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filteredRequests.length === 0 ? (
        <Empty className="min-h-90 rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>No hay solicitudes para mostrar</EmptyTitle>
            <EmptyDescription>
              Ajusta los filtros para ver otras solicitudes.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTableCard
          columns={requestColumns}
          data={filteredRequests}
          getRowId={(request) => request.id}
          getRowClassName={(request) => cn(highlightedRequestIds?.has(request.id) && "realtime-row-enter")}
          tableClassName="min-w-[900px] table-fixed"
          initialSorting={[{ id: "createdAt", desc: true }]}
        />
      )}
    </section>
  )
}

function UserDialog({
  open,
  editingUser,
  currentUser,
  permissions,
  form,
  saving,
  onFormChange,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  editingUser: ManagedUser | null
  currentUser: CurrentUser
  permissions: UserEditPermissions
  form: UserFormState
  saving: boolean
  onFormChange: React.Dispatch<React.SetStateAction<UserFormState>>
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const isEditing = Boolean(editingUser)
  const roleItemsForUser = currentUser?.isOwner
    ? editableRoleItems
    : editableRoleItems.filter((item) => item.value !== "admin")
  const authRequired = !isEditing && (form.role === "admin" || form.createAuthAccount)
  const missingAuthEmail = authRequired && form.email.trim().length === 0
  const showInactiveWarning = Boolean(editingUser && permissions.canUpdateActive && !form.active)
  const title = isEditing ? "Editar usuario" : "Nuevo usuario"
  const bankAccountRefs = useRef<Array<HTMLInputElement | null>>([])
  const pendingBankAccountFocusIndex = useRef<number | null>(null)
  const canAddBankAccount = form.bankAccounts.every((account) => account.trim().length > 0)
  const canSubmit = !saving && !missingAuthEmail

  useEffect(() => {
    const focusIndex = pendingBankAccountFocusIndex.current
    if (focusIndex === null) return

    bankAccountRefs.current[focusIndex]?.focus()
    pendingBankAccountFocusIndex.current = null
  }, [form.bankAccounts.length])

  const handleBankAccountChange = (index: number, value: string) => {
    onFormChange((current) => ({
      ...current,
      bankAccounts: current.bankAccounts.map((account, accountIndex) =>
        accountIndex === index ? value : account,
      ),
    }))
  }
  const addBankAccount = () => {
    if (!canAddBankAccount) return
    pendingBankAccountFocusIndex.current = form.bankAccounts.length
    onFormChange((current) => ({
      ...current,
      bankAccounts: [...current.bankAccounts, ""],
    }))
  }
  const removeBankAccount = (index: number) => {
    onFormChange((current) => {
      const nextAccounts = current.bankAccounts.filter((_, accountIndex) => accountIndex !== index)
      return {
        ...current,
        bankAccounts: nextAccounts.length ? nextAccounts : [""],
      }
    })
  }
  const setGeneratedPassword = () => {
    onFormChange((current) => ({ ...current, password: generateTemporaryPassword() }))
  }
  const copyPassword = async () => {
    if (!form.password) return
    await navigator.clipboard.writeText(form.password)
    toastManager.add({
      type: "success",
      title: "Contraseña copiada",
      description: "La contraseña temporal quedó en el portapapeles.",
    })
  }

  const isMobile = useIsMobile()

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={cn(
          isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : "",
          "overflow-hidden",
        )}
        style={!isMobile ? { width: 860, minWidth: 620 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            {isEditing
              ? "Actualiza datos operativos y campos administrativos permitidos. El rol no se puede modificar."
              : "Crea clientes, inversionistas o administradores según las reglas de acceso actuales."}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerPanel className="pt-4 max-sm:pt-4">
          <form
            id="user-form"
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              if (!canSubmit) {
                event.preventDefault()
                return
              }
              onSubmit(event)
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="firstName">Nombres</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <UserIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="firstName"
                    value={form.firstName}
                    required
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, firstName: event.target.value }))
                    }
                  />
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Apellidos</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <UserIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="lastName"
                    value={form.lastName}
                    required
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, lastName: event.target.value }))
                    }
                  />
                </InputGroup>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="email"
                  type="email"
                  value={form.email}
                  required={authRequired}
                  disabled={isEditing && !permissions.canUpdateAdministrativeFields}
                  placeholder="correo@ejemplo.com"
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </InputGroup>
              {isEditing && !permissions.canUpdateAdministrativeFields && (
                <FieldDescription>Tu correo no se cambia desde esta pantalla.</FieldDescription>
              )}
              {!isEditing && (
                <FieldDescription>
                  Clientes e inversionistas pueden quedar sin correo si no tendrán cuenta de acceso.
                </FieldDescription>
              )}
              {missingAuthEmail && (
                <FieldDescription className="text-destructive">
                  Agrega un correo para crear la cuenta de acceso.
                </FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <PhoneIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="phone"
                  value={form.phone}
                  placeholder="+51 999 999 999"
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, phone: event.target.value }))
                  }
                  onBlur={() =>
                    onFormChange((current) => ({ ...current, phone: formatPhoneNumber(current.phone) }))
                  }
                />
              </InputGroup>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="dni">DNI</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <IdCardIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="dni"
                    value={form.dni}
                    placeholder="12345678"
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, dni: event.target.value }))
                    }
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="maritalStatus">Estado civil</FieldLabel>
                <Select
                  items={maritalStatusItems}
                  value={form.maritalStatus}
                  onValueChange={(value) =>
                    onFormChange((current) => ({
                      ...current,
                      maritalStatus: value ?? "none",
                    }))
                  }
                >
                  <SelectTrigger id="maritalStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {maritalStatusItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="address">Dirección</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MapPinIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="address"
                  value={form.address}
                  placeholder="Av. Principal 123"
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, address: event.target.value }))
                  }
                />
              </InputGroup>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bank">Banco</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <BanknoteIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="bank"
                    value={form.bank}
                    placeholder="BCP, Interbank..."
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, bank: event.target.value }))
                    }
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel>Cuentas bancarias</FieldLabel>
                <div className="flex w-full flex-col gap-2">
                  {form.bankAccounts.map((account, index) => (
                    <InputGroup key={index}>
                      <InputGroupAddon align="inline-start">
                        <BanknoteIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-label={`Cuenta bancaria ${index + 1}`}
                        value={account}
                        placeholder="CCI o número de cuenta"
                        ref={(node) => {
                          bankAccountRefs.current[index] = node
                        }}
                        onChange={(event) => handleBankAccountChange(index, event.target.value)}
                      />
                      <InputGroupAddon align="inline-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar cuenta bancaria ${index + 1}`}
                          disabled={form.bankAccounts.length === 1 && !account}
                          onClick={() => removeBankAccount(index)}
                        >
                          <XIcon />
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  ))}
                  {canAddBankAccount && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8.5 w-full justify-center border-dashed text-muted-foreground animate-in fade-in-0 slide-in-from-top-1 sm:h-7.5"
                      onClick={addBankAccount}
                    >
                      <PlusIcon data-icon="inline-start" />
                      Agregar cuenta bancaria
                    </Button>
                  )}
                </div>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <RoleAccessPanel
                editingUser={editingUser}
                form={form}
                isEditing={isEditing}
                roleItemsForUser={roleItemsForUser}
                onFormChange={onFormChange}
              />

              <AccessStatusField
                authRequired={authRequired}
                editingUser={editingUser}
                form={form}
                isEditing={isEditing}
                permissions={permissions}
                onFormChange={onFormChange}
              />
            </div>

            {!isEditing && (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={form.role === "admin" || form.createAuthAccount}
                    disabled={form.role === "admin"}
                    onCheckedChange={(checked) =>
                      onFormChange((current) => ({
                        ...current,
                        createAuthAccount: current.role === "admin" ? true : Boolean(checked),
                      }))
                    }
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium">Crear cuenta de acceso</span>
                    <span className="block text-muted-foreground">
                      Requiere correo y contraseña temporal. Para usuarios operativos puedes dejarlo desactivado.
                    </span>
                  </span>
                </label>

                {authRequired && (
                  <Field>
                    <FieldLabel htmlFor="password">Contraseña temporal</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <KeyRoundIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="password"
                        type="password"
                        value={form.password}
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        onChange={(event) =>
                          onFormChange((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                      <InputGroupAddon align="inline-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={setGeneratedPassword}
                        >
                          <Dice5Icon data-icon="inline-start" />
                          Generar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!form.password}
                          onClick={() => void copyPassword()}
                        >
                          <CopyIcon data-icon="inline-start" />
                          Copiar
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                )}
              </div>
            )}

            {showInactiveWarning && (
              <div className="flex flex-col gap-3">
                <Alert variant="warning">
                  <CircleAlertIcon />
                  <AlertTitle>
                    {editingUser?.authUserId ? "El usuario quedará sin acceso" : "El usuario quedará inactivo"}
                  </AlertTitle>
                  <AlertDescription>
                    {editingUser?.authUserId
                      ? "Al desactivarlo no podrá iniciar sesión hasta que vuelva a estar activo."
                      : "Al desactivarlo no estará disponible para operaciones en el sistema hasta que vuelva a estar activo."}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </form>
        </DrawerPanel>

        <DrawerFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" disabled={!canSubmit}>
            {saving ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

function LinkAuthDialog({
  open,
  user,
  form,
  saving,
  onFormChange,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  user: ManagedUser | null
  form: LinkAuthFormState
  saving: boolean
  onFormChange: React.Dispatch<React.SetStateAction<LinkAuthFormState>>
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  if (!user) return null

  const setGeneratedPassword = () => {
    onFormChange((current) => ({ ...current, password: generateTemporaryPassword() }))
  }
  const copyPassword = async () => {
    if (!form.password) return
    await navigator.clipboard.writeText(form.password)
    toastManager.add({
      type: "success",
      title: "Contraseña copiada",
      description: "La contraseña temporal quedó en el portapapeles.",
    })
  }

  const isMobile = useIsMobile()

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 520, maxWidth: "min(720px, calc(100vw - 2rem))", minWidth: 420 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>Vincular cuenta de acceso</DrawerTitle>
          <DrawerDescription>
            {displayPersonName(user)} podrá iniciar sesión con el correo y contraseña temporal.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerPanel className="pt-4 max-sm:pt-4">
          <form id="link-auth-form" className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Field>
              <FieldLabel htmlFor="link-email">Correo electrónico</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="link-email"
                  type="email"
                  value={form.email}
                  required
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="link-password">Contraseña temporal</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <KeyRoundIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="link-password"
                  type="password"
                  value={form.password}
                  required
                  minLength={6}
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, password: event.target.value }))
                  }
                />
                <InputGroupAddon align="inline-end">
                  <Button type="button" variant="ghost" size="sm" onClick={setGeneratedPassword}>
                    <Dice5Icon data-icon="inline-start" />
                    Generar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!form.password}
                    onClick={() => void copyPassword()}
                  >
                    <CopyIcon data-icon="inline-start" />
                    Copiar
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </form>
        </DrawerPanel>

        <DrawerFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="link-auth-form" disabled={saving}>
            {saving ? <Spinner data-icon="inline-start" /> : <LinkIcon data-icon="inline-start" />}
            {saving ? "Vinculando..." : "Vincular acceso"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

function RoleAccessPanel({
  editingUser,
  form,
  isEditing,
  roleItemsForUser,
  onFormChange,
}: {
  editingUser: ManagedUser | null
  form: UserFormState
  isEditing: boolean
  roleItemsForUser: { label: string; value: UserRole }[]
  onFormChange: React.Dispatch<React.SetStateAction<UserFormState>>
}) {
  const normalizedRole = normalizeRole(form.role)
  const RoleIcon = normalizedRole === "admin" ? ShieldIcon : UserIcon

  return (
    <Field>
      <FieldLabel htmlFor={isEditing ? undefined : "role"}>Rol</FieldLabel>
      {isEditing ? (
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <RoleIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Rol"
            value={getRoleLabel(normalizedRole)}
            readOnly
            size="lg"
            className="font-medium"
          />
          {editingUser?.isOwner && (
            <InputGroupAddon align="inline-end">
              <Badge variant="secondary">Owner</Badge>
            </InputGroupAddon>
          )}
        </InputGroup>
      ) : (
        <Select
          items={roleItemsForUser}
          value={form.role}
          onValueChange={(value) =>
            onFormChange((current) => ({
              ...current,
              role: value ?? "client",
              createAuthAccount: value === "admin" ? true : current.createAuthAccount,
            }))
          }
        >
          <SelectTrigger id="role" size="lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {roleItemsForUser.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </Field>
  )
}

function AccessStatusField({
  authRequired,
  editingUser,
  form,
  isEditing,
  permissions,
  onFormChange,
}: {
  authRequired: boolean
  editingUser: ManagedUser | null
  form: UserFormState
  isEditing: boolean
  permissions: UserEditPermissions
  onFormChange: React.Dispatch<React.SetStateAction<UserFormState>>
}) {
  const accessUser: ManagedUser = isEditing && editingUser
    ? editingUser
    : { id: "draft", authUserId: authRequired ? "draft" : null }
  const hasAuthAccess = Boolean(accessUser.authUserId)
  const AccessIcon = hasAuthAccess ? BadgeCheckIcon : UserCogIcon

  return (
    <Field>
      <FieldLabel htmlFor="active">Acceso</FieldLabel>
      <div className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-3 text-base shadow-xs/5 sm:min-h-9 sm:text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <AccessIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">
            {hasAuthAccess ? "Con acceso" : "Operativo"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge active={form.active} />
          <Switch
            id="active"
            checked={form.active}
            disabled={!permissions.canUpdateActive}
            onCheckedChange={(checked) =>
              onFormChange((current) => ({ ...current, active: checked }))
            }
          />
        </div>
      </div>
    </Field>
  )
}

function RequestDetailSheet({
  request,
  onOpenChange,
  onReview,
}: {
  request: AccessRequest | null
  onOpenChange: (open: boolean) => void
  onReview: (request: AccessRequest, action: "approved" | "rejected") => void
}) {
  if (!request) return null

  const pending = Boolean(request && isPendingRequest(request.status))
  const isMobile = useIsMobile()

  return (
    <Drawer open={Boolean(request)} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 620, maxWidth: "min(840px, calc(100vw - 2rem))", minWidth: 460 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>Detalle de solicitud</DrawerTitle>
          <DrawerDescription>
            {request
              ? `${displayPersonName(request)} solicitó acceso como ${getRoleLabel(request.roleRequested).toLowerCase()}.`
              : "Selecciona una solicitud para revisar su información."}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel className="p-4 sm:p-6">
          {request && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-normal">
                    {displayPersonName(request)}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {request.id}
                  </p>
                </div>
                <RequestStatusBadge status={request.status} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <RequestDetailItem label="Rol solicitado" value={getRoleLabel(request.roleRequested)} />
                <RequestDetailItem label="Estado" value={getRequestStatusLabel(request.status)} />
                <RequestDetailItem label="Creada" value={formatDate(request.createdAt)} />
                <RequestDetailItem label="Actualizada" value={formatDate(request.updatedAt)} />
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">Contacto</p>
                <div className="mt-3">
                  <ContactStack email={request.email} phone={request.phone} />
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">Observación</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {request.observation || "Sin observación registrada."}
                </p>
              </div>

              {pending && (
                <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => onReview(request, "rejected")}
                  >
                    <XIcon data-icon="inline-start" />
                    Rechazar
                  </Button>
                  <Button onClick={() => onReview(request, "approved")}>
                    <CheckIcon data-icon="inline-start" />
                    Aprobar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  )
}

function RequestDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 wrap-break-word text-sm font-medium">{value}</p>
    </div>
  )
}

function ReviewRequestDialog({
  request,
  action,
  observation,
  initialPassword,
  submitting,
  onObservationChange,
  onInitialPasswordChange,
  onRegeneratePassword,
  onCopyPassword,
  onOpenChange,
  onConfirm,
}: {
  request: AccessRequest | null
  action: "approved" | "rejected" | null
  observation: string
  initialPassword: string
  submitting: boolean
  onObservationChange: (value: string) => void
  onInitialPasswordChange: (value: string) => void
  onRegeneratePassword: () => void
  onCopyPassword: () => Promise<void>
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  if (!request || !action) return null

  const approving = action === "approved"
  const isMobile = useIsMobile()

  return (
    <Drawer open={Boolean(request && action)} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 520, maxWidth: "min(720px, calc(100vw - 2rem))", minWidth: 420 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{approving ? "Aprobar solicitud" : "Rechazar solicitud"}</DrawerTitle>
          <DrawerDescription>
            {request
              ? `${displayPersonName(request)} solicitó acceso como ${getRoleLabel(request.roleRequested).toLowerCase()}.`
              : "Revisa la solicitud seleccionada."}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerPanel className="pt-4 max-sm:pt-4">
          <div className="flex flex-col gap-4">
            {approving && (
              <Field>
                <FieldLabel htmlFor="request-initial-password">Contraseña temporal</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <KeyRoundIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="request-initial-password"
                    type="text"
                    value={initialPassword}
                    required
                    minLength={6}
                    onChange={(event) => onInitialPasswordChange(event.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button type="button" variant="ghost" size="sm" onClick={onRegeneratePassword}>
                      <Dice5Icon data-icon="inline-start" />
                      Generar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!initialPassword}
                      onClick={() => void onCopyPassword()}
                    >
                      <CopyIcon data-icon="inline-start" />
                      Copiar
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            )}
            <Field>
            <FieldLabel htmlFor="request-observation">Observación</FieldLabel>
            <Textarea
              id="request-observation"
              value={observation}
              placeholder={approving ? "Usuario validado para acceso." : "Motivo del rechazo."}
              onChange={(event) => onObservationChange(event.target.value)}
            />
            </Field>
          </div>
        </DrawerPanel>

        <DrawerFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={approving ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={submitting || (approving && initialPassword.trim().length < 6)}
          >
            {submitting ? (
              <Spinner data-icon="inline-start" />
            ) : approving ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <XIcon data-icon="inline-start" />
            )}
            {submitting ? "Procesando..." : approving ? "Aprobar" : "Rechazar"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

function MetricTile({
  label,
  value,
  emphasis = false,
  loading = false,
}: {
  label: string
  value: number
  emphasis?: boolean
  loading?: boolean
}) {
  return (
    <Card className={cn(emphasis && "border-primary/30 bg-primary/3")}>
      <CardContent className="p-4">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold tracking-normal">{value}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function UsersSkeleton() {
  return (
    <DataTableSkeleton
      rows={8}
      tableClassName="min-w-[1180px] table-fixed"
      columns={[
        { className: "w-[260px]", headerWidth: "w-20", cellWidth: "w-44" },
        { className: "w-[250px]", headerWidth: "w-24", cellWidth: "w-52" },
        { className: "w-[250px]", headerWidth: "w-32", cellWidth: "w-44" },
        { className: "w-[150px]", headerWidth: "w-12", cellWidth: "w-24" },
        { className: "w-[160px]", headerWidth: "w-16", cellWidth: "w-28" },
        { className: "w-[120px]", headerWidth: "w-20", cellWidth: "w-24" },
        { className: "w-[220px] text-right", headerWidth: "ml-auto w-16", cellWidth: "ml-auto w-36" },
      ]}
    />
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty className="min-h-80 rounded-lg border bg-card shadow-xs/5">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>No se pudo cargar la información</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCwIcon data-icon="inline-start" />
          Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function UserIdentity({ user }: { user: ManagedUser }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-10">
        <AvatarImage src={user.avatarUrl ?? user.avatar ?? undefined} />
        <AvatarFallback>{initials(user)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">{displayPersonName(user)}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {user.publicCode || user.id}
        </p>
      </div>
    </div>
  )
}

function ContactStack({ email, phone }: { email?: string | null; phone?: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <MailIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{email || "Sin correo"}</span>
      </span>
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <PhoneIcon className="size-3.5 shrink-0" />
        <span className="truncate">{phone || "Sin teléfono"}</span>
      </span>
    </div>
  )
}

function BankAccountsStack({ accounts }: { accounts?: string[] }) {
  const visibleAccounts = (accounts ?? []).filter(Boolean)
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      {visibleAccounts.length ? (
        visibleAccounts.map((account, index) => (
          <span key={`${account}-${index}`} className="truncate font-mono text-xs">
            {account}
          </span>
        ))
      ) : (
        <span className="text-muted-foreground">Sin cuentas</span>
      )}
    </div>
  )
}

function RoleBadge({ role, isOwner }: { role?: string; isOwner?: boolean }) {
  const normalizedRole = normalizeRole(role)
  const Icon = normalizedRole === "admin" ? ShieldIcon : UserIcon

  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        variant={
          normalizedRole === "admin"
            ? "default"
            : normalizedRole === "investor"
              ? "secondary"
              : "outline"
        }
      >
        <Icon data-icon="inline-start" />
        {getRoleLabel(normalizedRole)}
      </Badge>
      {isOwner && <Badge variant="secondary">Owner</Badge>}
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "default" : "outline"}>
      {active ? "Activo" : "Inactivo"}
    </Badge>
  )
}

function AccessBadge({ user }: { user: ManagedUser }) {
  if (user.authUserId) {
    return (
      <Badge variant="secondary">
        <BadgeCheckIcon data-icon="inline-start" />
        Con acceso
      </Badge>
    )
  }

  return (
    <Badge variant="outline">
      Operativo
    </Badge>
  )
}

function RequestStatusBadge({ status }: { status?: RequestStatus }) {
  const normalized = normalizeRequestStatus(status)

  if (normalized === "approved") return <Badge>Aprobada</Badge>
  if (normalized === "rejected") return <Badge variant="destructive">Rechazada</Badge>
  if (normalized === "in_review") return <Badge variant="secondary">En revisión</Badge>
  return <Badge variant="outline">Pendiente</Badge>
}

function normalizeRequestStatus(status?: RequestStatus | null): RequestStatusFilter {
  if (status === "approved" || status === "rejected" || status === "in_review") return status
  return "pending"
}

function getRequestStatusLabel(status?: RequestStatus | null) {
  const labels: Record<RequestStatusFilter, string> = {
    all: "Todos",
    approved: "Aprobada",
    in_review: "En revisión",
    pending: "Pendiente",
    rejected: "Rechazada",
  }

  return labels[normalizeRequestStatus(status)]
}

function normalizeRole(role?: string | null) {
  if (role === "admin" || role === "investor" || role === "client") return role
  return "client"
}

function normalizeEditableRole(role?: string | null): UserRole {
  return normalizeRole(role) as UserRole
}

function canManageUser(currentUser: CurrentUser, targetUser: ManagedUser | null) {
  if (!currentUser || !targetUser) return false
  if (targetUser.isOwner) return false
  if (currentUser.isOwner) return true
  if (currentUser.id === targetUser.id) return true

  return currentUser.role === "admin" && normalizeRole(targetUser.role) !== "admin"
}

function canUseAdministrativeUpdate(currentUser: CurrentUser, targetUser: ManagedUser | null) {
  if (!currentUser || !targetUser) return false
  if (targetUser.isOwner) return false
  if (currentUser.isOwner) return true

  return (
    currentUser.role === "admin" &&
    currentUser.id !== targetUser.id &&
    normalizeRole(targetUser.role) !== "admin"
  )
}

function canLinkAuthAccount(currentUser: CurrentUser, targetUser: ManagedUser | null) {
  if (!targetUser?.id || targetUser.authUserId) return false
  const role = normalizeRole(targetUser.role)
  if (role === "admin") return false
  return canUseAdministrativeUpdate(currentUser, targetUser)
}

function getUserEditPermissions(currentUser: CurrentUser, targetUser: ManagedUser | null): UserEditPermissions {
  const canUpdateAdministrativeFields = canUseAdministrativeUpdate(currentUser, targetUser)

  return {
    canUpdateAdministrativeFields,
    canUpdateActive: canUpdateAdministrativeFields,
  }
}

function getRoleLabel(role?: string | null) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    client: "Cliente",
    investor: "Inversionista",
  }

  return labels[role ?? ""] ?? role ?? "-"
}

function displayPersonName(person: { firstName?: string; lastName?: string; email?: string | null }) {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim()
  return name || person.email || "Usuario sin nombre"
}

function getMaritalStatusLabel(status?: MaritalStatus | null) {
  const labels: Record<MaritalStatus, string> = {
    single: "Soltero/a",
    married: "Casado/a",
    unspecified: "No especificado",
  }

  return status ? labels[status] : "Sin registrar"
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function initials(person: { firstName?: string; lastName?: string; email?: string | null }) {
  const first = person.firstName?.trim()[0]
  const last = person.lastName?.trim()[0]
  const fallback = person.email?.trim()[0] ?? "U"
  return `${first ?? fallback}${last ?? ""}`.toUpperCase()
}

function isPendingRequest(status?: RequestStatus) {
  return !status || status === "pending" || status === "in_review"
}

function formatDate(value?: string) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
