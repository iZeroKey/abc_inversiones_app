import {
  buildApiUrl as buildUrl,
  getApiBaseUrl,
  readApiPath as readApiResponse,
  readApiUrl,
  type FetchWithAuth,
} from "@/lib/api-client";
import type {
  AdminLoanSummaryRow,
  ApiResponse,
  Installment,
  Loan,
  LoanCreatePayload,
  LoanSummary,
  PaginationMeta,
  Payment,
  PaymentMethod,
  PaymentVoucher,
  RelatedUser,
} from "@/types/loans";

type LoanListEnvelope = {
  loans?: Loan[];
  items?: Loan[];
  results?: Loan[];
};

type UserListEnvelope = {
  users?: RelatedUser[];
  items?: RelatedUser[];
  results?: RelatedUser[];
};

export type PaymentMutationPayload = {
  loanId?: string;
  amount: string;
  paymentDate?: string;
  method?: PaymentMethod;
  reference?: string;
  observation?: string;
  evidence?: File | null;
};

export type VoucherSubmitPayload = {
  loanId: string;
  amount: string;
  operationId: string;
  operationDate?: string;
  observation?: string;
  evidence?: File | null;
};

export type VoucherUpdatePayload = {
  amount?: string;
  operationId?: string;
  operationDate?: string;
  observation?: string | null;
};

export type VoucherAnalysis = {
  extracted?: {
    operationId?: string | null;
    amount?: string | null;
    operationDate?: string | null;
    bank?: string | null;
  };
  warnings?: string[];
};

export type LoanBundle = {
  installments: Installment[];
  loan: Loan | null;
  payments: Payment[];
  vouchers: PaymentVoucher[];
};

