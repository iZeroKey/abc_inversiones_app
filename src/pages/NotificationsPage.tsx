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
import { SectionBlock } from "@/features/loans/components/SectionBlock"
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
    borderClass: string
    dotClass: string
  }
> = {
  SYSTEM: {
    title: "Aviso del sistema",
    icon: BellIcon,
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    borderClass: "border-l-slate-400 dark:border-l-slate-600",
    dotClass: "bg-slate-500",
  },
  LOAN_SUBMITTED: {
    title: "Solicitud de préstamo enviada",
    icon: LandmarkIcon,
    className: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    borderClass: "border-l-blue-500",
    dotClass: "bg-blue-500",
  },
  LOAN_INVESTOR_APPROVED: {
    title: "Préstamo en revisión final",
    icon: LandmarkIcon,
    className: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
    borderClass: "border-l-indigo-500",
    dotClass: "bg-indigo-500",
  },
  LOAN_ACTIVE: {
    title: "Préstamo aprobado",
    icon: CheckCircleIcon,
    className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    borderClass: "border-l-emerald-500",
    dotClass: "bg-emerald-500",
  },
  LOAN_ACTIVE_INVESTOR: {
    title: "Préstamo activado",
    icon: CheckCircleIcon,
    className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    borderClass: "border-l-emerald-500",
    dotClass: "bg-emerald-500",
  },
  LOAN_REJECTED: {
    title: "Préstamo rechazado",
    icon: AlertCircleIcon,
    className: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    borderClass: "border-l-red-500",
    dotClass: "bg-red-500",
  },
  LOAN_APPROVED: {
    title: "Préstamo aprobado",
    icon: CheckCircleIcon,
    className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    borderClass: "border-l-emerald-500",
    dotClass: "bg-emerald-500",
  },
  VOUCHER_PENDING_REVIEW: {
    title: "Voucher pendiente de revisión",
    icon: CreditCardIcon,
    className: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    borderClass: "border-l-amber-500",
    dotClass: "bg-amber-500",
  },
  VOUCHER_APPROVED: {
    title: "Pago confirmado",
    icon: CheckCircleIcon,
    className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    borderClass: "border-l-emerald-500",
    dotClass: "bg-emerald-500",
  },
  VOUCHER_REJECTED: {
    title: "Voucher rechazado",
    icon: AlertCircleIcon,
    className: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    borderClass: "border-l-red-500",
    dotClass: "bg-red-500",
  },
  VOUCHER_ADMIN_APPROVED: {
    title: "Pago confirmado por administración",
    icon: CheckCircleIcon,
    className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    borderClass: "border-l-emerald-500",
    dotClass: "bg-emerald-500",
  },
  VOUCHER_ADMIN_REJECTED: {
    title: "Pago rechazado por administración",
    icon: AlertCircleIcon,
    className: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    borderClass: "border-l-red-500",
    dotClass: "bg-red-500",
  },
  INSTALLMENT_REMINDER: {
    title: "Recordatorio de cuota",
    icon: ClockIcon,
    className: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    borderClass: "border-l-amber-500",
    dotClass: "bg-amber-500",
  },
  INSTALLMENT_OVERDUE: {
    title: "Cuota vencida",
    icon: AlertCircleIcon,
    className: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
    borderClass: "border-l-rose-500",
    dotClass: "bg-rose-500",
  },
  ACCESS_APPROVED: {
    title: "Acceso aprobado",
    icon: ShieldCheckIcon,
    className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    borderClass: "border-l-emerald-500",
    dotClass: "bg-emerald-500",
  },
  PAYMENT_RECEIVED: {
    title: "Pago recibido",
    icon: CreditCardIcon,
    className: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    borderClass: "border-l-blue-500",
    dotClass: "bg-blue-500",
  },
  PAYMENT_DUE: {
    title: "Pago por vencer",
    icon: ClockIcon,
    className: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    borderClass: "border-l-amber-500",
    dotClass: "bg-amber-500",
  },
  ACCESS_REQUEST: {
    title: "Solicitud de acceso",
    icon: ShieldCheckIcon,
    className: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
    borderClass: "border-l-purple-500",
    dotClass: "bg-purple-500",
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
      className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      borderClass: "border-l-slate-400 dark:border-l-slate-600",
      dotClass: "bg-slate-500",
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
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
              Notificaciones
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Avisos importantes de tu cuenta.
          </p>
        </div>

        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
          <Button
            onClick={handleMarkAllAsRead}
            disabled={markingAll || loading || unreadCount === 0}
            className="w-full sm:w-auto"
          >
            {markingAll ? <Spinner data-icon="inline-start" /> : <CheckCheckIcon data-icon="inline-start" />}
            Marcar todas leídas
          </Button>
        </div>
      </header>

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
        <div className={cn(
          "flex flex-col gap-3 transition-opacity duration-200", 
          notificationsQuery.isPlaceholderData && "opacity-50 pointer-events-none"
        )}>
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

      {!loading && !error && notifications.length > 0 && (
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
        <Card key={index} className="border-border/70 border-y border-r border-l-4 border-l-slate-400">
          <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 md:p-5">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className="h-5 w-2/5 min-w-32" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-5 w-3/5" />
                </div>
                <Skeleton className="mt-1 h-4 w-28" />
              </div>
            </div>
            <Skeleton className="size-9 shrink-0 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({ filter }: { filter: NotificationFilter }) {
  const isUnread = filter === "unread"
  const isRead = filter === "read"
  
  const title = isUnread ? "¡Estás al día!" : "Bandeja vacía"
  const copy = isUnread
    ? "No tienes notificaciones pendientes por leer."
    : isRead
      ? "Aún no tienes notificaciones leídas en tu historial."
      : " Cuando ocurra algo importante en tu cuenta, aparecerá aquí."
      
  const Icon = isUnread ? CheckCheckIcon : BellIcon

  return (
    <SectionBlock className="flex flex-col items-center justify-center min-h-75 text-center gap-2 py-10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      <div className={cn(
        "flex items-center justify-center size-16 rounded-full mb-3",
        isUnread 
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" 
          : "bg-background text-muted-foreground shadow-sm"
      )}>
        <Icon className="size-8" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="max-w-70 mx-auto text-sm text-muted-foreground text-balance">
          {copy}
        </p>
      </div>
    </SectionBlock>
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
        "relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-0.5 motion-reduce:transform-none border-y border-r border-l-4",
        !notification.isRead
          ? cn("bg-card shadow-md hover:shadow-lg border-y-border/30 border-r-border/30", details.borderClass)
          : "border-border/40 bg-card shadow-none opacity-65 hover:opacity-100 hover:shadow-sm",
      )}
    >
      <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 md:p-5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full [&_svg]:size-5 shadow-sm transition-colors",
            !notification.isRead ? details.className : "bg-muted text-muted-foreground/70",
          )}
        >
          <Icon />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2
                className={cn(
                  "truncate text-[0.95rem] leading-5 transition-colors",
                  !notification.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                )}
              >
                {title}
              </h2>
              {!notification.isRead && (
                <span className="relative flex h-2.5 w-2.5 shrink-0" aria-label="No leída">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", details.dotClass)}></span>
                  <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", details.dotClass)}></span>
                </span>
              )}
            </div>
            <p
              className={cn(
                "line-clamp-2 text-sm leading-5 transition-colors",
                !notification.isRead ? "text-foreground/80" : "text-muted-foreground/80",
              )}
            >
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
