import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toNumber } from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { LoanSummary } from "@/types/loans"

function extractNextPayment(summary: LoanSummary) {
  const raw = summary.nextPayment
  if (!raw) return null
  if (typeof raw === "object" && "dueDate" in raw) {
    return { date: (raw as { dueDate?: string }).dueDate, amount: (raw as { amount?: string | number }).amount }
  }
  if (typeof raw === "object" && "date" in raw) {
    return { date: (raw as { date?: string }).date, amount: (raw as { amount?: string | number }).amount }
  }
  return null
}

function getTotalDebt(summary: LoanSummary) {
  const stats = (summary as Record<string, unknown>).stats as Record<string, unknown> | undefined
  if (stats?.totalDebt) return toNumber(stats.totalDebt as string | number | null | undefined)
  return toNumber(summary.totalDebt ?? summary.debt)
}

export function LoanSummaryCard({
  summary,
  loading,
  perspective = "client",
}: {
  summary?: LoanSummary | null
  loading?: boolean
  perspective?: "admin" | "investor" | "client"
}) {
  if (loading) return <LoanSummarySkeleton perspective={perspective} />

  if (!summary) return null

  const totalDebt = getTotalDebt(summary)
  const nextPayment = extractNextPayment(summary)

  function formatSummaryDate(dateStr?: string) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat("es-PE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d)
  }

  const stats = (summary as Record<string, unknown>).stats as Record<string, unknown> | undefined
  
  const extractValue = (keys: string[]) => {
    for (const key of keys) {
      if (stats?.[key] !== undefined) return stats[key]
      if ((summary as Record<string, unknown>)[key] !== undefined) return (summary as Record<string, unknown>)[key]
    }
    return undefined
  }

  const totalPaid = toNumber(extractValue(["totalPaid", "paidAmount", "totalReturn"]) as string | number | null | undefined)
  const activeLoans = Number(extractValue(["activeLoans", "active"])) || 0
  const paidLoans = Number(extractValue(["paidLoans", "paid"])) || 0

  if (perspective === "admin" || perspective === "investor") {
    return (
      <div className="rounded-2xl bg-card shadow-xs/5">
        <div className="grid grid-cols-2 gap-4 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Total a cobrar</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">
              <AnimatedNumber value={totalDebt} isCurrency />
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Total cobrado</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-500">
              <AnimatedNumber value={totalPaid} isCurrency />
            </p>
          </div>
        </div>

        <div className="px-4">
          <Separator className="w-full" />
        </div>

        <div className="grid grid-cols-2 gap-4 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Préstamos activos</p>
            <p className="mt-0.5 text-sm font-semibold">
              <AnimatedNumber value={activeLoans} />
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Préstamos pagados</p>
            <p className="mt-0.5 text-sm font-semibold">
              <AnimatedNumber value={paidLoans} />
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-card shadow-xs/5">
      <div className="p-4">
        <p className="text-xs font-medium text-muted-foreground">Deuda actual</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">
          <AnimatedNumber value={totalDebt} isCurrency />
        </p>
      </div>

      <div className="px-4">
        <Separator className="w-full" />
      </div>

      <div className={cn("grid grid-cols-2 gap-4 p-4", !nextPayment && "opacity-60")}>
        {nextPayment ? (
          <>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Próximo pago</p>
              <p className="mt-0.5 text-sm font-semibold">
                {formatSummaryDate(nextPayment.date) ?? "Fecha no disponible"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Monto a pagar</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-destructive">
                <AnimatedNumber value={toNumber(nextPayment.amount)} isCurrency />
              </p>
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Próximo pago</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Sin pagos programados</p>
          </div>
        )}
      </div>
    </div>
  )
}

function LoanSummarySkeleton({ perspective }: { perspective?: "admin" | "investor" | "client" }) {
  if (perspective === "admin" || perspective === "investor") {
    return (
      <div className="rounded-2xl bg-card shadow-xs/5">
        <div className="grid grid-cols-2 gap-4 p-4">
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1.5 h-7 w-32" />
          </div>
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1.5 h-7 w-32" />
          </div>
        </div>
        <div className="px-4">
          <div className="h-px bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-1.5 h-4 w-28" />
          </div>
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-1.5 h-4 w-28" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-card shadow-xs/5">
      <div className="p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-1.5 h-7 w-32" />
      </div>
      <div className="px-4">
        <div className="h-px bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-4 p-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-1.5 h-4 w-28" />
        </div>
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-1.5 h-4 w-28" />
        </div>
      </div>
    </div>
  )
}
