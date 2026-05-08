import { useCallback, useEffect, useState, type ElementType } from "react"
import {
  AlertCircleIcon,
  BellIcon,
  CheckCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  LandmarkIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
const PAGE_SIZE = 8

type NotificationFilter = "all" | "unread" | "read"

type NotificationItem = {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  data: unknown
  createdAt: string
}

type PaginationMeta = {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  unreadCount?: number
}

type ApiResponse<T> = {
  success: boolean
  message?: string
  data: T
  meta?: {
    timestamp?: string
  } & PaginationMeta
}

const typeDetails: Record<
  string,
  {
    label: string
    title?: string
    icon: ElementType
    className: string
  }
> = {
  SYSTEM: {
    label: "Sistema",
    title: "Aviso del sistema",
    icon: BellIcon,
    className: "bg-muted text-muted-foreground",
  },
  LOAN_SUBMITTED: {
    label: "Préstamo",
    title: "Solicitud de préstamo enviada",
    icon: LandmarkIcon,
    className: "bg-info/10 text-info-foreground",
  },
  LOAN_INVESTOR_APPROVED: {
    label: "Préstamo",
    title: "Préstamo en revisión final",
    icon: LandmarkIcon,
    className: "bg-info/10 text-info-foreground",
  },
  LOAN_ACTIVE: {
    label: "Préstamo",
    title: "Préstamo aprobado",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  LOAN_ACTIVE_INVESTOR: {
    label: "Préstamo",
    title: "Préstamo activado",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  LOAN_REJECTED: {
    label: "Préstamo",
    title: "Préstamo rechazado",
    icon: AlertCircleIcon,
    className: "bg-destructive/10 text-destructive",
  },
  LOAN_APPROVED: {
    label: "Préstamo",
    title: "Préstamo aprobado",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  VOUCHER_PENDING_REVIEW: {
    label: "Voucher",
    title: "Voucher pendiente de revisión",
    icon: CreditCardIcon,
    className: "bg-warning/10 text-warning-foreground",
  },
  VOUCHER_APPROVED: {
    label: "Voucher",
    title: "Pago confirmado",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  VOUCHER_REJECTED: {
    label: "Voucher",
    title: "Voucher rechazado",
    icon: AlertCircleIcon,
    className: "bg-destructive/10 text-destructive",
  },
  VOUCHER_ADMIN_APPROVED: {
    label: "Voucher",
    title: "Pago confirmado por administración",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  VOUCHER_ADMIN_REJECTED: {
    label: "Voucher",
    title: "Pago rechazado por administración",
    icon: AlertCircleIcon,
    className: "bg-destructive/10 text-destructive",
  },
  INSTALLMENT_REMINDER: {
    label: "Cuota",
    title: "Recordatorio de cuota",
    icon: ClockIcon,
    className: "bg-warning/10 text-warning-foreground",
  },
  INSTALLMENT_OVERDUE: {
    label: "Cuota",
    title: "Cuota vencida",
    icon: AlertCircleIcon,
    className: "bg-destructive/10 text-destructive",
  },
  ACCESS_APPROVED: {
    label: "Acceso",
    title: "Acceso aprobado",
    icon: ShieldCheckIcon,
    className: "bg-success/10 text-success-foreground",
  },
  PAYMENT_RECEIVED: {
    label: "Pago",
    title: "Pago recibido",
    icon: CreditCardIcon,
    className: "bg-info/10 text-info-foreground",
  },
  PAYMENT_DUE: {
    label: "Cuota",
    title: "Pago por vencer",
    icon: ClockIcon,
    className: "bg-warning/10 text-warning-foreground",
  },
  ACCESS_REQUEST: {
    label: "Acceso",
    title: "Solicitud de acceso",
    icon: ShieldCheckIcon,
    className: "bg-secondary/40 text-secondary-foreground",
  },
}

const titleDictionary: Record<string, string> = {
  unread: "Aviso sin leer",
  test: "Notificación de prueba",
  "loan submitted": "Solicitud de préstamo enviada",
  "loan rejected": "Préstamo rechazado",
  "loan approved": "Préstamo aprobado",
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function formatNotificationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Fecha no disponible"

  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function normalizeNotificationType(type: string) {
  return type.trim().replace(/[\s-]+/g, "_").toUpperCase()
}

function getNotificationTypeDetails(type: string) {
  const normalizedType = normalizeNotificationType(type)

  return (
    typeDetails[normalizedType] ?? {
      label: "General",
      icon: BellIcon,
      className: "bg-muted text-muted-foreground",
    }
  )
}

function getNotificationTitle(notification: NotificationItem) {
  const normalizedTitle = notification.title.trim().toLowerCase()
  const details = getNotificationTypeDetails(notification.type)

  return titleDictionary[normalizedTitle] ?? details.title ?? notification.title
}

function dispatchNotificationsUpdated() {
  window.dispatchEvent(new Event("abc:notifications-updated"))
}

export default function NotificationsPage() {
  const { session, fetchWithAuth } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    unreadCount: 0,
  })
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingIds, setMarkingIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)

  const unreadCount = pagination.unreadCount ?? 0
  const totalPages = Math.max(pagination.totalPages ?? 1, 1)

  const fetchNotifications = useCallback(
    async ({ keepContent = false }: { keepContent?: boolean } = {}) => {
      if (!session?.access_token) return

      if (!API_BASE_URL) {
        setError("No se encontró VITE_API_URL para consultar el servidor.")
        setLoading(false)
        return
      }

      if (keepContent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      })

      if (filter !== "all") {
        params.set("isRead", String(filter === "read"))
      }

      try {
        const response = await fetchWithAuth(
          `${API_BASE_URL}/api/v1/notifications?${params.toString()}`,
        )
        const payload =
          (await response.json().catch(() => null)) as ApiResponse<
            NotificationItem[]
          > | null

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || "No se pudieron cargar las notificaciones.")
        }

        setNotifications(payload.data ?? [])
        setPagination({
          page: payload.meta?.page ?? page,
          limit: payload.meta?.limit ?? PAGE_SIZE,
          total: payload.meta?.total ?? payload.data?.length ?? 0,
          totalPages: payload.meta?.totalPages ?? 1,
          unreadCount:
            payload.meta?.unreadCount ??
            payload.data?.filter((notification) => !notification.isRead).length ??
            0,
        })
      } catch (fetchError) {
        setError(
          getErrorMessage(fetchError, "No se pudieron cargar las notificaciones."),
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [fetchWithAuth, filter, page, session?.access_token],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchNotifications()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchNotifications])

  const handleFilterChange = (nextFilter: string) => {
    if (!nextFilter || !["all", "unread", "read"].includes(nextFilter)) return

    setFilter(nextFilter as NotificationFilter)
    setPage(1)
  }

  const handleMarkAllAsRead = async () => {
    if (markingAll || !API_BASE_URL) return

    setMarkingAll(true)
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/v1/notifications/read-all`,
        { method: "PATCH" },
      )
      const payload = (await response.json().catch(() => null)) as ApiResponse<null> | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "No se pudieron marcar las notificaciones.")
      }

      setNotifications((current) =>
        current.map((notification) => ({ ...notification, isRead: true })),
      )
      setPagination((current) => ({ ...current, unreadCount: 0 }))
      dispatchNotificationsUpdated()
      toastManager.add({
        type: "success",
        title: "Notificaciones al día",
        description: "Todas tus notificaciones fueron marcadas como leídas.",
      })
      if (filter === "unread") {
        setPage(1)
      }
      void fetchNotifications({ keepContent: true })
    } catch (markError) {
      toastManager.add({
        type: "error",
        title: "No se pudo completar la acción",
        description: getErrorMessage(
          markError,
          "Inténtalo nuevamente en unos segundos.",
        ),
      })
    } finally {
      setMarkingAll(false)
    }
  }

  const handleMarkAsRead = async (notification: NotificationItem) => {
    if (notification.isRead || markingIds.has(notification.id) || !API_BASE_URL) return

    setMarkingIds((current) => new Set(current).add(notification.id))
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item,
      ),
    )
    setPagination((current) => ({
      ...current,
      unreadCount: Math.max((current.unreadCount ?? 0) - 1, 0),
    }))

    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/v1/notifications/${notification.id}/read`,
        { method: "PATCH" },
      )
      const payload =
        (await response.json().catch(() => null)) as ApiResponse<{
          id: string
          isRead: boolean
        }> | null

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "No se pudo marcar la notificación.")
      }

      dispatchNotificationsUpdated()
      void fetchNotifications({ keepContent: true })
    } catch (markError) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: false } : item,
        ),
      )
      setPagination((current) => ({
        ...current,
        unreadCount: (current.unreadCount ?? 0) + 1,
      }))
      toastManager.add({
        type: "error",
        title: "No se actualizó la notificación",
        description: getErrorMessage(
          markError,
          "La lectura no pudo sincronizarse con el servidor.",
        ),
      })
    } finally {
      setMarkingIds((current) => {
        const next = new Set(current)
        next.delete(notification.id)
        return next
      })
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 py-4 md:px-8 md:py-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">
              Notificaciones
            </h1>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} sin leer</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Avisos importantes de tu cuenta.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void fetchNotifications({ keepContent: true })}
            disabled={loading || refreshing}
            aria-label="Actualizar notificaciones"
            title="Actualizar"
          >
            {refreshing ? <Spinner /> : <RefreshCwIcon />}
          </Button>
          <Button
            size="icon"
            onClick={handleMarkAllAsRead}
            disabled={markingAll || loading || unreadCount === 0}
            aria-label="Marcar todas como leídas"
            title="Marcar todo como leído"
          >
            {markingAll ? <Spinner /> : <CheckCheckIcon />}
          </Button>
        </div>
      </div>

      <Tabs
        value={filter}
        onValueChange={handleFilterChange}
        className="w-full"
      >
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            Todas
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex-1">
            Sin leer
          </TabsTrigger>
          <TabsTrigger value="read" className="flex-1">
            Leídas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingList />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => void fetchNotifications({ keepContent: true })}
        />
      ) : notifications.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="divide-y rounded-lg border">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              isMarking={markingIds.has(notification.id)}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                Anterior
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Badge variant="outline">
                {page} de {totalPages}
              </Badge>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(current + 1, totalPages))
                }
              >
                Siguiente
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

