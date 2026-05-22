import {
  AlertCircleIcon,
  BanknoteIcon,
  CalendarClockIcon,
  FileTextIcon,
  LandmarkIcon,
  TrendingUpIcon,
} from "lucide-react"

import { SummaryMetricCard } from "@/features/loans/components/LoanMetricBits"
import { getLoanPaidAmount, toNumber } from "@/features/loans/loan-utils"
import { formatCurrency } from "@/lib/formatters"
import type { Loan, LoanSummary } from "@/types/loans"

export function LoansSummaryGrid({
  summary,
  loans,
}: {
  summary: LoanSummary
  loans: Loan[]
}) {
  const totalLoans = summary.totalLoans ?? summary.total ?? loans.length
  const activeLoans =
    summary.activeLoans ?? summary.active ?? loans.filter((loan) => loan.status === "active").length
  const debt =
    summary.totalDebt ?? summary.debt ?? loans.reduce((total, loan) => total + toNumber(loan.totalDebt), 0)
  const paidFromLoans = loans.reduce((total, loan) => total + getLoanPaidAmount(loan), 0)
  const paid = Math.max(toNumber(summary.totalPaid ?? summary.paidAmount), paidFromLoans)
  const overdue =
    summary.overduePayments ??
    summary.overdueLoans ??
    summary.defaultedLoans ??
    summary.defaulted ??
    loans.filter((loan) => loan.status === "defaulted").length
  const nextPayment = typeof summary.nextPayment === "object" ? summary.nextPayment?.amount : summary.nextPayment

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <SummaryMetricCard icon={FileTextIcon} label="Total" value={totalLoans} detail="Préstamos" />
      <SummaryMetricCard icon={TrendingUpIcon} label="Activos" value={activeLoans} detail="En cronograma" />
      <SummaryMetricCard icon={LandmarkIcon} label="Deuda" value={formatCurrency(debt)} detail="Cartera total" />
      <SummaryMetricCard icon={BanknoteIcon} label="Pagado" value={formatCurrency(paid)} detail="Capital cobrado" />
      <SummaryMetricCard icon={CalendarClockIcon} label="Próximo pago" value={formatCurrency(nextPayment)} detail="Según rol" />
      <SummaryMetricCard icon={AlertCircleIcon} label="Vencidos" value={overdue} detail="Requieren atención" />
    </div>
  )
}
