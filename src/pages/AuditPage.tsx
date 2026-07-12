import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ActivityIcon,
  AlertCircleIcon,
  CalendarClockIcon,
  DatabaseIcon,
  FingerprintIcon,
  InfoIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  UserIcon
} from "lucide-react"
import type { ElementType } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  DataTableCard,
  DataTableSkeleton,
  DataTableStaticHeader,
} from "@/components/data-table-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox"
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { InfoRow } from "@/components/ui/info-row"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { UserDetailDrawer } from "@/components/UserDetailDrawer"
import { useAuth } from "@/contexts/auth-context"
import { useIsRecentStructuralChange } from "@/contexts/realtime-context"
import { useAuditLogsQuery } from "@/hooks/queries/audit-queries"
import { useIsMobile } from "@/hooks/use-media-query"
import { getErrorMessage } from "@/lib/api-client"

import { AUDIT_PAGE_SIZE, type AuditLog } from "@/lib/audit-api"
import { resolveAvatarUrl } from "@/lib/avatar-image"
import { fetchUserById } from "@/lib/loans-api"
import { realtimeDomainEvent, type RealtimeDomainDetail } from "@/lib/realtime"
import { cn } from "@/lib/utils"



type AuditUser = {
  id: string
  publicCode?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  dni?: string | null
  role?: "admin" | "client" | "investor" | string | null
  active?: boolean | null
  avatarUrl?: string | null
  avatar?: string | null
}

type AuditFilters = {
  module: string
  action: string
  userId: string
}

const emptyFilters: AuditFilters = {
  module: "",
  action: "",
  userId: "",
}

const moduleLabels: Record<string, string> = {
  AUTH: "Autenticación",
  USERS: "Usuarios",
  LOANS: "Préstamos",
  PAYMENTS: "Pagos",
  VOUCHERS: "Comprobantes",
  ACCESS_REQUESTS: "Solicitudes de acceso",
  NOTIFICATIONS: "Notificaciones",
  REPORTS: "Reportes",
}

const actionLabels: Record<string, string> = {
  LOGIN: "Inicio de sesión",
  LOGOUT: "Cierre de sesión",
  REGISTER: "Registro",
  REGISTER_USER: "Usuario creado",
  UPDATE_USER: "Usuario actualizado",
  DELETE_USER: "Usuario eliminado",
  CHANGE_PASSWORD: "Contraseña cambiada",
  CREATE_LOAN: "Préstamo creado",
  UPDATE_LOAN: "Préstamo actualizado",
  ADMIN_APPROVE_LOAN: "Préstamo aprobado por administración",
  INVESTOR_APPROVE_LOAN: "Préstamo aprobado por inversionista",
  REJECT_LOAN: "Préstamo rechazado",
  DELETE_LOAN: "Préstamo eliminado",
  REGISTER_MANUAL_PAYMENT: "Pago manual registrado",
  UPDATE_PAYMENT: "Pago actualizado",
  DELETE_PAYMENT: "Pago eliminado",
  SUBMIT_VOUCHER: "Comprobante enviado",
  PROCESS_VOUCHER_APPROVE: "Comprobante aprobado",
  PROCESS_VOUCHER_REJECT: "Comprobante rechazado",
  UPDATE_VOUCHER: "Comprobante actualizado",
  DELETE_VOUCHER: "Comprobante eliminado",
  SUBMIT_ACCESS_REQUEST: "Solicitud de acceso enviada",
  PROCESS_ACCESS_REQUEST_APPROVED: "Solicitud de acceso aprobada",
  PROCESS_ACCESS_REQUEST_REJECTED: "Solicitud de acceso rechazada",
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  client: "Cliente",
  investor: "Inversionista",
}

const statusLabels: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  draft: "Borrador",
  pending: "Pendiente",
  pending_admin_review: "Pendiente de administración",
  pending_investor_review: "Pendiente de inversionista",
  investor_approved: "Aprobado por inversionista",
  investor_rejected: "Rechazado por inversionista",
  owner_approved: "Aprobado",
  owner_rejected: "Rechazado",
  rejected: "Rechazado",
  deleted: "Eliminado",
  active_loan: "Activo",
  paid: "Pagado",
  defaulted: "En mora",
  confirmed: "Confirmado",
  reversed: "Revertido",
}

