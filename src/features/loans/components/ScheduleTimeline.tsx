import { AlertCircleIcon, ArrowRightIcon, CheckIcon, ClockIcon } from "lucide-react"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { InstallmentBadge } from "@/features/loans/components/LoanBadges"
import {
  CompactEmpty,
  relatedEmptyIcons,
} from "@/features/loans/components/LoanPageStates"
import {
  formatDate,
  getInstallmentDisplayStatus,
  toNumber,
} from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { Installment } from "@/types/loans"

function getDaysInfo(installment: Installment) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const dueDate = new Date(installment.dueDate ?? "")
  dueDate.setHours(0, 0, 0, 0)
  const diffTime = dueDate.getTime() - now.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  const displayStatus = getInstallmentDisplayStatus(installment)

  if (displayStatus === "paid") {
    if (installment.paymentDate) return `Pagado el ${formatDate(installment.paymentDate)}`
    return "Pagado"
  }
  if (diffDays < 0) return `Vencido hace ${Math.abs(diffDays)} días`
  if (diffDays === 0) return "Vence hoy"
  if (diffDays === 1) return "Vence mañana"
  return `Faltan ${diffDays} días`
}

function getDotVisual(status: string, isNext: boolean, number: number) {
  if (status === "paid")
    return {
      wrapper: "bg-emerald-100 border-white shadow-sm",
      icon: <CheckIcon className="size-4 text-emerald-600" />,
    }
  if (status === "partial")
    return {
      wrapper: "bg-amber-100 border-white shadow-sm",
      icon: <ClockIcon className="size-4 text-amber-600" />,
    }
  if (status === "overdue")
    return {
      wrapper: "bg-red-100 border-white shadow-sm",
      icon: <AlertCircleIcon className="size-4 text-red-600" />,
    }
  if (isNext)
    return {
      wrapper: "bg-neutral-200 border-primary shadow-sm",
      icon: <ArrowRightIcon className="size-4 text-primary" />,
    }
  return {
    wrapper: "bg-neutral-100 border-neutral-200",
    icon: (
      <span className="text-[11px] font-semibold tabular-nums text-neutral-500">
        {number}
      </span>
    ),
  }
}

function StatusProgress({
  paid,
  total,
}: {
  paid: number
  total: number
}) {
  const percentage = total > 0 ? Math.min((paid / total) * 100, 100) : 0

  return (
    <div className="mt-3 space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-success transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <AnimatedNumber value={paid} isCurrency />
        <AnimatedNumber value={total} isCurrency />
      </div>
    </div>
  )
}

export function ScheduleTimeline({ installments }: { installments: Installment[] }) {
  if (installments.length === 0) {
    return (
      <CompactEmpty
        icon={relatedEmptyIcons.schedule}
        title="Sin cronograma"
        description="Aún no hay cuotas para este préstamo."
      />
    )
  }

  const nextIndex = installments.findIndex(
    (inst) => getInstallmentDisplayStatus(inst) !== "paid",
  )

  return (
    <div className="flex flex-col gap-6">
      {installments.map((installment, idx) => {
        const status = getInstallmentDisplayStatus(installment)
        const isNext = idx === nextIndex
        const isPaid = status === "paid"
        const isOverdue = status === "overdue"
        const isPartial = status === "partial"
        const isPending = !isPaid && !isOverdue && !isPartial
        const hasLine = idx < installments.length - 1
        const showDetails = isNext
        const instNumber = installment.installmentNumber ?? installment.number ?? idx + 1
        const dot = getDotVisual(status, isNext, instNumber)
        const amount = toNumber(installment.amount)
        const paid = toNumber(installment.paidAmount)
        const pending = Math.max(amount - paid, 0)
        const percentage = amount > 0 ? Math.min((paid / amount) * 100, 100) : 0

        const cardStyle = isNext
          ? "bg-card shadow-xs/5 border-l-4 border-l-primary"
          : isPaid
            ? "bg-muted/5 border border-border/40"
            : status === "overdue"
              ? "bg-card border border-destructive/20"
              : "border border-dashed border-muted-foreground/20"

        return (
          <div key={installment.id} className="relative flex gap-4">
            {hasLine && (
              <div className="absolute left-[15px] top-[24px] bottom-[-48px] w-[2px] bg-border/40" />
            )}

            <div className={cn("relative z-10 flex shrink-0 items-start", isPending ? "pt-[12px]" : "pt-[8px]")}>
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2",
                  dot.wrapper,
                )}
              >
                {dot.icon}
              </div>
            </div>

            <div className={cn("min-w-0 flex-1 rounded-2xl p-4 transition-all duration-200", cardStyle)}>

              <div className={cn(isNext ? "pl-0" : "")}>
                {!isPending && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Cuota #{instNumber}
                    </span>
                    <InstallmentBadge status={status} />
                  </div>
                )}

                <div className={cn("flex items-center justify-between gap-4", !isPending && "mt-2")}>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-base font-medium",
                        status === "overdue"
                          ? "text-destructive"
                          : isPaid
                            ? "text-muted-foreground"
                            : isNext
                              ? "text-primary font-semibold"
                              : "text-muted-foreground",
                      )}
                    >
                      {formatDate(installment.dueDate)}
                    </div>

                  </div>
                  <span
                    className={cn(
                      "whitespace-nowrap text-xl font-bold tabular-nums tracking-tight",
                      isPaid
                        ? "text-foreground/70"
                        : status === "overdue"
                          ? "text-destructive"
                          : isPending
                            ? "text-muted-foreground"
                            : "text-foreground",
                    )}
                  >
                    <AnimatedNumber value={amount} isCurrency />
                  </span>
                </div>

                {showDetails && (
                  <>
                    <StatusProgress paid={paid} total={amount} />

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          status === "overdue"
                            ? "text-destructive"
                            : isNext
                              ? "text-primary"
                              : "text-muted-foreground",
                        )}
                      >
                        {getDaysInfo(installment)}
                      </span>
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {status === "partial" ? (
                          <span className="font-medium tabular-nums text-warning">
                            {Math.round(percentage)}% ·{" "}
                            <AnimatedNumber value={pending} isCurrency /> rest.
                          </span>
                        ) : status === "overdue" ? (
                          <span className="font-medium tabular-nums text-destructive">
                            <AnimatedNumber value={pending} isCurrency /> vencido
                          </span>
                        ) : (
                          <span className="font-medium tabular-nums text-primary">
                            {Math.round(percentage)}% · Pendiente
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
