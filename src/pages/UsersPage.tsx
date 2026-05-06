import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckIcon,
  CircleAlertIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import type { ApiResponse, PaginationMeta, UserRole } from "@/types/loans"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
const USERS_PAGE_SIZE = 10

type UsersTab = "users" | "requests"
type RoleFilter = "all" | UserRole
type StatusFilter = "all" | "active" | "inactive"
type RequestStatus = "pending" | "in_review" | "approved" | "rejected" | string

type ManagedUser = {
  id: string
  publicCode?: string | null
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
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
  active: boolean
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

const editableRoleItems: { label: string; value: UserRole }[] = [
  { label: "Cliente", value: "client" },
  { label: "Inversionista", value: "investor" },
  { label: "Administrador", value: "admin" },
]

const statusItems: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Inactivos", value: "inactive" },
]

const defaultUserForm: UserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "client",
  active: true,
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

async function readApiPayload<T>(response: Response): Promise<ApiResponse<T>> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "No se pudo completar la solicitud.")
  }

  return payload
}

async function fetchUsers(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/users`)
  const payload = await readApiPayload<ManagedUser[] | UsersEnvelope>(response)
  return unwrapUsers(payload.data)
}

async function fetchAccessRequests(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/access-requests`)
  const payload = await readApiPayload<AccessRequest[] | RequestsEnvelope>(response)
  return unwrapRequests(payload.data)
}

async function createUser(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  form: UserFormState,
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
    }),
  })

  return readApiPayload<ManagedUser>(response)
}

async function updateUser(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  userId: string,
  form: UserFormState,
  options: { canUpdateActive: boolean },
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
      active: options.canUpdateActive ? form.active : undefined,
    }),
  })

  return readApiPayload<ManagedUser>(response)
}

async function reviewAccessRequest(
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  requestId: string,
  status: "approved" | "rejected",
  observation: string,
) {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/api/v1/access-requests/${requestId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      observation: observation.trim() || undefined,
    }),
  })

  return readApiPayload<AccessRequest>(response)
}