const fieldLabels: Record<string, string> = {
  id: "ID",
  publicCode: "Código",
  authUserId: "ID de autenticación",
  firstName: "Nombre",
  lastName: "Apellido",
  email: "Correo",
  phone: "Teléfono",
  dni: "DNI",
  address: "Dirección",
  bank: "Banco",
  bankAccounts: "Cuentas bancarias",
  maritalStatus: "Estado civil",
  role: "Rol",
  isOwner: "Dueño",
  active: "Activo",
  status: "Estado",
  clientId: "Cliente",
  investorId: "Inversionista",
  loanId: "Préstamo",
  voucherId: "Comprobante",
  paymentId: "Pago",
  principal: "Capital",
  interestRate: "Tasa de interés",
  installmentsCount: "Número de cuotas",
  totalDebt: "Deuda total",
  amount: "Monto",
  paidAmount: "Monto pagado",
  remainingDebt: "Deuda restante",
  operationId: "Operación",
  operationDate: "Fecha de operación",
  paymentDate: "Fecha de pago",
  method: "Método",
  reference: "Referencia",
  observation: "Observación",
  createdAt: "Creado",
  updatedAt: "Actualizado",
  deletedAt: "Eliminado",
  startDate: "Fecha de inicio",
}

function formatAuditDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function normalizeToken(value: string) {
  return value.trim().replace(/[-\s]+/g, "_").toUpperCase()
}

function formatModuleName(value: string) {
  const normalized = normalizeToken(value)
  return moduleLabels[normalized] ?? humanizeToken(value)
}

function formatActionName(value: string) {
  const normalized = normalizeToken(value)
  return actionLabels[normalized] ?? humanizeToken(value)
}

function humanizeToken(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
}

function formatFieldLabel(key: string) {
  return fieldLabels[key] ?? humanizeToken(key)
}

function getUserName(user?: AuditUser | null) {
  if (!user) return "Sistema"
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return fullName || user.email || user.publicCode || "Usuario"
}

function getUserInitials(user?: AuditUser | null) {
  const name = getUserName(user)
  const parts = name.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U"
}

function shortId(value?: string | null) {
  if (!value) return "-"
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return value

  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return value
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasMeaningfulData(value: unknown) {
  const parsed = parseMaybeJson(value)
  if (parsed === null || parsed === undefined || parsed === "") return false
  if (Array.isArray(parsed)) return parsed.length > 0
  if (isRecord(parsed)) return Object.keys(parsed).length > 0
  return true
}

function formatScalarValue(value: unknown, fieldKey?: string) {
  if (value === null || value === undefined || value === "") return "-"
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (typeof value === "number") return new Intl.NumberFormat("es-PE").format(value)
  if (value instanceof Date) return formatAuditDate(value.toISOString())

  const text = String(value)
  if (!text) return "-"

  if (fieldKey === "role") return roleLabels[text] ?? text
  if (fieldKey === "status") return statusLabels[text] ?? humanizeToken(text)
  if (fieldKey?.toLowerCase().includes("date") || fieldKey?.endsWith("At")) {
    const date = new Date(text)
    if (!Number.isNaN(date.getTime())) return formatAuditDate(text)
  }

  return text
}

function getDetailSummary(log: AuditLog) {
  const pieces = [formatModuleName(log.module)]
  if (log.entityId) pieces.push(shortId(log.entityId))
  if (hasMeaningfulData(log.newData)) pieces.push("datos nuevos")
  else if (hasMeaningfulData(log.oldData)) pieces.push("datos anteriores")
  return pieces.join(" · ")
}

function AuditUserCell({ log, onClick }: { log: AuditLog; onClick: () => void }) {
  const auditUser = log.user as AuditUser | undefined
  const { fetchWithAuth } = useAuth()
  
  const isStorage = Boolean(auditUser?.avatarUrl?.startsWith("storage://") || auditUser?.avatar?.startsWith("storage://"))
  
  const { data } = useQuery({
    queryKey: ["users", "avatar", auditUser?.id],
    queryFn: () => fetchUserById(fetchWithAuth, auditUser!.id),
    enabled: Boolean(isStorage && auditUser?.id),
    staleTime: 1000 * 60 * 60,
  })

  if (!auditUser) {
    return (
      <div className="max-w-56 text-sm">
        <span className="font-medium">Sistema</span>
        {log.userId ? (
          <span className="block truncate text-xs text-muted-foreground">
            {shortId(log.userId)}
          </span>
        ) : null}
      </div>
    )
  }

  const avatarUrl = isStorage ? resolveAvatarUrl(data?.avatarUrl ?? data?.avatar) : resolveAvatarUrl(auditUser.avatarUrl ?? auditUser.avatar)

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-auto sm:h-auto max-w-64 justify-start px-2 py-1 text-left transition-all hover:bg-muted active:scale-[0.98]"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <Avatar className="size-7">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback>{getUserInitials(auditUser)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate font-medium">{getUserName(auditUser)}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {auditUser.publicCode || auditUser.email || shortId(auditUser.id)}
        </span>
      </span>
    </Button>
  )
}

