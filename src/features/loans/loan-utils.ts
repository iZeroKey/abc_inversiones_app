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