export default function UsersPage({ initialTab = "users" }: { initialTab?: UsersTab }) {
  const { user, session, fetchWithAuth } = useAuth()
  const [activeTab, setActiveTab] = useState<UsersTab>(initialTab)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [refreshingUsers, setRefreshingUsers] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [userForm, setUserForm] = useState<UserFormState>(defaultUserForm)
  const [savingUser, setSavingUser] = useState(false)
  const [reviewingRequest, setReviewingRequest] = useState<AccessRequest | null>(null)
  const [requestAction, setRequestAction] = useState<"approved" | "rejected" | null>(null)
  const [requestObservation, setRequestObservation] = useState("")
  const [submittingRequest, setSubmittingRequest] = useState(false)

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

  const pagedUsers = useMemo(() => {
    const start = (currentUserPage - 1) * USERS_PAGE_SIZE
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE)
  }, [currentUserPage, filteredUsers])

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
        setUsers(await fetchUsers(fetchWithAuth))
      } catch (error) {
        setUsersError(getErrorMessage(error, "No se pudieron cargar los usuarios."))
      } finally {
        setLoadingUsers(false)
        setRefreshingUsers(false)
      }
    },
    [fetchWithAuth, isAdmin, session?.access_token],
  )

  const loadRequests = useCallback(async () => {
    if (!session?.access_token || !isAdmin) return

    setLoadingRequests(true)
    setRequestsError(null)

    try {
      setRequests(await fetchAccessRequests(fetchWithAuth))
    } catch (error) {
      setRequestsError(getErrorMessage(error, "No se pudieron cargar las solicitudes."))
    } finally {
      setLoadingRequests(false)
    }
  }, [fetchWithAuth, isAdmin, session?.access_token])

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

  const openCreateDialog = () => {
    setUserForm(defaultUserForm)
    setEditingUser(null)
    setCreateOpen(true)
  }

  const openEditDialog = (selectedUser: ManagedUser) => {
    setUserForm({
      firstName: selectedUser.firstName ?? "",
      lastName: selectedUser.lastName ?? "",
      email: selectedUser.email ?? "",
      phone: selectedUser.phone ?? "",
      role: normalizeEditableRole(selectedUser.role),
      active: selectedUser.active !== false,
    })
    setEditingUser(selectedUser)
    setCreateOpen(true)
  }

  const handleSubmitUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingUser(true)

    try {
      if (editingUser) {
        await updateUser(fetchWithAuth, editingUser.id, userForm, {
          canUpdateActive: !editingUser.isOwner,
        })
      } else {
        await createUser(fetchWithAuth, userForm)
      }

      toastManager.add({
        type: "success",
        title: editingUser ? "Usuario actualizado" : "Usuario creado",
        description: "La información quedó sincronizada con el servidor.",
      })
      setCreateOpen(false)
      setEditingUser(null)
      await loadUsers({ keepContent: true })
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

  const handleReviewRequest = async () => {
    if (!reviewingRequest || !requestAction) return

    setSubmittingRequest(true)
    try {
      await reviewAccessRequest(
        fetchWithAuth,
        reviewingRequest.id,
        requestAction,
        requestObservation,
      )
      toastManager.add({
        type: "success",
        title: requestAction === "approved" ? "Solicitud aprobada" : "Solicitud rechazada",
        description:
          requestAction === "approved"
            ? "El acceso fue aprobado y el servidor puede crear el usuario."
            : "La solicitud quedó marcada como rechazada.",
      })
      setReviewingRequest(null)
      setRequestAction(null)
      setRequestObservation("")
      await Promise.all([loadUsers({ keepContent: true }), loadRequests()])
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
        <Empty className="min-h-[420px] rounded-lg border bg-card">
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
            <Badge variant="secondary">{stats.total} registros</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Administra perfiles, roles, estado de acceso y solicitudes pendientes.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              void Promise.all([loadUsers({ keepContent: true }), loadRequests()])
            }}
            disabled={loadingUsers || refreshingUsers || loadingRequests}
            aria-label="Actualizar usuarios"
          >
            {refreshingUsers ? <Spinner /> : <RefreshCwIcon />}
          </Button>
          <Button className="max-sm:px-2" onClick={openCreateDialog}>
            <PlusIcon data-icon="inline-start" />
            <span className="max-sm:hidden">Nuevo usuario</span>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Total" value={stats.total} />
        <MetricTile label="Clientes" value={stats.clients} />
        <MetricTile label="Inversionistas" value={stats.investors} />
        <MetricTile label="Administradores" value={stats.admins} />
        <MetricTile label="Solicitudes pendientes" value={stats.pendingRequests} emphasis />
      </section>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UsersTab)} className="gap-5">
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
            users={pagedUsers}
            pagination={usersPagination}
            page={page}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            loading={loadingUsers}
            refreshing={refreshingUsers}
            error={usersError}
            onEditUser={openEditDialog}
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
            loading={loadingRequests}
            error={requestsError}
            onRetry={() => void loadRequests()}
            onReview={(request, action) => {
              setReviewingRequest(request)
              setRequestAction(action)
              setRequestObservation(request.observation ?? "")
            }}
          />
        </TabsContent>
      </Tabs>

      <UserDialog
        open={createOpen}
        editingUser={editingUser}
        form={userForm}
        saving={savingUser}
        onFormChange={setUserForm}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setEditingUser(null)
        }}
        onSubmit={handleSubmitUser}
      />

      <ReviewRequestDialog
        request={reviewingRequest}
        action={requestAction}
        observation={requestObservation}
        submitting={submittingRequest}
        onObservationChange={setRequestObservation}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingRequest(null)
            setRequestAction(null)
            setRequestObservation("")
          }
        }}
        onConfirm={() => void handleReviewRequest()}
      />
    </main>
  )
}

