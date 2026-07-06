export type QueryScope = {
  role?: string | null;
  userId?: string | null;
};

export type LoanListParams = {
  limit?: number;
  page?: number;
  search?: string;
  status?: string;
};

export type NotificationsParams = {
  filter?: string;
  page?: number;
};

export type PaymentListParams = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  method?: string;
};

export type TransactionListParams = {
  page?: number;
  limit?: number;
  loanId?: string;
  from?: string;
  to?: string;
};

export type VoucherListParams = {
  page?: number;
  limit?: number;
  loanId?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
};

export type AuditParams = {
  action?: string;
  module?: string;
  page?: number;
  userId?: string;
};

function scopeKey(scope?: QueryScope) {
  return {
    role: scope?.role ?? "guest",
    userId: scope?.userId ?? "anonymous",
  };
}

function compactParams<T extends Record<string, unknown>>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

export const queryKeys = {
  root: ["abc"] as const,
  audit: {
    all: ["abc", "audit"] as const,
    logs: (scope: QueryScope | undefined, params: AuditParams) =>
      ["abc", "audit", "logs", scopeKey(scope), compactParams(params)] as const,
  },
  dashboard: {
    all: ["abc", "dashboard"] as const,
    admin: (scope?: QueryScope) =>
      ["abc", "dashboard", "admin", scopeKey(scope)] as const,
    client: (scope?: QueryScope) =>
      ["abc", "dashboard", "client", scopeKey(scope)] as const,
    investor: (scope?: QueryScope) =>
      ["abc", "dashboard", "investor", scopeKey(scope)] as const,
  },
  loans: {
    all: ["abc", "loans"] as const,
    detail: (scope: QueryScope | undefined, loanId: string) =>
      ["abc", "loans", "detail", scopeKey(scope), loanId] as const,
    list: (scope: QueryScope | undefined, params: LoanListParams = {}) =>
      ["abc", "loans", "list", scopeKey(scope), compactParams(params)] as const,
    summary: (scope?: QueryScope) =>
      ["abc", "loans", "summary", scopeKey(scope)] as const,
    usersByRole: (scope: QueryScope | undefined, role: string) =>
      ["abc", "loans", "users-by-role", scopeKey(scope), role] as const,
  },
  payments: {
    all: ["abc", "payments"] as const,
    list: (
      scope: QueryScope | undefined,
      loanId: string,
      params: PaymentListParams = {},
    ) =>
      [
        "abc",
        "payments",
        "list",
        scopeKey(scope),
        loanId,
        compactParams(params),
      ] as const,
  },
  vouchers: {
    all: ["abc", "vouchers"] as const,
    list: (
      scope: QueryScope | undefined,
      loanId: string,
      params: VoucherListParams = {},
    ) =>
      [
        "abc",
        "vouchers",
        "list",
        scopeKey(scope),
        loanId,
        compactParams(params),
      ] as const,
  },
  transactions: {
    all: ["abc", "transactions"] as const,
    list: (
      scope: QueryScope | undefined,
      loanId: string,
      params: TransactionListParams = {},
    ) =>
      [
        "abc",
        "transactions",
        "list",
        scopeKey(scope),
        loanId,
        compactParams(params),
      ] as const,
  },
  notifications: {
    all: ["abc", "notifications"] as const,
    list: (scope: QueryScope | undefined, params: NotificationsParams) =>
      [
        "abc",
        "notifications",
        "list",
        scopeKey(scope),
        compactParams(params),
      ] as const,
    unreadCount: (scope?: QueryScope) =>
      ["abc", "notifications", "unread-count", scopeKey(scope)] as const,
  },
  profile: {
    me: (scope?: QueryScope) =>
      ["abc", "profile", "me", scopeKey(scope)] as const,
  },
  users: {
    accessRequests: (scope?: QueryScope, params?: Record<string, unknown>) =>
      [
        "abc",
        "users",
        "access-requests",
        scopeKey(scope),
        ...(params ? [compactParams(params)] : []),
      ] as const,
    all: ["abc", "users"] as const,
    list: (scope?: QueryScope, params?: Record<string, unknown>) =>
      [
        "abc",
        "users",
        "list",
        scopeKey(scope),
        ...(params ? [compactParams(params)] : []),
      ] as const,
  },
};
