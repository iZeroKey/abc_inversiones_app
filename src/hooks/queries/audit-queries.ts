import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useAuth } from "@/contexts/auth-context"
import { getAuthQueryScope } from "@/features/loans/loan-queries"
import {
  fetchAuditLogs,
  AUDIT_PAGE_SIZE,
  type AuditLogsQueryData,
} from "@/lib/audit-api"
import { queryKeys, type AuditParams } from "@/lib/query-keys"

export function useAuditLogsQuery(params: AuditParams = {}) {
  const { fetchWithAuth, session, user } = useAuth()
  const scope = getAuthQueryScope(user)

  return useQuery<AuditLogsQueryData>({
    enabled: Boolean(session?.access_token),
    meta: { persist: true },
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      fetchAuditLogs(
        fetchWithAuth,
        {
          page: params.page,
          limit: AUDIT_PAGE_SIZE,
          module: params.module,
          action: params.action,
          userId: params.userId,
        },
        { signal },
      ),
    queryKey: queryKeys.audit.logs(scope, params),
  })
}