function UsersWorkspace({
  users,
  pagination,
  page,
  roleFilter,
  statusFilter,
  searchQuery,
  loading,
  refreshing,
  error,
  onEditUser,
  onPageChange,
  onRetry,
  onRoleFilterChange,
  onSearchQueryChange,
  onStatusFilterChange,
}: {
  users: ManagedUser[]
  pagination: PaginationMeta
  page: number
  roleFilter: RoleFilter
  statusFilter: StatusFilter
  searchQuery: string
  loading: boolean
  refreshing: boolean
  error: string | null
  onEditUser: (user: ManagedUser) => void
  onPageChange: (page: number) => void
  onRetry: () => void
  onRoleFilterChange: (value: RoleFilter | null) => void
  onSearchQueryChange: (query: string) => void
  onStatusFilterChange: (value: StatusFilter | null) => void
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                placeholder="Buscar por nombre, correo o teléfono"
                onChange={(event) => onSearchQueryChange(event.target.value)}
              />
            </InputGroup>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px]">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <UsersSkeleton />
      ) : users.length === 0 ? (
        <Empty className="min-h-[360px] rounded-lg border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No hay usuarios para mostrar</EmptyTitle>
            <EmptyDescription>
              Ajusta los filtros o registra un nuevo usuario para continuar.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
            <Table className="min-w-[760px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Usuario</TableHead>
                  <TableHead className="w-[270px]">Contacto</TableHead>
                  <TableHead className="w-[150px]">Rol</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead className="w-[120px]">Registro</TableHead>
                  <TableHead className="w-[110px] text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={cn(refreshing && "opacity-70")}>
                {users.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-0">
                      <UserIdentity user={item} />
                    </TableCell>
                    <TableCell className="min-w-0">
                      <ContactStack email={item.email} phone={item.phone} />
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={item.role} isOwner={item.isOwner} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge active={item.active !== false} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => onEditUser(item)}>
                        <UserCogIcon data-icon="inline-start" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationFooter
            page={page}
            totalPages={pagination.totalPages ?? 1}
            total={pagination.total}
            onPageChange={onPageChange}
          />
        </>
      )}
    </section>
  )
}

function RequestsWorkspace({
  requests,
  loading,
  error,
  onRetry,
  onReview,
}: {
  requests: AccessRequest[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onReview: (request: AccessRequest, action: "approved" | "rejected") => void
}) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />
  }

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <Empty className="min-h-[360px] rounded-lg border bg-card">
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
    )
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <Table className="min-w-[900px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[260px]">Solicitante</TableHead>
            <TableHead className="w-[260px]">Contacto</TableHead>
            <TableHead className="w-[150px]">Rol solicitado</TableHead>
            <TableHead className="w-[120px]">Estado</TableHead>
            <TableHead className="w-[120px]">Creada</TableHead>
            <TableHead className="w-[210px]">Observación</TableHead>
            <TableHead className="w-[190px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const pending = isPendingRequest(request.status)

            return (
              <TableRow key={request.id}>
                <TableCell className="min-w-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{displayPersonName(request)}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{request.id}</p>
                  </div>
                </TableCell>
                <TableCell className="min-w-0">
                  <ContactStack email={request.email} phone={request.phone} />
                </TableCell>
                <TableCell>{getRoleLabel(request.roleRequested)}</TableCell>
                <TableCell>
                  <RequestStatusBadge status={request.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(request.createdAt)}
                </TableCell>
                <TableCell className="min-w-0">
                  <span className="block truncate text-muted-foreground">
                    {request.observation || "-"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pending}
                      onClick={() => onReview(request, "rejected")}
                    >
                      <XIcon data-icon="inline-start" />
                      Rechazar
                    </Button>
                    <Button size="sm" disabled={!pending} onClick={() => onReview(request, "approved")}>
                      <CheckIcon data-icon="inline-start" />
                      Aprobar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}

