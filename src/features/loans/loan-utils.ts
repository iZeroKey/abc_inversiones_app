import { formatCurrencyPrecise } from "@/lib/formatters";
import type { Installment, Loan, RelatedUser } from "@/types/loans";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function toNumber(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return 0;
  const numericValue =
    typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

export function getInstallmentsPaidAmount(installments: Installment[] = []) {
  return installments.reduce(
    (total, installment) => total + toNumber(installment.paidAmount),
    0,
  );
}

export function getInstallmentDisplayStatus(installment: Installment) {
  const amount = toNumber(installment.amount);
  const paidAmount = toNumber(installment.paidAmount);

  if (installment.status !== "paid" && paidAmount > 0 && paidAmount < amount) {
    return "partial";
  }

  return installment.status ?? "pending";
}

export function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function personName(
  person?: RelatedUser | null,
  fallback?: string | null,
) {
  const composed = [person?.firstName, person?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return composed || person?.email || fallback || "Sin asignar";
}

export function publicUserCode(user?: RelatedUser | null) {
  return user?.publicCode || "Sin código";
}

export function loanPublicCode(loan?: Loan | null) {
  return loan?.publicCode || "Sin código";
}

export function loanClientName(loan: Loan) {
  return loan.clientName || personName(loan.client);
}

export function loanInvestorName(loan: Loan) {
  return loan.investorName || personName(loan.investor, "ABC Inversiones");
}

export function getLoanPaidAmount(
  loan: Loan,
  installments: Installment[] = [],
) {
  const totalPaid = toNumber(loan.totalPaid);
  const installmentsPaid = getInstallmentsPaidAmount(installments);
  return totalPaid > 0 ? totalPaid : installmentsPaid;
}

export function getLoanProgress(loan: Loan, installments: Installment[] = []) {
  const totalDebt = toNumber(loan.totalDebt);
  if (totalDebt <= 0) return 0;
  return clampPercent(
    (getLoanPaidAmount(loan, installments) / totalDebt) * 100,
  );
}

export function getRemainingDebt(loan: Loan, installments: Installment[] = []) {
  return Math.max(
    toNumber(loan.totalDebt) - getLoanPaidAmount(loan, installments),
    0,
  );
}

export type VisibleInstallmentsResult = {
  visible: Installment[];
  total: number;
  hasMore: boolean;
  beforeCount: number;
  afterCount: number;
};

export function getVisibleInstallments(
  installments: Installment[],
): VisibleInstallmentsResult {
  const maxVisible = 3;
  const total = installments.length;

  if (total === 0)
    return {
      visible: [],
      total: 0,
      hasMore: false,
      beforeCount: 0,
      afterCount: 0,
    };

  const sorted = [...installments].sort((a, b) => {
    const aNum = a.installmentNumber ?? a.number ?? 0;
    const bNum = b.installmentNumber ?? b.number ?? 0;
    return aNum - bNum;
  });

  if (total <= maxVisible) {
    return {
      visible: sorted,
      total,
      hasMore: false,
      beforeCount: 0,
      afterCount: 0,
    };
  }

  const nextIndex = sorted.findIndex(
    (inst) => getInstallmentDisplayStatus(inst) !== "paid",
  );

  let start: number;
  let end: number;

  if (nextIndex === -1) {
    end = total;
    start = Math.max(0, end - maxVisible);
  } else if (nextIndex === 0) {
    start = 0;
    end = Math.min(maxVisible, total);
  } else if (nextIndex === total - 1) {
    end = total;
    start = Math.max(0, end - maxVisible);
  } else {
    start = nextIndex - 1;
    end = Math.min(start + maxVisible, total);
  }

  return {
    visible: sorted.slice(start, end),
    total,
    hasMore: total > end - start,
    beforeCount: start,
    afterCount: total - end,
  };
}

export function getNextInstallment(installments: Installment[]) {
  return installments
    .filter((installment) => installment.status !== "paid")
    .toSorted((a, b) => {
      const firstDate = new Date(a.dueDate ?? "").getTime();
      const secondDate = new Date(b.dueDate ?? "").getTime();
      return (
        (Number.isFinite(firstDate) ? firstDate : 0) -
        (Number.isFinite(secondDate) ? secondDate : 0)
      );
    })[0];
}

export function hasOverdueInstallments(installments: Installment[]) {
  return installments.some((installment) => installment.status === "overdue");
}

export function normalizeStatus(loan: Loan, installments: Installment[] = []) {
  if (loan.status === "defaulted" || hasOverdueInstallments(installments))
    return "defaulted";
  return loan.status || "pending";
}

export function formatPreciseCurrencyWithSymbol(
  value: string | number | undefined | null,
) {
  return `S/ ${formatCurrencyPrecise(toNumber(value))}`;
}

function createAmountSearchTokens(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return [];

  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return [];

  const fixed = amount.toFixed(2);
  const whole = fixed.replace(/\.00$/, "");
  const formatted = formatCurrencyPrecise(amount);
  const formattedWithoutThousands = formatted.replace(/,/g, "");
  const compactFormatted = formatted.replace(/[,\s]/g, "");

  return Array.from(
    new Set(
      [
        String(value),
        fixed,
        whole,
        formatted,
        formattedWithoutThousands,
        compactFormatted,
        `S/ ${fixed}`,
        `S/${fixed}`,
        `S/ ${formatted}`,
        `S/${formatted}`,
        `S/ ${formattedWithoutThousands}`,
        `S/${formattedWithoutThousands}`,
      ].filter(Boolean),
    ),
  );
}

export function createLoanSearchText(loan: Loan) {
  return [
    loan.publicCode,
    loan.clientCode,
    loan.investorCode,
    loanClientName(loan),
    loanInvestorName(loan),
    ...createAmountSearchTokens(loan.principal),
    ...createAmountSearchTokens(loan.totalDebt),
    ...createAmountSearchTokens(getRemainingDebt(loan)),
    ...createAmountSearchTokens(getLoanPaidAmount(loan)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getStatusGroup(status: string) {
  if (isPendingStatus(status)) return "pending" as const;
  return status as "active" | "paid" | "defaulted" | "rejected";
}

function isPendingStatus(status: string) {
  return [
    "pending",
    "pending_investor_review",
    "pending_admin_review",
    "approved",
    "draft",
  ].includes(status);
}

export function isPaidOrPending(status: string) {
  return status === "paid" || isPendingStatus(status);
}

export function getLoanStatusColor(status: string) {
  const group = getStatusGroup(status);
  const colors: Record<string, string> = {
    active: "border-l-success",
    pending: "border-l-warning",
    paid: "border-l-muted-foreground/20",
    defaulted: "border-l-destructive",
    rejected: "border-l-muted-foreground/40",
  };
  return colors[group] ?? "border-l-muted-foreground/20";
}

export function getLoanStatusLabel(status: string) {
  const group = getStatusGroup(status);
  const labels: Record<string, string> = {
    active: "Activo",
    pending: "Pendiente",
    paid: "Pagado",
    defaulted: "Vencido",
    rejected: "Rechazado",
  };
  return labels[group] ?? status;
}

export function getLoanCardTitle(loan: Loan) {
  const group = getStatusGroup(loan.status ?? "");
  if (group === "pending" || group === "rejected") {
    return "Monto solicitado";
  }
  return "Principal";
}

export function getLoanCardSecondaryLabel(loan: Loan) {
  const group = getStatusGroup(loan.status ?? "");
  if (group === "paid") return "Fecha fin";
  if (group === "pending") return "Fecha solicitud";
  if (group === "rejected") return "Fecha rechazo";
  return "Saldo pendiente";
}

export function getLoanCardSecondaryValue(loan: Loan) {
  const group = getStatusGroup(loan.status ?? "");
  if (group === "paid") return formatDate(loan.endDate);
  if (group === "pending") return formatDate(loan.startDate ?? loan.createdAt);
  if (group === "rejected")
    return formatDate(loan.rejectedAt ?? loan.updatedAt);
  return getRemainingDebt(loan);
}

export function getLoanCardFooterIcon(status: string) {
  const group = getStatusGroup(status);
  const icons: Record<string, string> = {
    active: "calendar",
    pending: "hourglass",
    paid: "check",
    defaulted: "alert",
    rejected: "x",
  };
  return icons[group] ?? "";
}

export function getLoanCardFooterText(status: string) {
  const group = getStatusGroup(status);
  const texts: Record<string, string> = {
    active: "Próximo pago",
    pending: "Pendiente de revisión",
    paid: "Préstamo pagado",
    defaulted: "Cuota(s) vencida(s)",
    rejected: "Solicitud rechazada",
  };
  return texts[group] ?? "";
}

export function normalizeStatusFilter(status: string) {
  if (isPendingStatus(status)) return "pending";
  return status;
}