export default function AuditPage() {
  const { user, fetchWithAuth } = useAuth()
  const [filters, setFilters] = useState<AuditFilters>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<AuditUser | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [moduleQuery, setModuleQuery] = useState("")
  const [actionQuery, setActionQuery] = useState("")
  const [moduleOpen, setModuleOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [newLogIds, setNewLogIds] = useState<Set<string>>(() => new Set())
  const visibleLogIdsRef = useRef<Set<string>>(new Set())
  const newLogTimeoutRef = useRef<number | undefined>(undefined)
  const previousDataParamsRef = useRef<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      let finalModule = filters.module
      if (!finalModule && moduleQuery.trim()) {
        const match = Object.keys(moduleLabels).find(
          (key) =>
            key.toLowerCase() === moduleQuery.trim().toLowerCase() ||
            moduleLabels[key].toLowerCase() === moduleQuery.trim().toLowerCase()
        )
        finalModule = match || moduleQuery.trim().toUpperCase()
      }

      let finalAction = filters.action
      if (!finalAction && actionQuery.trim()) {
        const match = Object.keys(actionLabels).find(
          (key) =>
            key.toLowerCase() === actionQuery.trim().toLowerCase() ||
            actionLabels[key].toLowerCase() === actionQuery.trim().toLowerCase()
        )
        finalAction = match || actionQuery.trim().toUpperCase()
      }
      
      setAppliedFilters({
        module: finalModule,
        action: finalAction,
        userId: filters.userId,
      })
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [filters, moduleQuery, actionQuery])

  const auditQuery = useAuditLogsQuery({
    page,
    module: appliedFilters.module || undefined,
    action: appliedFilters.action || undefined,
    userId: appliedFilters.userId || undefined,
  })

  const logs = useMemo(() => auditQuery.data?.logs ?? [], [auditQuery.data?.logs])
  const pagination = auditQuery.data?.meta ?? { page: 1, limit: AUDIT_PAGE_SIZE, total: 0, totalPages: 1 }

  const filteredModuleKeys = useMemo(() => {
    const query = moduleQuery.trim().toLowerCase()
    const keys = Object.keys(moduleLabels)
    if (!query) return keys
    return keys.filter(
      (key) =>
        key.toLowerCase().includes(query) ||
        moduleLabels[key].toLowerCase().includes(query)
    )
  }, [moduleQuery])

  const filteredActionKeys = useMemo(() => {
    const query = actionQuery.trim().toLowerCase()
    const keys = Object.keys(actionLabels)
    if (!query) return keys
    return keys.filter(
      (key) =>
        key.toLowerCase().includes(query) ||
        actionLabels[key].toLowerCase().includes(query)
    )
  }, [actionQuery])

  const isAdmin = user?.role === "admin" || Boolean(user?.isOwner)
  useEffect(() => {
    if (!auditQuery.data?.logs) return
    const nextLogs = auditQuery.data.logs
    const previousIds = visibleLogIdsRef.current
    const nextIds = new Set(nextLogs.map((log) => log.id))
    
    const currentParams = JSON.stringify({ page, appliedFilters })
    const isSameQuery = previousDataParamsRef.current === currentParams
    previousDataParamsRef.current = currentParams

    const addedIds =
      (previousIds.size > 0 && isSameQuery)
        ? nextLogs.map((log) => log.id).filter((id) => !previousIds.has(id))
        : []

    visibleLogIdsRef.current = nextIds
    if (addedIds.length > 0) {
      if (newLogTimeoutRef.current !== undefined) {
        window.clearTimeout(newLogTimeoutRef.current)
      }
      setNewLogIds(new Set(addedIds))
      newLogTimeoutRef.current = window.setTimeout(() => {
        setNewLogIds(new Set())
        newLogTimeoutRef.current = undefined
      }, 2200)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditQuery.data?.logs])

  useEffect(() => {
    const refreshFromRealtime = (event: Event) => {
      const detail = (event as CustomEvent<RealtimeDomainDetail>).detail
      if (detail?.type === "audit.created") {
        void auditQuery.refetch()
      }
    }

    window.addEventListener(realtimeDomainEvent, refreshFromRealtime)
    return () => window.removeEventListener(realtimeDomainEvent, refreshFromRealtime)
  }, [auditQuery])

  useEffect(() => {
    return () => {
      if (newLogTimeoutRef.current !== undefined) {
        window.clearTimeout(newLogTimeoutRef.current)
      }
    }
  }, [])

  const isRecentAuditChange = useIsRecentStructuralChange("audit")
  const isStructuralFetching = auditQuery.isFetching && !auditQuery.isLoading && isRecentAuditChange

  const columns = useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        id: "createdAt",
        accessorFn: (log) => log.createdAt,
        header: () => <DataTableStaticHeader title="Fecha" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">
            {formatAuditDate(row.original.createdAt)}
          </span>
        ),
        meta: { cellClassName: "align-middle" },
      },
      {
        id: "module",
        accessorFn: (log) => formatModuleName(log.module),
        header: () => <DataTableStaticHeader title="Módulo" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="whitespace-nowrap">
            {formatModuleName(row.original.module)}
          </Badge>
        ),
        meta: { cellClassName: "align-middle" },
      },
      {
        id: "action",
        accessorFn: (log) => formatActionName(log.action),
        header: () => <DataTableStaticHeader title="Acción" />,
        cell: ({ row }) => (
          <span className="block max-w-72 text-sm font-medium">
            {formatActionName(row.original.action)}
          </span>
        ),
        meta: { cellClassName: "align-middle" },
      },
      {
        id: "user",
        accessorFn: (log) => getUserName(log.user),
        header: () => <DataTableStaticHeader title="Usuario" />,
        cell: ({ row }) => (
          <AuditUserCell 
            log={row.original} 
            onClick={() => {
              if (row.original.user) setSelectedUser(row.original.user)
            }} 
          />
        ),
        meta: { cellClassName: "align-middle" },
      },
      {
        id: "details",
        accessorFn: (log) => getDetailSummary(log),
        header: () => <DataTableStaticHeader title="Detalles" />,
        cell: ({ row }) => (
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {getDetailSummary(row.original)}
          </span>
        ),
        meta: { cellClassName: "align-middle" },
      },
    ],
    [],
  )

  const stats = useMemo(() => {
    const modules = new Set(logs.map((log) => formatModuleName(log.module))).size
    const users = new Set(logs.map((log) => log.userId).filter(Boolean)).size
    return { modules, users, total: pagination.total || logs.length }
  }, [logs, pagination.total])

  // applyFilters and clearFilters removed because filters are now applied automatically via useEffect

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-10">
        <Empty className="rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Acceso restringido</EmptyTitle>
            <EmptyDescription>
              Solo administración puede consultar la bitácora de auditoría.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
              Auditoría
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Trazabilidad de acciones críticas en usuarios, préstamos, pagos y comprobantes.
          </p>
        </div>

        <Button
          onClick={() => void auditQuery.refetch()}
          disabled={auditQuery.isLoading || auditQuery.isFetching}
        >
          <RefreshCwIcon data-icon="inline-start" />
          {auditQuery.isFetching && !auditQuery.isLoading ? "Actualizando..." : "Actualizar"}
        </Button>
      </header>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 p-0">
          <div className="relative">
            <MetricCard icon={ActivityIcon} label="Registros" value={stats.total} />
            <div className="absolute bottom-0 left-6 right-6 h-px bg-border sm:hidden" />
            <div className="absolute right-0 top-6 bottom-6 w-px bg-border hidden sm:block" />
          </div>
          <div className="relative">
            <MetricCard icon={DatabaseIcon} label="Módulos" value={stats.modules} />
            <div className="absolute bottom-0 left-6 right-6 h-px bg-border sm:hidden" />
            <div className="absolute right-0 top-6 bottom-6 w-px bg-border hidden sm:block" />
          </div>
          <div className="relative">
            <MetricCard icon={UserIcon} label="Usuarios" value={stats.users} />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl bg-card p-3 max-[480px]:p-3 sm:p-4 shadow-xs/5">
      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="audit-module">Módulo</FieldLabel>
          <Combobox open={moduleOpen} onOpenChange={setModuleOpen}>
            <ComboboxInput
              id="audit-module"
              placeholder="Ej. Préstamos"
              value={moduleQuery || (filters.module ? (moduleLabels[filters.module] ?? filters.module) : "")}
              onFocus={() => setModuleOpen(true)}
              onClick={() => setModuleOpen(true)}
              onChange={(event) => {
                const nextQuery = event.target.value
                setModuleQuery(nextQuery)
                if (filters.module && nextQuery !== (moduleLabels[filters.module] ?? filters.module)) {
                  setFilters((current) => ({ ...current, module: "" }))
                }
              }}
              showClear={Boolean(filters.module || moduleQuery)}
              clearProps={{
                onClick: () => {
                  setFilters((current) => ({ ...current, module: "" }))
                  setModuleQuery("")
                },
              }}
              startAddon={<DatabaseIcon />}
            />
            <ComboboxPopup className="min-w-(--anchor-width) w-auto max-w-[90vw] sm:max-w-md">
              <ComboboxList>
                {filteredModuleKeys.map((key) => (
                  <ComboboxItem
                    key={key}
                    value={key}
                    onClick={() => {
                      setFilters((current) => ({ ...current, module: key }))
                      setModuleQuery(moduleLabels[key] ?? key)
                      setModuleOpen(false)
                    }}
                  >
                    {moduleLabels[key]}
                  </ComboboxItem>
                ))}
                {filteredModuleKeys.length === 0 && (
                  <ComboboxEmpty>No hay coincidencias.</ComboboxEmpty>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-action">Acción</FieldLabel>
          <Combobox open={actionOpen} onOpenChange={setActionOpen}>
            <ComboboxInput
              id="audit-action"
              placeholder="Ej. Inicio de sesión"
              value={actionQuery || (filters.action ? (actionLabels[filters.action] ?? filters.action) : "")}
              onFocus={() => setActionOpen(true)}
              onClick={() => setActionOpen(true)}
              onChange={(event) => {
                const nextQuery = event.target.value
                setActionQuery(nextQuery)
                if (filters.action && nextQuery !== (actionLabels[filters.action] ?? filters.action)) {
                  setFilters((current) => ({ ...current, action: "" }))
                }
              }}
              showClear={Boolean(filters.action || actionQuery)}
              clearProps={{
                onClick: () => {
                  setFilters((current) => ({ ...current, action: "" }))
                  setActionQuery("")
                },
              }}
              startAddon={<ActivityIcon />}
            />
            <ComboboxPopup className="min-w-(--anchor-width) w-auto max-w-[90vw] sm:max-w-md">
              <ComboboxList>
                {filteredActionKeys.map((key) => (
                  <ComboboxItem
                    key={key}
                    value={key}
                    onClick={() => {
                      setFilters((current) => ({ ...current, action: key }))
                      setActionQuery(actionLabels[key] ?? key)
                      setActionOpen(false)
                    }}
                  >
                    {actionLabels[key]}
                  </ComboboxItem>
                ))}
                {filteredActionKeys.length === 0 && (
                  <ComboboxEmpty>No hay coincidencias.</ComboboxEmpty>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-user">Usuario</FieldLabel>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <FingerprintIcon />
            </InputGroupAddon>
            <InputGroupInput
              id="audit-user"
              value={filters.userId}
              placeholder="ID del usuario"
              onChange={(event) => setFilters((current) => ({ ...current, userId: event.target.value }))}
            />
          </InputGroup>
        </Field>
      </div>
      </div>

      {auditQuery.isLoading ? (
        <DataTableSkeleton
          rows={8}
          tableClassName="min-w-[1040px]"
          columns={[
            { className: "w-[170px]", headerWidth: "w-16", cellWidth: "w-36" },
            { className: "w-[160px]", headerWidth: "w-16", cellWidth: "w-28" },
            { className: "w-[300px]", headerWidth: "w-16", cellWidth: "w-56" },
            { className: "w-[280px]", headerWidth: "w-16", cellWidth: "w-48" },
            { className: "w-[320px]", headerWidth: "w-16", cellWidth: "w-64" },
          ]}
        />
      ) : auditQuery.error ? (
        <Empty className="min-h-80 rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircleIcon />
            </EmptyMedia>
            <EmptyTitle>No se pudo cargar auditoría</EmptyTitle>
            <EmptyDescription>{getErrorMessage(auditQuery.error, "No se pudieron cargar los logs de auditoría.")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="secondary" onClick={() => void auditQuery.refetch()}>
              <RefreshCwIcon data-icon="inline-start" />
              Reintentar
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <DataTableCard
          columns={columns}
          data={logs}
          emptyMessage="No hay logs para los filtros aplicados."
          getRowId={(log) => log.id}
          getRowClassName={(log) => cn(newLogIds.has(log.id) && "realtime-row-enter")}
          onRowClick={(log) => setSelectedLog(log)}
          bodyClassName={cn((auditQuery.isPlaceholderData || isStructuralFetching) && "opacity-50 pointer-events-none transition-opacity duration-200")}
          pagination={{
            page: pagination.page ?? 1,
            pageSize: pagination.limit ?? AUDIT_PAGE_SIZE,
            total: pagination.total ?? 0,
            totalPages: pagination.totalPages ?? 1,
            itemLabel: "registros",
            onPageChange: setPage,
          }}
          tableClassName="min-w-[1040px]"
        />
      )}

      <UserDetailDrawer
        user={selectedUser}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null)
        }}
        fetchUserById={(id) => fetchUserById(fetchWithAuth, id)}
      />
      <AuditDetailsSheet
        log={selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null)
        }}
      />
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-4 p-4 sm:p-6">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// Shared UserDetailSheet is now used instead of AuditUserSheet