type MultipartRequestOptions = {
  accessToken?: string;
  onUploadProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

function unwrapList<T>(
  data: T[] | { items?: T[]; results?: T[] } | null | undefined,
) {
  if (Array.isArray(data)) return data;
  return data?.items ?? data?.results ?? [];
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function readMultipartApiResponse<T>(
  path: string,
  formData: FormData,
  options?: MultipartRequestOptions,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getApiBaseUrl()}${path}`);

    if (options?.accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${options.accessToken}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      options?.onUploadProgress?.(
        Math.round((event.loaded / event.total) * 100),
      );
    };

    xhr.onload = () => {
      options?.onUploadProgress?.(100);
      const payload = safeParseJson<ApiResponse<T>>(xhr.responseText);
      if (xhr.status < 200 || xhr.status >= 300 || !payload?.success) {
        reject(
          new Error(payload?.message || "No se pudo completar la solicitud."),
        );
        return;
      }
      resolve(payload);
    };

    xhr.onerror = () => reject(new Error("No se pudo completar la solicitud."));
    xhr.onabort = () =>
      reject(new DOMException("Solicitud cancelada.", "AbortError"));
    options?.signal?.addEventListener("abort", () => xhr.abort(), {
      once: true,
    });
    xhr.send(formData);
  });
}

function safeParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function fetchLoans(
  fetchWithAuth: FetchWithAuth,
  params?: { page?: number; limit?: number; status?: string; search?: string },
  init?: RequestInit,
): Promise<{ loans: Loan[]; meta: PaginationMeta }> {
  const payload = await readApiUrl<Loan[] | LoanListEnvelope>(
    fetchWithAuth,
    buildUrl("/api/v1/loans", params),
    init,
  );

  const data = payload.data;
  const loans = Array.isArray(data)
    ? data
    : (data?.loans ?? data?.items ?? data?.results ?? []);
  const meta = payload.meta?.pagination ?? payload.meta;

  return {
    loans,
    meta: {
      page: meta?.page ?? params?.page ?? 1,
      limit: meta?.limit ?? params?.limit ?? loans.length,
      total: meta?.total ?? loans.length,
      totalPages:
        meta?.totalPages ??
        (params?.limit
          ? Math.max(Math.ceil(loans.length / params.limit), 1)
          : 1),
    },
  };
}

export async function fetchLoansSummary(fetchWithAuth: FetchWithAuth) {
  const payload = await readApiResponse<LoanSummary>(
    fetchWithAuth,
    "/api/v1/loans/summary",
  );
  return payload.data ?? {};
}

export async function fetchAdminLoansSummary(fetchWithAuth: FetchWithAuth) {
  const payload = await readApiResponse<
    AdminLoanSummaryRow[] | { items?: AdminLoanSummaryRow[] }
  >(fetchWithAuth, "/api/v1/loans/admin-summary");

  return Array.isArray(payload.data)
    ? payload.data
    : (payload.data?.items ?? []);
}

export async function fetchLoanDetail(
  fetchWithAuth: FetchWithAuth,
  loanId: string,
  init?: RequestInit,
) {
  const payload = await readApiResponse<Loan>(
    fetchWithAuth,
    `/api/v1/loans/${loanId}`,
    init,
  );
  return payload.data;
}

export async function fetchLoanInstallments(
  fetchWithAuth: FetchWithAuth,
  loanId: string,
  init?: RequestInit,
) {
  const payload = await readApiResponse<
    Installment[] | { installments?: Installment[] }
  >(fetchWithAuth, `/api/v1/loans/${loanId}/installments`, init);

  return Array.isArray(payload.data)
    ? payload.data
    : (payload.data?.installments ?? []);
}

export async function fetchLoanPayments(
  fetchWithAuth: FetchWithAuth,
  loanId: string,
  init?: RequestInit,
) {
  const payload = await readApiResponse<Payment[] | { payments?: Payment[] }>(
    fetchWithAuth,
    `/api/v1/payments/loan/${loanId}`,
    init,
  );

  return Array.isArray(payload.data)
    ? payload.data
    : (payload.data?.payments ?? []);
}

export async function fetchLoanVouchers(
  fetchWithAuth: FetchWithAuth,
  loanId: string,
  init?: RequestInit,
) {
  const payload = await readApiUrl<
    PaymentVoucher[] | { vouchers?: PaymentVoucher[] }
  >(fetchWithAuth, buildUrl("/api/v1/payment-vouchers", { loanId }), init);

  return Array.isArray(payload.data)
    ? payload.data
    : (payload.data?.vouchers ?? []);
}

export async function fetchLoanBundle(
  fetchWithAuth: FetchWithAuth,
  loanId: string,
  init?: RequestInit,
): Promise<LoanBundle> {
  try {
    const payload = await readApiResponse<
      | LoanBundle
      | {
          installments?: Installment[];
          loan?: Loan | null;
          payments?: Payment[];
          vouchers?: PaymentVoucher[];
        }
    >(fetchWithAuth, `/api/v1/loans/${loanId}/bundle`, init);

    return {
      installments: payload.data?.installments ?? [],
      loan: payload.data?.loan ?? null,
      payments: payload.data?.payments ?? [],
      vouchers: payload.data?.vouchers ?? [],
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
  }

  const [detailResult, installmentsResult, paymentsResult, vouchersResult] =
    await Promise.allSettled([
      fetchLoanDetail(fetchWithAuth, loanId, init),
      fetchLoanInstallments(fetchWithAuth, loanId, init),
      fetchLoanPayments(fetchWithAuth, loanId, init),
      fetchLoanVouchers(fetchWithAuth, loanId, init),
    ]);

  return {
    installments:
      installmentsResult.status === "fulfilled" ? installmentsResult.value : [],
    loan:
      detailResult.status === "fulfilled" ? (detailResult.value ?? null) : null,
    payments: paymentsResult.status === "fulfilled" ? paymentsResult.value : [],
    vouchers: vouchersResult.status === "fulfilled" ? vouchersResult.value : [],
  };
}

export async function createPayment(
  fetchWithAuth: FetchWithAuth,
  payload: PaymentMutationPayload & { loanId: string },
  options?: MultipartRequestOptions,
) {
  if (payload.evidence) {
    const formData = new FormData();
    formData.set("loanId", payload.loanId);
    formData.set("amount", payload.amount);
    if (payload.paymentDate) formData.set("paymentDate", payload.paymentDate);
    if (payload.method) formData.set("method", payload.method);
    if (payload.reference) formData.set("reference", payload.reference);
    if (payload.observation) formData.set("observation", payload.observation);
    formData.set("evidence", payload.evidence);

    return readMultipartApiResponse<Payment>(
      "/api/v1/payments",
      formData,
      options,
    );
  }

  return readApiResponse<Payment>(fetchWithAuth, "/api/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updatePayment(
  fetchWithAuth: FetchWithAuth,
  paymentId: string,
  payload: PaymentMutationPayload,
) {
  return readApiResponse<{
    payment: Payment;
    loan?: Loan;
    overpaidAmount?: string;
  }>(fetchWithAuth, `/api/v1/payments/${paymentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deletePayment(
  fetchWithAuth: FetchWithAuth,
  paymentId: string,
) {
  return readApiResponse<{
    payment: Payment;
    loan?: Loan;
    overpaidAmount?: string;
  }>(fetchWithAuth, `/api/v1/payments/${paymentId}`, {
    method: "DELETE",
  });
}

export async function analyzeVoucherEvidence(
  fetchWithAuth: FetchWithAuth,
  evidence: File,
  options?: MultipartRequestOptions,
) {
  const formData = new FormData();
  formData.set("evidence", evidence);

  if (options?.accessToken) {
    const payload = await readMultipartApiResponse<VoucherAnalysis>(
      "/api/v1/payment-vouchers/analyze",
      formData,
      options,
    );
    return payload.data ?? {};
  }

  const payload = await readApiResponse<VoucherAnalysis>(
    fetchWithAuth,
    "/api/v1/payment-vouchers/analyze",
    {
      method: "POST",
      body: formData,
    },
  );

  return payload.data ?? {};
}

export async function checkOperationIdExists(
  fetchWithAuth: FetchWithAuth,
  operationId: string,
) {
  const payload = await readApiUrl<{ operationId: string; exists: boolean }>(
    fetchWithAuth,
    buildUrl("/api/v1/payment-vouchers/operation-id/exists", { operationId }),
  );

  return payload.data?.exists ?? false;
}

export async function submitVoucher(
  fetchWithAuth: FetchWithAuth,
  payload: VoucherSubmitPayload,
  options?: MultipartRequestOptions,
) {
  if (payload.evidence) {
    const formData = new FormData();
    formData.set("loanId", payload.loanId);
    formData.set("amount", payload.amount);
    formData.set("operationId", payload.operationId);
    if (payload.operationDate)
      formData.set("operationDate", payload.operationDate);
    if (payload.observation) formData.set("observation", payload.observation);
    formData.set("evidence", payload.evidence);

    return readMultipartApiResponse<PaymentVoucher>(
      "/api/v1/payment-vouchers",
      formData,
      options,
    );
  }

  return readApiResponse<PaymentVoucher>(
    fetchWithAuth,
    "/api/v1/payment-vouchers",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        loanId: payload.loanId,
        amount: payload.amount,
        operationId: payload.operationId,
        operationDate: payload.operationDate || undefined,
        observation: payload.observation || undefined,
      }),
    },
  );
}