function UserDialog({
  open,
  editingUser,
  form,
  saving,
  onFormChange,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  editingUser: ManagedUser | null
  form: UserFormState
  saving: boolean
  onFormChange: React.Dispatch<React.SetStateAction<UserFormState>>
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const editingOwner = Boolean(editingUser?.isOwner)
  const showAdminWarning = form.role === "admin"
  const showInactiveWarning = Boolean(editingUser && !editingOwner && !form.active)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingUser ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {editingUser
              ? "Actualiza rol, estado y datos de contacto del perfil."
              : "Registra un usuario administrativo de forma manual."}
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="pt-4 max-sm:pt-4">
          <form id="user-form" className="flex flex-col gap-4" onSubmit={onSubmit}>
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
                  required
                  disabled={Boolean(editingUser)}
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </InputGroup>
              {editingUser && (
                <FieldDescription>El correo no se cambia desde esta pantalla.</FieldDescription>
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
                />
              </InputGroup>
            </Field>

            <div className={cn("grid gap-4", editingUser ? "sm:grid-cols-[1fr_auto] sm:items-end" : "")}>
              <Field>
                <FieldLabel>Rol</FieldLabel>
                <Select
                  items={editableRoleItems}
                  value={form.role}
                  onValueChange={(value) =>
                    onFormChange((current) => ({
                      ...current,
                      role: normalizeEditableRole(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {editableRoleItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {editingUser && (
                <Field className="rounded-lg border px-3 py-2 sm:min-w-44">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div>
                      <FieldLabel htmlFor="active">Activo</FieldLabel>
                      <FieldDescription>
                        {editingOwner ? "Dueño protegido" : "Permite acceso"}
                      </FieldDescription>
                    </div>
                    <Switch
                      id="active"
                      checked={form.active}
                      disabled={editingOwner}
                      onCheckedChange={(checked) =>
                        onFormChange((current) => ({ ...current, active: checked }))
                      }
                    />
                  </div>
                </Field>
              )}
            </div>

            {(showAdminWarning || showInactiveWarning || editingOwner) && (
              <div className="flex flex-col gap-3">
                {showAdminWarning && (
                  <Alert variant="warning">
                    <CircleAlertIcon />
                    <AlertTitle>Rol con acceso administrativo</AlertTitle>
                    <AlertDescription>
                      Este usuario podrá gestionar préstamos, usuarios y solicitudes.
                    </AlertDescription>
                  </Alert>
                )}
                {showInactiveWarning && (
                  <Alert variant="warning">
                    <CircleAlertIcon />
                    <AlertTitle>El usuario quedará sin acceso</AlertTitle>
                    <AlertDescription>
                      Al desactivarlo no podrá iniciar sesión hasta que vuelva a estar activo.
                    </AlertDescription>
                  </Alert>
                )}
                {editingOwner && (
                  <Alert variant="info">
                    <ShieldIcon />
                    <AlertTitle>El dueño no se puede desactivar</AlertTitle>
                    <AlertDescription>
                      La UI bloquea este cambio y el backend también lo rechaza.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </form>
        </DialogPanel>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" disabled={saving}>
            {saving ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewRequestDialog({
  request,
  action,
  observation,
  submitting,
  onObservationChange,
  onOpenChange,
  onConfirm,
}: {
  request: AccessRequest | null
  action: "approved" | "rejected" | null
  observation: string
  submitting: boolean
  onObservationChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const approving = action === "approved"

  return (
    <Dialog open={Boolean(request && action)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{approving ? "Aprobar solicitud" : "Rechazar solicitud"}</DialogTitle>
          <DialogDescription>
            {request
              ? `${displayPersonName(request)} solicitó acceso como ${getRoleLabel(request.roleRequested).toLowerCase()}.`
              : "Revisa la solicitud seleccionada."}
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="pt-4 max-sm:pt-4">
          <Field>
            <FieldLabel htmlFor="request-observation">Observación</FieldLabel>
            <Textarea
              id="request-observation"
              value={observation}
              placeholder={approving ? "Usuario validado para acceso." : "Motivo del rechazo."}
              onChange={(event) => onObservationChange(event.target.value)}
            />
          </Field>
        </DialogPanel>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={approving ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={submitting}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MetricTile({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <Card className={cn(emphasis && "border-primary/30 bg-primary/[0.03]")}>
      <CardContent className="p-4">
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function UsersSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-16 rounded-lg" />
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty className="min-h-[320px] rounded-lg border bg-card">
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

function PaginationFooter({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  total?: number
  onPageChange: (page: number) => void
}) {
  const normalizedTotalPages = Math.max(totalPages, 1)

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        Página {page} de {normalizedTotalPages}
        {typeof total === "number" ? ` · ${total} usuarios` : ""}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(page - 1, 1))}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= normalizedTotalPages}
          onClick={() => onPageChange(Math.min(page + 1, normalizedTotalPages))}
        >
          Siguiente
        </Button>
      </div>
    </div>
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

function ContactStack({ email, phone }: { email?: string; phone?: string }) {
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

function RequestStatusBadge({ status }: { status?: RequestStatus }) {
  const normalized = status ?? "pending"

  if (normalized === "approved") return <Badge>Aprobada</Badge>
  if (normalized === "rejected") return <Badge variant="destructive">Rechazada</Badge>
  if (normalized === "in_review") return <Badge variant="secondary">En revisión</Badge>
  return <Badge variant="outline">Pendiente</Badge>
}

function normalizeRole(role?: string | null) {
  if (role === "admin" || role === "investor" || role === "client") return role
  return "client"
}

function normalizeEditableRole(role?: string | null): UserRole {
  return normalizeRole(role) as UserRole
}

function getRoleLabel(role?: string | null) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    client: "Cliente",
    investor: "Inversionista",
  }

  return labels[role ?? ""] ?? role ?? "-"
}

function displayPersonName(person: { firstName?: string; lastName?: string; email?: string }) {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim()
  return name || person.email || "Usuario sin nombre"
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function initials(person: { firstName?: string; lastName?: string; email?: string }) {
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
