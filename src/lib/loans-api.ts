import type {
  AdminLoanSummaryRow,
  ApiResponse,
  Installment,
  Loan,
  LoanCreatePayload,
  LoanSummary,
  PaginationMeta,
  Payment,
  PaymentVoucher,
  RelatedUser,
} from "@/types/loans"

export type FetchWithAuth = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

type LoanListEnvelope = {
  loans?: Loan[]
  items?: Loan[]
  results?: Loan[]
}

type UserListEnvelope = {
  users?: RelatedUser[]
  items?: RelatedUser[]
  results?: RelatedUser[]
}

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("No se encontró VITE_API_URL para consultar el servidor.")
  }

  return API_BASE_URL
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${getApiBaseUrl()}${path}`)

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

async function readApiResponse<T>(
  fetchWithAuth: FetchWithAuth,
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetchWithAuth(`${getApiBaseUrl()}${path}`, init)
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "No se pudo completar la solicitud.")
  }

  return payload
}

async function readApiUrl<T>(
  fetchWithAuth: FetchWithAuth,
  url: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetchWithAuth(url, init)
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "No se pudo completar la solicitud.")
  }

  return payload
}

function unwrapList<T>(data: T[] | { items?: T[]; results?: T[] } | null | undefined) {
  if (Array.isArray(data)) return data
  return data?.items ?? data?.results ?? []
}

export async function fetchLoans(
  fetchWithAuth: FetchWithAuth,
  params: { page: number; limit: number; status?: string; search?: string },
): Promise<{ loans: Loan[]; meta: PaginationMeta }> {
  const payload = await readApiUrl<Loan[] | LoanListEnvelope>(
    fetchWithAuth,
    buildUrl("/api/v1/loans", params),
  )

  const data = payload.data
  const loans = Array.isArray(data) ? data : data?.loans ?? data?.items ?? data?.results ?? []

  return {
    loans,
    meta: payload.meta?.pagination ?? payload.meta ?? {
      page: params.page,
      limit: params.limit,
      total: loans.length,
      totalPages: 1,
    },
  }
}

export async function fetchLoansSummary(fetchWithAuth: FetchWithAuth) {
  const payload = await readApiResponse<LoanSummary>(fetchWithAuth, "/api/v1/loans/summary")
  return payload.data ?? {}
}

export async function fetchAdminLoansSummary(fetchWithAuth: FetchWithAuth) {
  const payload = await readApiResponse<AdminLoanSummaryRow[] | { items?: AdminLoanSummaryRow[] }>(
    fetchWithAuth,
    "/api/v1/loans/admin-summary",
  )

  return Array.isArray(payload.data) ? payload.data : payload.data?.items ?? []
}

export async function fetchLoanDetail(fetchWithAuth: FetchWithAuth, loanId: string) {
  const payload = await readApiResponse<Loan>(fetchWithAuth, `/api/v1/loans/${loanId}`)
  return payload.data
}

export async function fetchLoanInstallments(fetchWithAuth: FetchWithAuth, loanId: string) {
  const payload = await readApiResponse<Installment[] | { installments?: Installment[] }>(
    fetchWithAuth,
    `/api/v1/loans/${loanId}/installments`,
  )

  return Array.isArray(payload.data) ? payload.data : payload.data?.installments ?? []
}

export async function fetchLoanPayments(fetchWithAuth: FetchWithAuth, loanId: string) {
  const payload = await readApiResponse<Payment[] | { payments?: Payment[] }>(
    fetchWithAuth,
    `/api/v1/payments/loan/${loanId}`,
  )

  return Array.isArray(payload.data) ? payload.data : payload.data?.payments ?? []
}

export async function fetchLoanVouchers(fetchWithAuth: FetchWithAuth, loanId: string) {
  const payload = await readApiUrl<PaymentVoucher[] | { vouchers?: PaymentVoucher[] }>(
    fetchWithAuth,
    buildUrl("/api/v1/payment-vouchers", { loanId }),
  )

  return Array.isArray(payload.data) ? payload.data : payload.data?.vouchers ?? []
}

export async function fetchUsersByRole(fetchWithAuth: FetchWithAuth, role: string) {
  const payload = await readApiUrl<RelatedUser[] | UserListEnvelope>(
    fetchWithAuth,
    buildUrl("/api/v1/users", { role, active: "true", limit: 100 }),
  )

  const data = payload.data
  const users = Array.isArray(data) ? data : data?.users ?? unwrapList(data)
  return users.filter((user) => user.role === role && user.active !== false)
}

export async function createLoan(fetchWithAuth: FetchWithAuth, payload: LoanCreatePayload) {
  return readApiResponse<Loan>(fetchWithAuth, "/api/v1/loans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

export async function approveLoan(fetchWithAuth: FetchWithAuth, loanId: string) {
  return readApiResponse<Loan>(fetchWithAuth, `/api/v1/loans/${loanId}/approve`, {
    method: "PATCH",
  })
}

export async function rejectLoan(
  fetchWithAuth: FetchWithAuth,
  loanId: string,
  observation?: string,
) {
  return readApiResponse<Loan>(fetchWithAuth, `/api/v1/loans/${loanId}/reject`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ observation: observation?.trim() || undefined }),
  })
}