function AuditDetailsSheet({
  log,
  onOpenChange,
}: {
  log: AuditLog | null
  onOpenChange: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const oldData = log ? parseMaybeJson(log.oldData) : null
  const newData = log ? parseMaybeJson(log.newData) : null

  return (
    <Drawer open={Boolean(log)} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 760, maxWidth: "min(1040px, calc(100vw - 2rem))", minWidth: 520 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{log ? formatActionName(log.action) : "Detalles"}</DrawerTitle>
          <DrawerDescription>
            {log ? `${formatModuleName(log.module)} · ${formatAuditDate(log.createdAt)}` : ""}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel className="space-y-6 pb-8">
          {log ? (
            <div className="fade-in animate-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">
              <div className="rounded-xl bg-muted/30 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Resumen</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={<DatabaseIcon className="size-4" />} label="Módulo" value={formatModuleName(log.module)} />
                  <InfoRow icon={<ActivityIcon className="size-4" />} label="Acción" value={formatActionName(log.action)} />
                  <InfoRow icon={<CalendarClockIcon className="size-4" />} label="Fecha" value={formatAuditDate(log.createdAt)} />
                  <InfoRow icon={<UserIcon className="size-4" />} label="Usuario" value={getUserName(log.user)} />
                </div>
                <div className="mt-4 grid gap-4">
                  <InfoRow icon={<FingerprintIcon className="size-4" />} label="Entidad" value={shortId(log.entityId)} />
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Datos nuevos</h3>
                {hasMeaningfulData(newData) ? (
                  <AuditValue value={newData} />
                ) : (
                  <p className="text-sm text-muted-foreground">No se registraron datos nuevos.</p>
                )}
              </div>

              {hasMeaningfulData(oldData) ? (
                <div className="rounded-xl bg-muted/30 p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Datos anteriores</h3>
                  <AuditValue value={oldData} />
                </div>
              ) : null}

              <div className="rounded-xl bg-muted/30 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Contexto técnico</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={<FingerprintIcon className="size-4" />} label="Dirección IP" value={log.ipAddress || "-"} />
                  <InfoRow icon={<InfoIcon className="size-4" />} label="Dispositivo" value={log.userAgent || "-"} truncate />
                </div>
              </div>
            </div>
          ) : null}
        </DrawerPanel>
        
        {log && (
          <DrawerFooter variant="bare">
            <div className="flex w-full items-center justify-end">
              <DrawerClose render={<Button variant="secondary" />}>
                Cerrar
              </DrawerClose>
            </div>
          </DrawerFooter>
        )}
      </DrawerPopup>
    </Drawer>
  )
}

function AuditValue({
  value,
  fieldKey,
  depth = 0,
}: {
  value: unknown
  fieldKey?: string
  depth?: number
}) {
  const parsed = parseMaybeJson(value)

  if (parsed === null || parsed === undefined || typeof parsed !== "object") {
    return <span className="wrap-break-word text-sm font-medium text-foreground">{formatScalarValue(parsed, fieldKey)}</span>
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return <span className="text-sm font-medium text-muted-foreground">Sin elementos</span>
    }

    const isScalarArray = parsed.every((item) => typeof item !== "object" || item === null)
    
    if (isScalarArray) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {parsed.map((item, index) => (
            <span key={index} className="rounded-lg bg-muted/50 px-2 py-1 text-xs font-medium">
              {formatScalarValue(item)}
            </span>
          ))}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        {parsed.slice(0, 8).map((item, index) => (
          <div key={index} className="rounded-xl bg-background/50 p-3 shadow-xs/5">
            <AuditValue value={item} depth={depth + 1} />
          </div>
        ))}
        {parsed.length > 8 ? (
          <p className="text-xs text-muted-foreground">+{parsed.length - 8} elementos adicionales</p>
        ) : null}
      </div>
    )
  }

  const entries = Object.entries(parsed).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null)
  if (entries.length === 0) {
    return <span className="text-sm font-medium text-muted-foreground">Sin datos</span>
  }

  if (depth >= 3) {
    return (
      <span className="text-sm font-medium text-muted-foreground">
        {entries.length} campos relacionados
      </span>
    )
  }

  return (
    <div className={depth === 0 ? "grid gap-2 sm:grid-cols-2" : "flex flex-col gap-2"}>
      {entries.map(([key, entryValue]) => (
        <div key={key} className="flex flex-col gap-1 rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {formatFieldLabel(key)}
          </p>
          <div className="min-w-0">
            <AuditValue value={entryValue} fieldKey={key} depth={depth + 1} />
          </div>
        </div>
      ))}
    </div>
  )
}
