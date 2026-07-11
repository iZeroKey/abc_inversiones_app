import { useQueryClient } from "@tanstack/react-query"
import { PlusIcon, RefreshCwIcon, ShieldIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import { getAuthQueryScope } from "@/features/loans/loan-queries"
import { useUsersQuery, useAccessRequestsQuery } from "@/hooks/queries/users-queries"
import { getErrorMessage } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import { realtimeDomainEvent, type RealtimeDomainDetail } from "@/lib/realtime"

import { MetricTile } from "./users/components"
import { ReviewRequestDialog, RequestDetailSheet } from "./users/ReviewRequestDialog"
import { UserDialog, LinkAuthDialog } from "./users/UserDialog"
import { RequestsWorkspace } from "./users/RequestsWorkspace"
import { UsersWorkspace } from "./users/UsersWorkspace"
import type {
  AccessRequest,
  LinkAuthFormState,
  ManagedUser,
  RequestRoleFilter,
  RequestStatusFilter,
  RoleFilter,
  StatusFilter,
  UserFormState,
  UsersTab,
} from "./users/utils"
import {
  USERS_PAGE_SIZE,
  canLinkAuthAccount,
  canManageUser,
  createUser,
  defaultLinkAuthForm,
  defaultUserForm,
  generateTemporaryPassword,
  getUserEditPermissions,
  isPendingRequest,
  linkAuthAccount,
  normalizeEditableRole,
  normalizeRole,
  readUsersPreferences,
  reviewAccessRequest,
  serializeBankAccounts,
  updateUser,
  writeUsersPreferences,
} from "./users/utils"

export default function UsersPage({ initialTab = "users" }: { initialTab?: UsersTab }) {
  const { user, session, fetchWithAuth } = useAuth()
  const queryClient = useQueryClient()
  const queryScope = useMemo(() => getAuthQueryScope(user), [user])

  // ── Tab ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<UsersTab>(() => readUsersPreferences().activeTab ?? initialTab)

  // ── Users filter state (drives server-side query) ─────────────────────
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  // ── Requests filter state (drives server-side query) ──────────────────
  const [requestPage, setRequestPage] = useState(1)
  const [requestSearchQuery, setRequestSearchQuery] = useState("")
  const [requestRoleFilter, setRequestRoleFilter] = useState<RequestRoleFilter>("all")
  const [requestStatusFilter, setRequestStatusFilter] = useState<RequestStatusFilter>("all")

  // ── Dialogs & forms ───────────────────────────────────────────────────
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

  // ── New-item highlighting ─────────────────────────────────────────────
  const [newUserIds, setNewUserIds] = useState<Set<string>>(() => new Set())
  const [newRequestIds, setNewRequestIds] = useState<Set<string>>(() => new Set())
  const visibleUserIdsRef = useRef<Set<string>>(new Set())
  const visibleRequestIdsRef = useRef<Set<string>>(new Set())
  const newUserTimeoutRef = useRef<number | undefined>(undefined)
  const newRequestTimeoutRef = useRef<number | undefined>(undefined)

  const isAdmin = user?.role === "admin" || Boolean(user?.isOwner)

  // ── Queries ───────────────────────────────────────────────────────────
  const usersQuery = useUsersQuery({
    page,
    limit: USERS_PAGE_SIZE,
    search: searchQuery || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    active: statusFilter === "active" ? "true" : statusFilter === "inactive" ? "false" : undefined,
  })

  const requestsQuery = useAccessRequestsQuery({
    page: requestPage,
    limit: USERS_PAGE_SIZE,
    search: requestSearchQuery || undefined,
    roleRequested: requestRoleFilter !== "all" ? requestRoleFilter : undefined,
    status: requestStatusFilter !== "all" ? requestStatusFilter : undefined,
  })

  const users = usersQuery.data?.users ?? []
  const usersPagination = usersQuery.data?.meta ?? { page: 1, limit: USERS_PAGE_SIZE, total: 0, totalPages: 1 }
  const requests = requestsQuery.data?.requests ?? []
  const requestsPagination = requestsQuery.data?.meta ?? { page: 1, limit: USERS_PAGE_SIZE, total: 0, totalPages: 1 }

  // ── Stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = usersPagination.total ?? users.length
    const clients = users.filter((item) => normalizeRole(item.role) === "client").length
    const investors = users.filter((item) => normalizeRole(item.role) === "investor").length
    const admins = users.filter((item) => normalizeRole(item.role) === "admin" || item.isOwner).length
    const pendingRequests = requests.filter((item) => isPendingRequest(item.status)).length

    return { admins, clients, investors, pendingRequests, total }
  }, [requests, users, usersPagination.total])

  // ── New-item highlight effect (users) ─────────────────────────────────
  useEffect(() => {
    if (!usersQuery.data?.users) return
    const nextUsers = usersQuery.data.users
    const previousIds = visibleUserIdsRef.current
    const nextIds = new Set(nextUsers.map((item) => item.id))
    const addedIds =
      previousIds.size > 0
        ? nextUsers.map((item) => item.id).filter((id) => !previousIds.has(id))
        : []

    visibleUserIdsRef.current = nextIds
    if (addedIds.length > 0) {
      if (newUserTimeoutRef.current !== undefined) {
        window.clearTimeout(newUserTimeoutRef.current)
      }
      setNewUserIds(new Set(addedIds))
      newUserTimeoutRef.current = window.setTimeout(() => {
        setNewUserIds(new Set())
        newUserTimeoutRef.current = undefined
      }, 2200)
    }
  }, [usersQuery.data?.users])

  // ── New-item highlight effect (requests) ──────────────────────────────
  useEffect(() => {
    if (!requestsQuery.data?.requests) return
    const nextRequests = requestsQuery.data.requests
    const previousIds = visibleRequestIdsRef.current
    const nextIds = new Set(nextRequests.map((item) => item.id))
    const addedIds =
      previousIds.size > 0
        ? nextRequests.map((item) => item.id).filter((id) => !previousIds.has(id))
        : []

    visibleRequestIdsRef.current = nextIds
    if (addedIds.length > 0) {
      if (newRequestTimeoutRef.current !== undefined) {
        window.clearTimeout(newRequestTimeoutRef.current)
      }
      setNewRequestIds(new Set(addedIds))
      newRequestTimeoutRef.current = window.setTimeout(() => {
        setNewRequestIds(new Set())
        newRequestTimeoutRef.current = undefined
      }, 2200)
    }
  }, [requestsQuery.data?.requests])

  // ── Realtime ──────────────────────────────────────────────────────────
  useEffect(() => {
    const refreshFromRealtime = (event: Event) => {
      const detail = (event as CustomEvent<RealtimeDomainDetail>).detail
      if (!detail?.type) return

      if (detail.type.startsWith("user.")) {
        void usersQuery.refetch()
      }

      if (detail.type.startsWith("access-request.")) {
        void requestsQuery.refetch()
      }
    }

    window.addEventListener(realtimeDomainEvent, refreshFromRealtime)
    return () => window.removeEventListener(realtimeDomainEvent, refreshFromRealtime)
  }, [usersQuery, requestsQuery])

  // ── Cleanup highlight timeouts ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (newUserTimeoutRef.current !== undefined) {
        window.clearTimeout(newUserTimeoutRef.current)
      }
      if (newRequestTimeoutRef.current !== undefined) {
        window.clearTimeout(newRequestTimeoutRef.current)
      }
    }
  }, [])

  // ── Dialogs ───────────────────────────────────────────────────────────
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

      // Refetch instead of manual cache update — server-side pagination
      // makes client-side insertions unreliable
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
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
      await linkAuthAccount(fetchWithAuth, linkingUser.id, linkAuthForm)

      toastManager.add({
        type: "success",
        title: "Cuenta vinculada",
        description: "El usuario ya puede ingresar con credenciales de acceso.",
      })
      setLinkingUser(null)
      setLinkAuthForm(defaultLinkAuthForm)

      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
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

      // Invalidate both users and requests queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
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
            {usersQuery.isLoading ? (
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
            variant="secondary"
            size="icon"
            onClick={() => {
              void Promise.all([usersQuery.refetch(), requestsQuery.refetch()])
            }}
            disabled={usersQuery.isLoading || usersQuery.isFetching || requestsQuery.isLoading || requestsQuery.isFetching}
            aria-label="Actualizar usuarios"
          >
            {(usersQuery.isFetching && !usersQuery.isLoading) || (requestsQuery.isFetching && !requestsQuery.isLoading)
              ? <Spinner />
              : <RefreshCwIcon />}
          </Button>
          <Button className="max-sm:px-2" onClick={openCreateDialog}>
            <PlusIcon data-icon="inline-start" />
            <span className="max-sm:hidden">Nuevo usuario</span>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Total" value={stats.total} loading={usersQuery.isLoading} />
        <MetricTile label="Clientes" value={stats.clients} loading={usersQuery.isLoading} />
        <MetricTile label="Inversionistas" value={stats.investors} loading={usersQuery.isLoading} />
        <MetricTile label="Administradores" value={stats.admins} loading={usersQuery.isLoading} />
        <MetricTile label="Solicitudes pendientes" value={stats.pendingRequests} loading={requestsQuery.isLoading} emphasis />
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
            users={users}
            highlightedUserIds={newUserIds}
            pagination={usersPagination}
            page={page}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            loading={usersQuery.isLoading}
            refreshing={usersQuery.isFetching && !usersQuery.isLoading}
            error={usersQuery.error ? getErrorMessage(usersQuery.error, "No se pudieron cargar los usuarios.") : null}
            currentUser={user}
            onEditUser={openEditDialog}
            onLinkAuth={openLinkAuthDialog}
            onPageChange={setPage}
            onRetry={() => void usersQuery.refetch()}
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
            highlightedRequestIds={newRequestIds}
            pagination={requestsPagination}
            page={requestPage}
            searchQuery={requestSearchQuery}
            roleFilter={requestRoleFilter}
            statusFilter={requestStatusFilter}
            loading={requestsQuery.isLoading}
            refreshing={requestsQuery.isFetching && !requestsQuery.isLoading}
            error={requestsQuery.error ? getErrorMessage(requestsQuery.error, "No se pudieron cargar las solicitudes.") : null}
            onRetry={() => void requestsQuery.refetch()}
            onSearchQueryChange={(query) => {
              setRequestSearchQuery(query)
              setRequestPage(1)
            }}
            onRoleFilterChange={(value) => {
              setRequestRoleFilter(value ?? "all")
              setRequestPage(1)
            }}
            onStatusFilterChange={(value) => {
              setRequestStatusFilter(value ?? "all")
              setRequestPage(1)
            }}
            onPageChange={setRequestPage}
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
