import { formatCurrencyPrecise } from "@/lib/formatters"
import type { Installment, Loan, RelatedUser } from "@/types/loans"

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function toNumber(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return 0
  const numericValue = typeof value === "string" ? Number.parseFloat(value) : value
  return Number.isFinite(numericValue) ? numericValue : 0
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 100)
}

export function formatDate(value?: string | null) {
  if (!value) return "Sin fecha"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin fecha"

  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function personName(person?: RelatedUser | null, fallback?: string | null) {
  const composed = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim()
  return composed || person?.email || fallback || "Sin asignar"
}

export function publicUserCode(user?: RelatedUser | null) {
  return user?.publicCode || "Sin código"
}

export function loanPublicCode(loan?: Loan | null) {
  return loan?.publicCode || "Sin código"
}

export function loanClientName(loan: Loan) {
  return loan.clientName || personName(loan.client)
}

export function loanInvestorName(loan: Loan) {
  return loan.investorName || personName(loan.investor, "ABC Inversiones")
}

export function getLoanProgress(loan: Loan) {
  const totalDebt = toNumber(loan.totalDebt)
  if (totalDebt <= 0) return 0
  return clampPercent((toNumber(loan.totalPaid) / totalDebt) * 100)
}

export function getRemainingDebt(loan: Loan) {
  return Math.max(toNumber(loan.totalDebt) - toNumber(loan.totalPaid), 0)
}

export function getNextInstallment(installments: Installment[]) {
  return installments
    .filter((installment) => installment.status !== "paid")
    .toSorted((a, b) => {
      const firstDate = new Date(a.dueDate ?? "").getTime()
      const secondDate = new Date(b.dueDate ?? "").getTime()
      return (Number.isFinite(firstDate) ? firstDate : 0) - (Number.isFinite(secondDate) ? secondDate : 0)
    })[0]
}

export function hasOverdueInstallments(installments: Installment[]) {
  return installments.some((installment) => installment.status === "overdue")
}

export function normalizeStatus(loan: Loan, installments: Installment[] = []) {
  if (loan.status === "defaulted" || hasOverdueInstallments(installments)) return "defaulted"
  return loan.status || "pending"
}

export function formatPreciseCurrencyWithSymbol(value: string | number | undefined | null) {
  return `S/ ${formatCurrencyPrecise(toNumber(value))}`
}

export function createLoanSearchText(loan: Loan) {
  return [
    loan.publicCode,
    loan.clientCode,
    loan.investorCode,
    loanClientName(loan),
    loanInvestorName(loan),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}
