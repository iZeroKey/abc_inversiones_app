import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import { useRealtime } from "@/contexts/realtime-context";
import {
  fetchLoanBundle,
  fetchLoanPayments,
  fetchLoanTransactions,
  fetchLoanVouchers,
  fetchLoans,
  fetchLoansSummary,
  fetchUsersByRole,
  type LoanBundle,
} from "@/lib/loans-api";
import {
  queryKeys,
  type LoanListParams,
  type PaymentListParams,
  type QueryScope,
  type TransactionListParams,
  type VoucherListParams,
} from "@/lib/query-keys";
import type {
  Loan,
  LoanSummary,
  LoanTransaction,
  PaginationMeta,
  Payment,
  PaymentVoucher,
  RelatedUser,
} from "@/types/loans";

export type LoansQueryData = {
  loans: Loan[];
  meta: PaginationMeta;
};

export function getAuthQueryScope(
  user?: {
    id?: string | null;
    isOwner?: boolean;
    role?: string | null;
  } | null,
): QueryScope {
  return {
    role: user?.isOwner ? "owner" : user?.role,
    userId: user?.id,
  };
}

export function useLoansQuery(params: LoanListParams = {}) {
  const { fetchWithAuth, session, user } = useAuth();
  const scope = getAuthQueryScope(user);

  return useQuery<LoansQueryData>({
    enabled: Boolean(session?.access_token),
    meta: { persist: true },
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => fetchLoans(fetchWithAuth, params, { signal }),
    queryKey: queryKeys.loans.list(scope, params),
  });
}

export function useLoanBundleQuery(
  loanId: string | null,
  options?: { enabled?: boolean },
) {
  const { fetchWithAuth, session, user } = useAuth();
  const scope = getAuthQueryScope(user);

  return useQuery<LoanBundle>({
    enabled: Boolean(
      session?.access_token && loanId && (options?.enabled ?? true),
    ),
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      fetchLoanBundle(fetchWithAuth, loanId ?? "", { signal }),
    queryKey: queryKeys.loans.detail(scope, loanId ?? "none"),
  });
}

export function useLoanUsersByRoleQuery(
  role: string,
  options?: { enabled?: boolean },
) {
  const { fetchWithAuth, session, user } = useAuth();
  const scope = getAuthQueryScope(user);

  return useQuery<RelatedUser[]>({
    enabled: Boolean(session?.access_token && (options?.enabled ?? true)),
    meta: { persist: true },
    queryFn: ({ signal }) => fetchUsersByRole(fetchWithAuth, role, { signal }),
    queryKey: queryKeys.loans.usersByRole(scope, role),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoansSummaryQuery() {
  const { fetchWithAuth, session, user } = useAuth();
  const scope = getAuthQueryScope(user);

  return useQuery<LoanSummary>({
    enabled: Boolean(session?.access_token),
    queryFn: () => fetchLoansSummary(fetchWithAuth),
    queryKey: queryKeys.loans.summary(scope),
  });
}

export function useLoanPaymentsQuery(
  loanId: string | null,
  params: Omit<PaymentListParams, "page"> = {},
  options?: { enabled?: boolean },
) {
  const { fetchWithAuth, session, user } = useAuth();
  const { status: wsStatus } = useRealtime();
  const scope = getAuthQueryScope(user);

  return useInfiniteQuery<{ payments: Payment[]; meta: PaginationMeta }>({
    enabled: Boolean(
      session?.access_token && loanId && (options?.enabled ?? true),
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      fetchLoanPayments(
        fetchWithAuth,
        loanId ?? "",
        { ...params, page: pageParam as number },
        { signal },
      ),
    queryKey: queryKeys.payments.list(scope, loanId ?? "none", params),
    getNextPageParam: (lastPage) => {
      const current = lastPage.meta.page ?? 1;
      const total = lastPage.meta.totalPages ?? 1;
      return current < total ? current + 1 : undefined;
    },
    refetchInterval:
      wsStatus === "disconnected" || wsStatus === "error" ? 30_000 : false,
  });
}

export function useLoanVouchersQuery(
  loanId: string | null,
  params: Omit<VoucherListParams, "page"> = {},
  options?: { enabled?: boolean },
) {
  const { fetchWithAuth, session, user } = useAuth();
  const { status: wsStatus } = useRealtime();
  const scope = getAuthQueryScope(user);

  return useInfiniteQuery<{ vouchers: PaymentVoucher[]; meta: PaginationMeta }>(
    {
      enabled: Boolean(
        session?.access_token && loanId && (options?.enabled ?? true),
      ),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        fetchLoanVouchers(
          fetchWithAuth,
          { ...params, loanId: loanId ?? undefined, page: pageParam as number },
          { signal },
        ),
      queryKey: queryKeys.vouchers.list(scope, loanId ?? "none", params),
      getNextPageParam: (lastPage) => {
        const current = lastPage.meta.page ?? 1;
        const total = lastPage.meta.totalPages ?? 1;
        return current < total ? current + 1 : undefined;
      },
      refetchInterval:
        wsStatus === "disconnected" || wsStatus === "error" ? 30_000 : false,
    },
  );
}

export function useAllVouchersQuery(
  params: VoucherListParams = {},
  options?: { enabled?: boolean },
) {
  const { fetchWithAuth, session, user } = useAuth();
  const { status: wsStatus } = useRealtime();
  const scope = getAuthQueryScope(user);

  return useInfiniteQuery<{ vouchers: PaymentVoucher[]; meta: PaginationMeta }>({
    enabled: Boolean(session?.access_token && (options?.enabled ?? true)),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      fetchLoanVouchers(
        fetchWithAuth,
        { ...params, page: pageParam as number },
        { signal },
      ),
    queryKey: queryKeys.vouchers.list(scope, "all", params),
    getNextPageParam: (lastPage) => {
      const current = lastPage.meta.page ?? 1;
      const total = lastPage.meta.totalPages ?? 1;
      return current < total ? current + 1 : undefined;
    },
    refetchInterval:
      wsStatus === "disconnected" || wsStatus === "error" ? 30_000 : false,
  });
}

export function useLoanTransactionsQuery(
  loanId: string | null,
  params: Omit<TransactionListParams, "page"> = {},
  options?: { enabled?: boolean },
) {
  const { fetchWithAuth, session, user } = useAuth();
  const { status: wsStatus } = useRealtime();
  const scope = getAuthQueryScope(user);

  return useInfiniteQuery<{ data: LoanTransaction[]; meta: PaginationMeta }>({
    enabled: Boolean(
      session?.access_token && loanId && (options?.enabled ?? true),
    ),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      fetchLoanTransactions(
        fetchWithAuth,
        loanId ?? "",
        { ...params, page: pageParam as number },
        { signal },
      ),
    queryKey: queryKeys.transactions.list(scope, loanId ?? "none", params),
    getNextPageParam: (lastPage) => {
      const current = lastPage.meta.page ?? 1;
      const total = lastPage.meta.totalPages ?? 1;
      return current < total ? current + 1 : undefined;
    },
    refetchInterval:
      wsStatus === "disconnected" || wsStatus === "error" ? 30_000 : false,
  });
}
