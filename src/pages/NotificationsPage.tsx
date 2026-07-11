/* eslint-disable react-hooks/set-state-in-effect */
import { useQueryClient } from "@tanstack/react-query"
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
import { useCallback, useEffect, useState, type ElementType } from "react"

import { DataTablePaginationBar } from "@/components/data-table-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import { buildApiUrl, getErrorMessage, readApiPayload } from "@/lib/api-client"
import { dispatchNotificationsUpdated } from "@/lib/realtime"
import { cn } from "@/lib/utils"
import {
  NOTIFICATIONS_PAGE_SIZE,
  useNotificationsQuery,
  useUnreadNotificationsCountQuery,
  type NotificationFilter,
  type NotificationItem,
  type NotificationsPaginationMeta as PaginationMeta,
} from "@/pages/notifications-queries"

const typeDetails: Record<
  string,
  {
    title?: string
    icon: ElementType
    className: string
  }
> = {
  SYSTEM: {
    title: "Aviso del sistema",
    icon: BellIcon,
    className: "bg-muted text-muted-foreground",
  },
  LOAN_SUBMITTED: {
    title: "Solicitud de préstamo enviada",
    icon: LandmarkIcon,
    className: "bg-info/10 text-info-foreground",
  },
  LOAN_INVESTOR_APPROVED: {
    title: "Préstamo en revisión final",
    icon: LandmarkIcon,
    className: "bg-info/10 text-info-foreground",
  },
  LOAN_ACTIVE: {
    title: "Préstamo aprobado",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  LOAN_ACTIVE_INVESTOR: {
    title: "Préstamo activado",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  LOAN_REJECTED: {
    title: "Préstamo rechazado",
    icon: AlertCircleIcon,
    className: "bg-destructive/10 text-destructive",
  },
  LOAN_APPROVED: {
    title: "Préstamo aprobado",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  VOUCHER_PENDING_REVIEW: {
    title: "Voucher pendiente de revisión",
    icon: CreditCardIcon,
    className: "bg-warning/10 text-warning-foreground",
  },
  VOUCHER_APPROVED: {
    title: "Pago confirmado",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  VOUCHER_REJECTED: {
    title: "Voucher rechazado",
    icon: AlertCircleIcon,
    className: "bg-destructive/10 text-destructive",
  },
  VOUCHER_ADMIN_APPROVED: {
    title: "Pago confirmado por administración",
    icon: CheckCircleIcon,
    className: "bg-success/10 text-success-foreground",
  },
  VOUCHER_ADMIN_REJECTED: {
    title: "Pago rechazado por administración",
    icon: AlertCircleIcon,
    className: "bg-destructive/10 text-destructive",
  },
  INSTALLMENT_REMINDER: {
    title: "Recordatorio de cuota",
    icon: ClockIcon,
    className: "bg-warning/10 text-warning-foreground",
  },
  INSTALLMENT_OVERDUE: {
    title: "Cuota vencida",
    icon: AlertCircleIcon,
    className: "bg-destructive/10 text-destructive",
  },
  ACCESS_APPROVED: {
    title: "Acceso aprobado",
    icon: ShieldCheckIcon,
    className: "bg-success/10 text-success-foreground",
  },
  PAYMENT_RECEIVED: {
    title: "Pago recibido",
    icon: CreditCardIcon,
    className: "bg-info/10 text-info-foreground",
  },
  PAYMENT_DUE: {
    title: "Pago por vencer",
    icon: ClockIcon,
    className: "bg-warning/10 text-warning-foreground",
  },
  ACCESS_REQUEST: {
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

export default function NotificationsPage() {
  const { fetchWithAuth } = useAuth()
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: NOTIFICATIONS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    unreadCount: 0,
  })
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [page, setPage] = useState(1)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingIds, setMarkingIds] = useState<Set<string>>(() => new Set())
  const notificationsQuery = useNotificationsQuery({ filter, page })
  const { refetch: refetchNotifications } = notificationsQuery
  const { data: unreadCountData } = useUnreadNotificationsCountQuery()

  useEffect(() => {
    if (!notificationsQuery.data) return
    setNotifications(notificationsQuery.data.notifications)
    setPagination(notificationsQuery.data.pagination)
  }, [notificationsQuery.data])

  const updateUnreadCountQueries = useCallback(
    (updater: (current: number) => number) => {
      queryClient.setQueriesData<number>(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "abc" &&
            query.queryKey[1] === "notifications" &&
            query.queryKey[2] === "unread-count",
        },
        (current) => updater(current ?? 0),
      )
    },
    [queryClient],
  )

  const loading = notificationsQuery.isLoading
  const refreshing = notificationsQuery.isFetching && !notificationsQuery.isLoading
  const error = notificationsQuery.error
    ? getErrorMessage(notificationsQuery.error, "No se pudieron cargar las notificaciones.")
    : null
  const unreadCount = unreadCountData ?? pagination.unreadCount ?? 0
  const totalPages = Math.max(pagination.totalPages ?? 1, 1)

  const handleFilterChange = (nextFilter: string) => {
    if (!nextFilter || !["all", "unread", "read"].includes(nextFilter)) return

    setFilter(nextFilter as NotificationFilter)
    setPage(1)
  }

  const handleMarkAllAsRead = async () => {
    if (markingAll) return

    setMarkingAll(true)
    
    const previousNotifications = notifications
    const previousPagination = pagination
    const previousUnreadCount = unreadCount

    setNotifications((current) =>
      filter === "unread"
        ? []
        : current.map((notification) => ({ ...notification, isRead: true })),
    )
    setPagination((current) => ({
      ...current,
      page: filter === "unread" ? 1 : current.page,
      total: filter === "unread" ? 0 : current.total,
      totalPages: filter === "unread" ? 1 : current.totalPages,
      unreadCount: 0,
    }))
    updateUnreadCountQueries(() => 0)

    try {
      const response = await fetchWithAuth(
        buildApiUrl("/api/v1/notifications/read-all"),
        { method: "PATCH" },
      )
      await readApiPayload<null>(response)

      void queryClient.invalidateQueries({ queryKey: ["abc", "notifications", "list"] })
      dispatchNotificationsUpdated()
      toastManager.add({
        type: "success",
        title: "Notificaciones al día",
        description: "Todas tus notificaciones fueron marcadas como leídas.",
      })
      if (filter === "unread") {
        setPage(1)
      }
    } catch (markError) {
      setNotifications(previousNotifications)
      setPagination(previousPagination)
      updateUnreadCountQueries(() => previousUnreadCount)

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
    if (notification.isRead || markingIds.has(notification.id)) return

    setMarkingIds((current) => new Set(current).add(notification.id))
    setNotifications((current) =>
      filter === "unread"
        ? current.filter((item) => item.id !== notification.id)
        : current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
    )
    setPagination((current) => ({
      ...current,
      total: filter === "unread" ? Math.max((current.total ?? 0) - 1, 0) : current.total,
      totalPages:
        filter === "unread"
          ? Math.max(Math.ceil(Math.max((current.total ?? 0) - 1, 0) / (current.limit ?? NOTIFICATIONS_PAGE_SIZE)), 1)
          : current.totalPages,
      unreadCount: Math.max((current.unreadCount ?? 0) - 1, 0),
    }))
    updateUnreadCountQueries((current) => Math.max(current - 1, 0))

    try {
      const response = await fetchWithAuth(
        buildApiUrl(`/api/v1/notifications/${notification.id}/read`),
        { method: "PATCH" },
      )
      await readApiPayload<{ id: string; isRead: boolean }>(response)

      dispatchNotificationsUpdated()
      void queryClient.invalidateQueries({ queryKey: ["abc", "notifications", "list"] })
    } catch (markError) {
      setNotifications((current) =>
        filter === "unread"
          ? [notification, ...current.filter((item) => item.id !== notification.id)]
          : current.map((item) =>
              item.id === notification.id ? { ...item, isRead: false } : item,
            ),
      )
      setPagination((current) => ({
        ...current,
        total: filter === "unread" ? (current.total ?? 0) + 1 : current.total,
        totalPages:
          filter === "unread"
            ? Math.max(Math.ceil(((current.total ?? 0) + 1) / (current.limit ?? NOTIFICATIONS_PAGE_SIZE)), 1)
            : current.totalPages,
        unreadCount: (current.unreadCount ?? 0) + 1,
      }))
      updateUnreadCountQueries((current) => current + 1)
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
            variant="secondary"
            size="icon"
            onClick={() => void refetchNotifications()}
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
          onRetry={() => void refetchNotifications()}
        />
      ) : notifications.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              isMarking={markingIds.has(notification.id)}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </div>
      )}

      {!loading && !error && (
        <DataTablePaginationBar
          pagination={{
            page,
            totalPages,
            total: pagination.total,
            itemLabel: "notificaciones",
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  )
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="border-border/70">
          <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 md:p-5">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex flex-col gap-2">
              <Skeleton className="h-4 w-2/5 min-w-32" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <Skeleton className="mt-1 h-3 w-28" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </CardContent>
        </Card>
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
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCwIcon data-icon="inline-start" />
          Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function NotificationCard({
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
    <Card
      className={cn(
        "overflow-hidden border-border/70 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md motion-reduce:transform-none",
        !notification.isRead && "border-primary/20 bg-accent/35 shadow-xs",
      )}
    >
      <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 md:p-5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
            details.className,
          )}
        >
          <Icon />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-[0.95rem] font-semibold leading-5">
                {title}
              </h2>
              {!notification.isRead && (
                <span
                  className="size-2 shrink-0 rounded-full bg-primary"
                  aria-label="No leída"
                />
              )}
            </div>
            <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
              {notification.body}
            </p>
            <time
              dateTime={notification.createdAt}
              className="mt-1 text-xs font-medium text-muted-foreground"
            >
              {formatNotificationDate(notification.createdAt)}
            </time>
          </div>
        </div>
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMarkAsRead(notification)}
            disabled={isMarking}
            aria-label="Marcar como leída"
            title="Marcar como leída"
            className="size-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {isMarking ? <Spinner /> : <CheckCheckIcon />}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