function LoadingList() {
  return (
    <div className="divide-y rounded-lg border bg-card">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-3 px-4 py-3.5 md:px-5">
          <Skeleton className="mt-0.5 size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5 min-w-32" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <Skeleton className="size-8 shrink-0 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ filter }: { filter: NotificationFilter }) {
  const copy =
    filter === "unread"
      ? "No tienes pendientes por leer."
      : filter === "read"
        ? "Todavía no hay notificaciones leídas en esta vista."
        : "Cuando ocurra algo importante, aparecerá aquí."

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BellIcon />
        </EmptyMedia>
        <EmptyTitle>Bandeja vacía</EmptyTitle>
        <EmptyDescription>{copy}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircleIcon />
        </EmptyMedia>
        <EmptyTitle>No se pudo cargar</EmptyTitle>
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

function NotificationRow({
  notification,
  isMarking,
  onMarkAsRead,
}: {
  notification: NotificationItem
  isMarking: boolean
  onMarkAsRead: (notification: NotificationItem) => void
}) {
  const details = getNotificationTypeDetails(notification.type)
  const title = getNotificationTitle(notification)
  const Icon = details.icon

  return (
    <article
      className={cn(
        "group flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 md:px-5",
        !notification.isRead && "bg-accent/35",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5",
          details.className,
        )}
      >
        <Icon />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate font-medium leading-tight">{title}</h2>
              {!notification.isRead && (
                <span
                  className="size-2 shrink-0 rounded-full bg-primary"
                  aria-label="No leída"
                />
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
              {notification.body}
            </p>
          </div>
          {!notification.isRead && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onMarkAsRead(notification)}
              disabled={isMarking}
              aria-label="Marcar como leída"
              title="Marcar como leída"
              className="shrink-0"
            >
              {isMarking ? <Spinner /> : <CheckCircleIcon />}
            </Button>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="w-fit shrink-0 px-1.5">
            {details.label}
          </Badge>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <ClockIcon />
            <span className="truncate">
              {formatNotificationDate(notification.createdAt)}
            </span>
          </span>
        </div>
      </div>
    </article>
  )
}
