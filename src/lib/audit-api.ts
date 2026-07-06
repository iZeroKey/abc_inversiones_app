import { buildApiUrl, readApiUrl, type FetchWithAuth } from "@/lib/api-client"
import type { PaginationMeta } from "@/types/loans"

export const AUDIT_PAGE_SIZE = 50

export type AuditLog = {
  action: string
  createdAt: string
  entityId?: string | null
  id: string
  ipAddress?: string | null
  module: string
  newData?: unknown
  oldData?: unknown
  user?: {
    avatarUrl?: string | null
    email?: string | null
    firstName?: string | null
    id: string
    lastName?: string | null
    publicCode?: string | null
    role?: string | null
  } | null
  userAgent?: string | null
  userId?: string | null
}

export type AuditLogsQueryData = {
  logs: AuditLog[]
  meta: PaginationMeta
}

export async function fetchAuditLogs(
  fetchWithAuth: FetchWithAuth,
  params: {
    page?: number
    limit?: number
    module?: string
    action?: string
    userId?: string
  },
  init?: RequestInit,
): Promise<AuditLogsQueryData> {
  const payload = await readApiUrl<AuditLog[]>(
    fetchWithAuth,
    buildApiUrl("/api/v1/audit-logs", {
      page: params.page ?? 1,
      limit: params.limit ?? AUDIT_PAGE_SIZE,
      module: params.module,
      action: params.action,
      userId: params.userId,
    }),
    init,
  )

  const logs = payload.data ?? []
  const meta = payload.meta?.pagination ?? payload.meta

  return {
    logs,
    meta: {
      page: meta?.page ?? params.page ?? 1,
      limit: meta?.limit ?? params.limit ?? AUDIT_PAGE_SIZE,
      total: meta?.total ?? logs.length,
      totalPages: Math.max(1, meta?.totalPages ?? 1),
    },
  }
}
