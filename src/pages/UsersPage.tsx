import { useQueryClient } from "@tanstack/react-query"
import { PlusIcon, RefreshCwIcon, ShieldIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
  PaginationMeta,
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
  fetchAccessRequests,
  fetchUsers,
  generateTemporaryPassword,
  getErrorMessage,
  getUserEditPermissions,
  isPendingRequest,
  linkAuthAccount,
  normalizeEditableRole,
  normalizeRequestStatus,
  normalizeRole,
  normalizeSearch,
  readUsersPreferences,
  rememberVisibleIds,
  reviewAccessRequest,
  serializeBankAccounts,
  updateUser,
  upsertById,
  writeUsersPreferences,
} from "./users/utils"

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
    const newUserTimeout = newUserTimeoutRef.current
    const newRequestTimeout = newRequestTimeoutRef.current
    return () => {
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
