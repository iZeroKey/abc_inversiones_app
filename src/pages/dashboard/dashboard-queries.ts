import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import {
  getLoanPaidAmount,
  toNumber,
} from "@/features/loans/loan-utils";
import {
  getApiBaseUrl,
  readApiPath,
  readApiPayload,
  type FetchWithAuth,
} from "@/lib/api-client";
import type { Installment } from "@/types/loans";
import { useEffect, useRef } from "react";
import { queryKeys } from "@/lib/query-keys";
import { getAuthQueryScope } from "@/features/loans/loan-queries";

export type AdminDashboardData = {
  loans?: {
    activeLoans?: number;
    pendingLoans?: number;
    totalDebt?: string;
    totalLoans?: number;
    totalPortfolio?: string;
  };
  overdue?: {
    overdueAmount?: string;
    overdueCount?: number;
  };
  users?: {
    admins?: number;
    clients?: number;
    investors?: number;
    totalUsers?: number;
  };
  vouchers?: {
    pendingAdmin?: number;
    pendingInvestor?: number;
  };
};

export type DashboardLoan = {
  frequency?: string;
  id: string;
  installmentsCount?: number;
  interestRate?: number | string;
  publicCode?: string | null;
  status?: string;
  totalDebt?: string;
  totalPaid?: string;
};

export type ClientStatement = {
  loans?: DashboardLoan[];
  pendingInstallments?: number;
  summary?: {
    pendingInstallments?: number;
    totalDebt?: string;
    totalPaid?: string;
  };
};

export type InvestorPortfolio = {
  collectedAmount?: number | string;
  investments?: {
    loanId: string;
  }[];
  summary?: {
    activeLoans?: number;
    collectedAmount?: number | string;
    totalInvested?: string;
    totalReturn?: string;
  };
};

type Payment = {
  amount?: string;
  status?: string;
};

export type ClientDashboardData = {
  data: ClientStatement;
  pendingInstallments: number;
};

export type InvestorDashboardData = {
  collectedAmount: number;
  data: InvestorPortfolio;
};

async function fetchAdminDashboard(fetchWithAuth: FetchWithAuth) {
  const payload = await readApiPath<AdminDashboardData>(
    fetchWithAuth,
    "/api/v1/reports/dashboard",
  );
  return payload.data ?? {};
}

async function fetchClientDashboard(fetchWithAuth: FetchWithAuth) {
  const payload = await readApiPath<ClientStatement>(
    fetchWithAuth,
    "/api/v1/reports/statement",
  );
  const data = payload.data ?? {};
  const loans = data.loans ?? [];
  const pendingFromApi =
    data.pendingInstallments ?? data.summary?.pendingInstallments;
  const hasProgressFromApi =
    typeof pendingFromApi === "number" &&
    loans.every((loan) => loan.totalPaid !== undefined);

  if (hasProgressFromApi) {
    return {
      data,
      pendingInstallments: pendingFromApi,
    };
  }

  const activeLoanIds = new Set(
    loans.filter((loan) => loan.status === "active").map((loan) => loan.id),
  );
  const loanIds = loans.map((l) => l.id);
  const batchResponse = await fetchWithAuth(
    `${getApiBaseUrl()}/api/v1/loans/batch-installments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loanIds }),
    }
  );
  const batchPayload = await readApiPayload<Record<string, Installment[]>>(batchResponse);
  const batchInstallments = batchPayload.data || {};

  const installmentResponses = loans.map((loan) => ({
    installments: batchInstallments[loan.id] || [],
    loan,
  }));

  const loansWithProgress = installmentResponses.map(({ installments, loan }) => ({
    ...loan,
    totalPaid: String(getLoanPaidAmount(loan, installments)),
  }));
  const paidFromInstallments = loansWithProgress.reduce(
    (total, loan) => total + toNumber(loan.totalPaid),
    0,
  );

  return {
    data: {
      ...data,
      loans: loansWithProgress,
      summary: {
        ...data.summary,
        totalPaid: String(
          toNumber(data.summary?.totalPaid) || paidFromInstallments,
        ),
      },
    },
    pendingInstallments: installmentResponses
      .flatMap(({ installments, loan }) =>
        activeLoanIds.has(loan.id) ? installments : [],
      )
      .filter((installment) => installment.status !== "paid").length,
  };
}

async function fetchInvestorDashboard(fetchWithAuth: FetchWithAuth) {
  const payload = await readApiPath<InvestorPortfolio>(
    fetchWithAuth,
    "/api/v1/reports/portfolio",
  );
  const data = payload.data ?? {};
  const collectedFromApi =
    data.collectedAmount ?? data.summary?.collectedAmount;

  if (collectedFromApi !== undefined) {
    return {
      collectedAmount: Number(collectedFromApi) || 0,
      data,
    };
  }

  const loanIds = (data.investments ?? []).map((inv) => inv.loanId);
  let paymentsByLoan: Payment[][] = [];
  
  if (loanIds.length > 0) {
    const batchResponse = await fetchWithAuth(
      `${getApiBaseUrl()}/api/v1/payments/batch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanIds }),
      }
    );
    const batchPayload = await readApiPayload<Record<string, Payment[]>>(batchResponse);
    const batchPayments = batchPayload.data || {};
    paymentsByLoan = loanIds.map((id) => batchPayments[id] || []);
  }

  return {
    collectedAmount: paymentsByLoan
      .flat()
      .filter((payment) => payment.status === "confirmed")
      .reduce((total, payment) => total + Number.parseFloat(payment.amount || "0"), 0),
    data,
  };
}

export function useAdminDashboardQuery() {
  const { fetchWithAuth, session, user } = useAuth();
  const fetchWithAuthRef = useRef(fetchWithAuth);
  useEffect(() => {
    fetchWithAuthRef.current = fetchWithAuth;
  }, [fetchWithAuth]);
  const scope = getAuthQueryScope(user);

  return useQuery({
    enabled: Boolean(session?.access_token),
    meta: { persist: true },
    queryFn: () => fetchAdminDashboard((...args) => fetchWithAuthRef.current(...args)),
    queryKey: queryKeys.dashboard.admin(scope),
  });
}

export function useClientDashboardQuery() {
  const { fetchWithAuth, session, user } = useAuth();
  const fetchWithAuthRef = useRef(fetchWithAuth);
  useEffect(() => {
    fetchWithAuthRef.current = fetchWithAuth;
  }, [fetchWithAuth]);
  const scope = getAuthQueryScope(user);

  return useQuery<ClientDashboardData>({
    enabled: Boolean(session?.access_token),
    meta: { persist: true },
    queryFn: () => fetchClientDashboard((...args) => fetchWithAuthRef.current(...args)),
    queryKey: queryKeys.dashboard.client(scope),
  });
}

export function useInvestorDashboardQuery() {
  const { fetchWithAuth, session, user } = useAuth();
  const fetchWithAuthRef = useRef(fetchWithAuth);
  useEffect(() => {
    fetchWithAuthRef.current = fetchWithAuth;
  }, [fetchWithAuth]);
  const scope = getAuthQueryScope(user);

  return useQuery<InvestorDashboardData>({
    enabled: Boolean(session?.access_token),
    meta: { persist: true },
    queryFn: () => fetchInvestorDashboard(fetchWithAuth),
    queryKey: queryKeys.dashboard.investor(scope),
  });
}
