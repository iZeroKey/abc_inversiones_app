import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useAuth } from "@/contexts/auth-context"
import { getAuthQueryScope } from "@/features/loans/loan-queries"
import {
  fetchAccessRequests,
  fetchUsers,
  USERS_PAGE_SIZE,
  type AccessRequestsQueryData,
  type UsersQueryData,
} from "@/lib/users-api"
import { queryKeys } from "@/lib/query-keys"

export type UsersQueryParams = {
  page?: number
  limit?: number
  search?: string
  role?: string
  active?: string
}

export type AccessRequestsQueryParams = {
  page?: number
  limit?: number
  search?: string
  roleRequested?: string
  status?: string
}

export function useUsersQuery(params: UsersQueryParams = {}) {
  const { fetchWithAuth, session, user } = useAuth()
  const scope = getAuthQueryScope(user)

  return useQuery<UsersQueryData>({
    enabled: Boolean(session?.access_token),
    meta: { persist: true },
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      fetchUsers(
        fetchWithAuth,
        {
          page: params.page,
          limit: params.limit ?? USERS_PAGE_SIZE,
          search: params.search,
          role: params.role,
          active: params.active,
        },
        { signal },
      ),
    queryKey: queryKeys.users.list(scope, params as Record<string, unknown>),
  })
}

export function useAccessRequestsQuery(params: AccessRequestsQueryParams = {}) {
  const { fetchWithAuth, session, user } = useAuth()
  const scope = getAuthQueryScope(user)

  return useQuery<AccessRequestsQueryData>({
    enabled: Boolean(session?.access_token),
    meta: { persist: true },
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      fetchAccessRequests(
        fetchWithAuth,
        {
          page: params.page,
          limit: params.limit ?? USERS_PAGE_SIZE,
          search: params.search,
          roleRequested: params.roleRequested,
          status: params.status,
        },
        { signal },
      ),
    queryKey: queryKeys.users.accessRequests(scope, params as Record<string, unknown>),
  })
}