export async function processVoucher(
  fetchWithAuth: FetchWithAuth,
  voucherId: string,
  payload: { action: "approve" | "reject"; observation?: string },
) {
  return readApiResponse<PaymentVoucher>(
    fetchWithAuth,
    `/api/v1/payment-vouchers/${voucherId}/process`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function updateVoucher(
  fetchWithAuth: FetchWithAuth,
  voucherId: string,
  payload: VoucherUpdatePayload,
) {
  return readApiResponse<{ voucher: PaymentVoucher; recalculation?: unknown }>(
    fetchWithAuth,
    `/api/v1/payment-vouchers/${voucherId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteVoucher(
  fetchWithAuth: FetchWithAuth,
  voucherId: string,
) {
  return readApiResponse<{ voucher: PaymentVoucher; recalculation?: unknown }>(
    fetchWithAuth,
    `/api/v1/payment-vouchers/${voucherId}`,
    {
      method: "DELETE",
    },
  );
}

export async function fetchUserById(
  fetchWithAuth: FetchWithAuth,
  userId: string,
): Promise<RelatedUser | null> {
  try {
    const payload = await readApiResponse<RelatedUser>(
      fetchWithAuth,
      `/api/v1/users/${userId}`,
    );
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchUsersByRole(
  fetchWithAuth: FetchWithAuth,
  role: string,
  init?: RequestInit,
) {
  const payload = await readApiUrl<RelatedUser[] | UserListEnvelope>(
    fetchWithAuth,
    buildUrl("/api/v1/users", { role, active: "true", limit: 100 }),
    init,
  );

  const data = payload.data;
  const users = Array.isArray(data) ? data : (data?.users ?? unwrapList(data));
  return users.filter((user) => user.role === role && user.active !== false);
}

export async function createLoan(
  fetchWithAuth: FetchWithAuth,
  payload: LoanCreatePayload,
) {
  return readApiResponse<Loan>(fetchWithAuth, "/api/v1/loans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function approveLoan(
  fetchWithAuth: FetchWithAuth,
  loanId: string,
) {
  return readApiResponse<Loan>(
    fetchWithAuth,
    `/api/v1/loans/${loanId}/approve`,
    {
      method: "PATCH",
    },
  );
}

export async function rejectLoan(
  fetchWithAuth: FetchWithAuth,
  loanId: string,
  observation?: string,
) {
  return readApiResponse<Loan>(
    fetchWithAuth,
    `/api/v1/loans/${loanId}/reject`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ observation: observation?.trim() || undefined }),
    },
  );
}
