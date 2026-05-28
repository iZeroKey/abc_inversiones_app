import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import { getAuthQueryScope } from "@/features/loans/loan-queries";
import { buildApiUrl, readApiUrl } from "@/lib/api-client";
import { queryKeys, type NotificationsParams } from "@/lib/query-keys";

export const NOTIFICATIONS_PAGE_SIZE = 10;

export type NotificationFilter = "all" | "read" | "unread";

export type NotificationItem = {
  body: string;
  createdAt: string;
  data: unknown;
  id: string;
  isRead: boolean;
  title: string;
  type: string;
};

export type NotificationsPaginationMeta = {
  limit?: number;
  page?: number;
  total?: number;
  totalPages?: number;
  unreadCount?: number;
};

export type NotificationsQueryData = {
  notifications: NotificationItem[];
  pagination: NotificationsPaginationMeta;
};

function buildNotificationParams(params: NotificationsParams) {
  const searchParams: Record<string, boolean | number | string | undefined> = {
    limit: NOTIFICATIONS_PAGE_SIZE,
    page: params.page ?? 1,
  };

  if (params.filter && params.filter !== "all") {
    searchParams.isRead = params.filter === "read";
  }

  return searchParams;
}

export function useNotificationsQuery(params: NotificationsParams) {
  const { fetchWithAuth, session, user } = useAuth();
  const scope = getAuthQueryScope(user);

  return useQuery<NotificationsQueryData>({
    enabled: Boolean(session?.access_token),
    meta: { persist: true },
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const payload = await readApiUrl<NotificationItem[]>(
        fetchWithAuth,
        buildApiUrl("/api/v1/notifications", buildNotificationParams(params)),
        { signal },
      );
      const notifications = payload.data ?? [];

      return {
        notifications,
        pagination: {
          limit: payload.meta?.limit ?? NOTIFICATIONS_PAGE_SIZE,
          page: payload.meta?.page ?? params.page ?? 1,
          total: payload.meta?.total ?? notifications.length,
          totalPages: payload.meta?.totalPages ?? 1,
          unreadCount:
            payload.meta?.unreadCount ??
            notifications.filter((notification) => !notification.isRead).length,
        },
      };
    },
    queryKey: queryKeys.notifications.list(scope, params),
  });
}

export function useUnreadNotificationsCountQuery() {
  const { fetchWithAuth, session, user } = useAuth();
  const scope = getAuthQueryScope(user);

  return useQuery<number>({
    enabled: Boolean(session?.access_token),
    meta: { persist: true },
    queryFn: async ({ signal }) => {
      const payload = await readApiUrl<NotificationItem[]>(
        fetchWithAuth,
        buildApiUrl("/api/v1/notifications", {
          isRead: false,
          limit: 1,
          page: 1,
        }),
        { signal },
      );

      return (
        payload.meta?.unreadCount ??
        payload.meta?.total ??
        payload.data?.filter((notification) => !notification.isRead).length ??
        0
      );
    },
    queryKey: queryKeys.notifications.unreadCount(scope),
  });
}
