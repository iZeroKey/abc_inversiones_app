import { buildApiUrl, readApiUrl, type FetchWithAuth } from "@/lib/api-client"
import type { PaginationMeta } from "@/types/loans"

export const USERS_PAGE_SIZE = 10

export type ManagedUser = {
  id: string
  authUserId?: string | null
  publicCode?: string | null
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  dni?: string | null
  address?: string | null
  bank?: string | null
  bankAccounts?: string[]
  maritalStatus?: string | null
  avatarUrl?: string | null
  avatar?: string | null
  role?: string
  active?: boolean
  isOwner?: boolean
  createdAt?: string
  updatedAt?: string
}

export type AccessRequest = {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  roleRequested?: string
  status?: string
  observation?: string | null
  createdAt?: string
  updatedAt?: string
}

export type UsersQueryData = {
  users: ManagedUser[]
  meta: PaginationMeta
}

export type AccessRequestsQueryData = {
  requests: AccessRequest[]
  meta: PaginationMeta
}

type UsersEnvelope = {
  users?: ManagedUser[]
  items?: ManagedUser[]
  results?: ManagedUser[]
}

type RequestsEnvelope = {
  accessRequests?: AccessRequest[]
  requests?: AccessRequest[]
  items?: AccessRequest[]
  results?: AccessRequest[]
}

function unwrapUsers(data: ManagedUser[] | UsersEnvelope | null | undefined) {
  if (Array.isArray(data)) return data
  return data?.users ?? data?.items ?? data?.results ?? []
}

function unwrapRequests(data: AccessRequest[] | RequestsEnvelope | null | undefined) {
  if (Array.isArray(data)) return data
  return data?.accessRequests ?? data?.requests ?? data?.items ?? data?.results ?? []
}

export async function fetchUsers(
  fetchWithAuth: FetchWithAuth,
  params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
    active?: string
  },
  init?: RequestInit,
): Promise<UsersQueryData> {
  const payload = await readApiUrl<ManagedUser[] | UsersEnvelope>(
    fetchWithAuth,
    buildApiUrl("/api/v1/users", {
      page: params?.page ?? 1,
      limit: params?.limit ?? USERS_PAGE_SIZE,
      search: params?.search,
      role: params?.role,
      active: params?.active,
    }),
    init,
  )

  const data = payload.data
  const users = unwrapUsers(data)
  const meta = payload.meta?.pagination ?? payload.meta

  return {
    users,
    meta: {
      page: meta?.page ?? params?.page ?? 1,
      limit: meta?.limit ?? params?.limit ?? USERS_PAGE_SIZE,
      total: meta?.total ?? users.length,
      totalPages: Math.max(1, meta?.totalPages ?? 1),
    },
  }
}

export async function fetchAccessRequests(
  fetchWithAuth: FetchWithAuth,
  params?: {
    page?: number
    limit?: number
    search?: string
    roleRequested?: string
    status?: string
  },
  init?: RequestInit,
): Promise<AccessRequestsQueryData> {
  const payload = await readApiUrl<AccessRequest[] | RequestsEnvelope>(
    fetchWithAuth,
    buildApiUrl("/api/v1/access-requests", {
      page: params?.page ?? 1,
      limit: params?.limit ?? USERS_PAGE_SIZE,
      search: params?.search,
      roleRequested: params?.roleRequested,
      status: params?.status,
    }),
    init,
  )

  const data = payload.data
  const requests = unwrapRequests(data)
  const meta = payload.meta?.pagination ?? payload.meta

  return {
    requests,
    meta: {
      page: meta?.page ?? params?.page ?? 1,
      limit: meta?.limit ?? params?.limit ?? USERS_PAGE_SIZE,
      total: meta?.total ?? requests.length,
      totalPages: Math.max(1, meta?.totalPages ?? 1),
    },
  }
}
