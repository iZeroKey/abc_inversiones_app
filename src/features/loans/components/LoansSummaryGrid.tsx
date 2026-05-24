import {
  AlertCircleIcon,
  BanknoteIcon,
  CalendarClockIcon,
  FileTextIcon,
  LandmarkIcon,
  TrendingUpIcon,
} from "lucide-react"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { SummaryMetricCard } from "@/features/loans/components/LoanMetricBits"
import { getLoanPaidAmount, toNumber } from "@/features/loans/loan-utils"
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
      <SummaryMetricCard icon={FileTextIcon} label="Total" value={<AnimatedNumber value={totalLoans} />} detail="Préstamos" />
      <SummaryMetricCard icon={TrendingUpIcon} label="Activos" value={<AnimatedNumber value={activeLoans} />} detail="En cronograma" />
      <SummaryMetricCard icon={LandmarkIcon} label="Deuda" value={<AnimatedNumber value={debt} isCurrency />} detail="Cartera total" />
      <SummaryMetricCard icon={BanknoteIcon} label="Pagado" value={<AnimatedNumber value={paid} isCurrency />} detail="Capital cobrado" />
      <SummaryMetricCard icon={CalendarClockIcon} label="Próximo pago" value={<AnimatedNumber value={nextPayment} isCurrency />} detail="Según rol" />
      <SummaryMetricCard icon={AlertCircleIcon} label="Vencidos" value={<AnimatedNumber value={overdue} />} detail="Requieren atención" />
    </div>
  )
}
