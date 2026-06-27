import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import {
  fetchLoanBundle,
  fetchLoans,
  fetchLoansSummary,
  fetchUsersByRole,
  type LoanBundle,
} from "@/lib/loans-api";
import {
  queryKeys,
  type LoanListParams,
  type QueryScope,
} from "@/lib/query-keys";
import type { Loan, LoanSummary, PaginationMeta, RelatedUser } from "@/types/loans";

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
