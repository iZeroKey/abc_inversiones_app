import {
    CalendarClockIcon,
    ChevronRightIcon,
    UploadIcon,
} from "lucide-react"
import type { ElementType, ReactNode } from "react"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { frequencyLabels, interestPeriodLabels } from "@/features/loans/loan-constants"
import { formatDate } from "@/features/loans/loan-utils"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import iconAbc from "@/assets/icon-abc.png"

export function AmountBlock({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-xl border bg-muted/35 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}

export function InfoRow({
  icon: Icon,
  avatar,
  label,
  value,
  onClick,
}: {
  icon?: ElementType
  avatar?: { src?: string | null; initials: string; name?: string } | null
  label: string
  value: ReactNode
  onClick?: () => void
}) {
  const isAbc = avatar?.name === "ABC Inversiones" || avatar?.name === "ABC INVERSIONES";
  const finalAvatarUrl = isAbc ? iconAbc : avatar?.src;

  const content = (
    <>
      {avatar ? (
        <Avatar className="size-10 rounded-xl shrink-0">
          {finalAvatarUrl ? <AvatarImage src={finalAvatarUrl} alt="" className="object-cover" /> : null}
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-medium">{avatar.initials}</AvatarFallback>
        </Avatar>
      ) : Icon ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="min-w-0 text-left">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className="flex items-center gap-3 w-full cursor-pointer text-left focus:outline-none hover:bg-muted/50 rounded-xl transition-colors p-1 -ml-1 group"
        onClick={onClick}
      >
        {content}
        <ChevronRightIcon className="ml-auto size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {content}
    </div>
  )
}

export function SummaryMetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ElementType
  label: string
  value: ReactNode
  detail: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-bold tabular-nums tracking-normal">{value}</div>
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function NextPaymentHero({
  amount,
  dueDate,
  canSubmitVoucher,
  onSubmitVoucher,
  intent = "default",
}: {
  amount?: string | number | null
  dueDate?: string | null
  canSubmitVoucher: boolean
  onSubmitVoucher: () => void
  intent?: "hero" | "default"
}) {
  if (intent === "hero") {
    return (
      <div className="rounded-2xl bg-primary text-primary-foreground overflow-hidden">
        <div className="p-6 flex flex-col items-center text-center gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              {dueDate ? "Próximo pago" : "Estado del préstamo"}
            </p>
            {dueDate ? (
              <p className="mt-2 text-3xl font-black tracking-tight">
                <AnimatedNumber value={amount} isCurrency />
              </p>
            ) : (
              <p className="mt-3 text-lg font-semibold opacity-80">Sin cuota pendiente</p>
            )}
            {dueDate && (
              <div className="mt-2 flex items-center justify-center gap-2 text-sm opacity-70">
                <CalendarClockIcon className="size-4" />
                <span className="font-medium">Vence {formatDate(dueDate)}</span>
              </div>
            )}
          </div>
          {canSubmitVoucher && (
            <Button
              size="sm"
              className="bg-white text-primary hover:bg-white/90 rounded-xl px-6"
              onClick={onSubmitVoucher}
            >
              <UploadIcon className="size-4" />
              Subir voucher
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próximo pago</p>
      {dueDate ? (
        <>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            <AnimatedNumber value={amount} isCurrency />
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClockIcon className="size-3.5" />
            vence {formatDate(dueDate)}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Sin cuota pendiente</p>
      )}
    </div>
  )
}

export function LoanSummaryBar({
  totalDebt,
  paidAmount,
  progress,
  accent = "success",
}: {
  totalDebt: string | number
  paidAmount: string | number
  progress: number
  accent?: "success" | "warning" | "destructive" | "muted"
}) {
  const progressColors: Record<string, string> = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    muted: "bg-muted-foreground/30",
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Progreso de pago</p>
        <span className={`text-sm font-bold tabular-nums ${progressColors[accent].replace("bg-", "text-")}`}>
          <AnimatedNumber value={progress} decimals={0} suffix="%" />
        </span>
      </div>
      <div className="mt-2 h-2.5 flex-1 rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${progressColors[accent]}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span>Pagado <AnimatedNumber value={paidAmount} isCurrency /></span>
        <span>Total <AnimatedNumber value={totalDebt} isCurrency /></span>
      </div>
    </div>
  )
}

export function LoanConditions({
  principal,
  installmentsCount,
  frequency,
  interestRate,
  interestPeriod,
  startDate,
}: {
  principal?: string | number | null
  installmentsCount?: number | null
  frequency?: string | null
  interestRate?: string | number | null
  interestPeriod?: string | null
  startDate?: string | null
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condiciones del préstamo</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Capital</span>
          <span className="font-semibold tabular-nums"><AnimatedNumber value={principal} isCurrency /></span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Cuotas</span>
          <span className="font-semibold">{installmentsCount ?? <span className="text-muted-foreground/30 select-none">—</span>} · {frequencyLabels[String(frequency)] ?? frequency ?? <span className="text-muted-foreground/30 select-none">—</span>}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Tasa</span>
          <span className="font-semibold tabular-nums"><AnimatedNumber value={interestRate ?? 0} decimals={1} suffix="%" /> {interestPeriodLabels[String(interestPeriod)] ?? ""}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Inicio</span>
          <span className="font-semibold">{formatDate(startDate)}</span>
        </div>
      </div>
    </div>
  )
}
