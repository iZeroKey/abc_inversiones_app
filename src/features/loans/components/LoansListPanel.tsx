import {
    AlertCircleIcon,
    CalendarIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    HourglassIcon,
    RefreshCwIcon,
    SearchIcon,
    XCircleIcon,
    type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { ResponsivePagination } from "@/components/ResponsivePagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { LoanStatusBadge } from "@/features/loans/components/LoanBadges"
import {
    EmptyLoanList,
    ErrorState,
    LoanListSkeleton,
} from "@/features/loans/components/LoanPageStates"
import { frequencyLabels, statusFilters } from "@/features/loans/loan-constants"
import {
    formatDate,
    getLoanCardFooterIcon,
    getLoanCardFooterText,
    getLoanCardSecondaryLabel,
    getLoanCardSecondaryValue,
    getLoanCardTitle,
    getLoanProgress,
    getLoanStatusColor,
    getStatusGroup,
    loanPublicCode,
    normalizeStatus,
    toNumber,
} from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { Loan, LoanStatus, PaginationMeta } from "@/types/loans"

const statusIconMap: Record<string, LucideIcon> = {
  calendar: CalendarIcon,
  hourglass: HourglassIcon,
  check: CheckCircleIcon,
  alert: AlertCircleIcon,
  x: XCircleIcon,
}

export function LoansListPanel({
  loans,
  highlightedLoanIds,
  selectedLoan,
  pagination,
  page,
  statusFilter,
  searchQuery,
  loading,
  isFetching,
  error,
  emptyMessage,
  onRetry,
  onSelectLoan,
  onPageChange,
  onStatusFilterChange,
  onSearchQueryChange,
  perspective = "admin",
  variant = "cards",
}: {
  loans: Loan[]
  highlightedLoanIds?: Set<string>
  selectedLoan: Loan | null
  pagination: PaginationMeta
  page: number
  statusFilter: "all" | LoanStatus
  searchQuery: string
  loading: boolean
  isFetching?: boolean
  error: string | null
  emptyMessage: string
  onRetry: () => void
  onSelectLoan: (loan: Loan) => void
  onPageChange: (page: number) => void
  onStatusFilterChange: (status: "all" | LoanStatus) => void
  onSearchQueryChange: (query: string) => void
  perspective?: "admin" | "client" | "investor"
  variant?: "cards" | "rows"
}) {
  const totalPages = Math.max(pagination.totalPages ?? 1, 1)

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar por código, cliente o monto"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </InputGroup>

        <ScrollArea className="h-10 min-w-0" scrollFade>
          <div className="flex w-max items-center gap-2 px-0.5 py-0.5 pr-2">
            {statusFilters.map((status) => (
              <Button
                key={status.value}
                variant={statusFilter === status.value ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusFilterChange(status.value)}
                className="shrink-0 rounded-full px-3"
              >
                {status.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {perspective === "investor" ? "Inversiones" : "Préstamos"}
          {isFetching && <Spinner className="size-4" />}
        </h2>
        <p className="text-sm text-muted-foreground">
          {pagination.total ?? loans.length} encontrados
        </p>
      </div>

      {loading ? (
        <LoanListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loans.length === 0 ? (
        <EmptyLoanList 
          title={perspective === "investor" ? "No hay inversiones" : "No hay préstamos"}
          message={emptyMessage} 
        />
      ) : (
        <div className={cn("transition-opacity duration-200", isFetching && "opacity-50 pointer-events-none")}>
          {variant === "cards" ? (
            <div className="grid gap-3 md:grid-cols-2">
          {loans.map((loan) => (
            <LoanCardRow
              key={loan.id}
              loan={loan}
              isNew={highlightedLoanIds?.has(loan.id) ?? false}
              selected={loan.id === selectedLoan?.id}
              onSelect={onSelectLoan}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col divide-y border-y">
          {loans.map((loan) => (
            <LoanRow
              key={loan.id}
              loan={loan}
              isNew={highlightedLoanIds?.has(loan.id) ?? false}
              selected={loan.id === selectedLoan?.id}
              perspective={perspective}
              onSelect={onSelectLoan}
            />
          ))}
        </div>
      )}
        </div>
      )}

      {!loading && !error && (
        <ResponsivePagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

function LoanCardRow({
  loan,
  isNew,
  selected,
  onSelect,
}: {
  loan: Loan
  isNew: boolean
  selected: boolean
  onSelect: (loan: Loan) => void
}) {
  const status = normalizeStatus(loan)
  const group = getStatusGroup(status)
  const progress = group === "active" || group === "defaulted" ? Math.round(loan.progress ?? getLoanProgress(loan)) : 0
  const showProgress = group === "active" || group === "defaulted"
  const hasRightFooter = group === "active" || group === "defaulted"
  const isPaid = group === "paid"
  const borderColor = isPaid ? "border-l-muted-foreground/20" : getLoanStatusColor(status)

  function getNextPaymentDate() {
    if (group !== "active" && group !== "defaulted") return null
    if (!loan.nextInstallment?.dueDate) return null
    return formatDate(loan.nextInstallment.dueDate)
  }

  const showNextPaymentDate = getNextPaymentDate()

  return (
    <button
      type="button"
      className={cn(
        "relative flex w-full flex-col rounded-2xl bg-card text-left shadow-xs/5",
        "border-l-4",
        borderColor,
        isNew && "realtime-row-enter",
        selected && "bg-accent/30",
        isPaid && "text-muted-foreground",
      )}
      onClick={() => onSelect(loan)}
    >
      {/* Top row: ID + code + badge */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-xs font-semibold text-[#D2D2DE]">ID</span>
          <span className="truncate font-mono text-sm font-semibold text-[#00236F]">
            #{loanPublicCode(loan)}
          </span>
        </div>
        <LoanStatusBadge status={status} size="default" className={cn(isPaid && "opacity-60")} />
      </div>

      {/* Loan name */}
      <p className="mt-2 truncate px-4 text-xl font-semibold text-foreground">
        {loan.name ?? `Préstamo #${loanPublicCode(loan)}`}
      </p>

      {/* Two-column content */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 px-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{getLoanCardTitle(loan)}</p>
          <p className="mt-0.5 font-semibold tabular-nums">
            <AnimatedNumber value={toNumber(loan.principal)} isCurrency />
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{getLoanCardSecondaryLabel(loan)}</p>
          <p className="mt-0.5 font-semibold">
            {typeof getLoanCardSecondaryValue(loan) === "number" ? (
              <span className="tabular-nums">
                <AnimatedNumber value={getLoanCardSecondaryValue(loan) as number} isCurrency />
              </span>
            ) : (
              <span className="text-muted-foreground">{getLoanCardSecondaryValue(loan) as string}</span>
            )}
          </p>
        </div>
      </div>

      {/* Progress bar (active / defaulted only) — no label, no percentage text */}
      {showProgress && (
        <div className="mt-3 px-4">
          <Progress value={progress}>
            <ProgressTrack>
              <ProgressIndicator
                className={cn(
                  "transition-all duration-500",
                  isPaid ? "bg-muted-foreground/30" : group === "defaulted" ? "bg-destructive" : "bg-primary",
                )}
              />
            </ProgressTrack>
          </Progress>
        </div>
      )}

      {/* Footer with status icon and text — two columns */}
      <div className="flex-1" />
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 px-4 pb-4">
        <div className={cn("flex items-center gap-2 min-w-0", !hasRightFooter && "col-span-2")}>
          <FooterIcon status={status} group={group} />
          <span className="text-xs font-medium text-muted-foreground">
            {showNextPaymentDate
              ? `Próx: ${showNextPaymentDate}`
              : getLoanCardFooterText(status)}
          </span>
        </div>
        {hasRightFooter && (
          <div className="flex items-center justify-end">
            <span className="text-xs font-medium text-muted-foreground">
              {progress}% pagado
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

function FooterIcon({ status, group }: { status: string; group: string }) {
  const iconName = getLoanCardFooterIcon(status)
  const Icon = statusIconMap[iconName]

  const iconColor =
    group === "paid"
      ? "text-muted-foreground"
      : group === "active"
        ? "text-success"
        : group === "pending"
          ? "text-warning"
          : group === "defaulted"
            ? "text-destructive"
            : "text-muted-foreground"

  if (!Icon) return null
  return <Icon className={cn("size-3.5 shrink-0", iconColor)} />
}

/* ---- Legacy row variant (kept for admin "rows" view) ---- */

function LoanRow({
  loan,
  isNew,
  selected,
  perspective,
  onSelect,
}: {
  loan: Loan
  isNew: boolean
  selected: boolean
  perspective: "admin" | "client" | "investor"
  onSelect: (loan: Loan) => void
}) {
  const progress = getLoanProgress(loan)
  const title =
    perspective === "client"
      ? "Préstamo con ABC Inversiones"
      : `Préstamo de ${loanClientName(loan)}`
  const date = formatDate(loan.startDate ?? loan.createdAt)

  return (
    <button
      type="button"
      className={cn(
        "group relative flex w-full flex-col gap-3 px-1 py-4 pr-10 text-left transition-colors hover:bg-muted/40 md:px-0 md:pr-12",
        isNew && "realtime-row-enter",
        selected && "bg-accent/60",
      )}
      onClick={() => onSelect(loan)}
    >
      <span className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate font-semibold leading-tight">{title}</h3>
            <LoanStatusBadge status={normalizeStatus(loan)} />
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            <span className="font-mono">{loanPublicCode(loan)}</span>
            <span className="px-1.5">-</span>
            <span>{date}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-semibold tabular-nums"><AnimatedNumber value={loan.principal} isCurrency /></div>
          <p className="text-xs text-muted-foreground">principal</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <LoanTinyMetric label="Deuda" value={<AnimatedNumber value={loan.totalDebt} isCurrency />} />
        <LoanTinyMetric label="Restante" value={<AnimatedNumber value={getRemainingDebt(loan)} isCurrency />} />
        <LoanTinyMetric label="Cuotas" value={<AnimatedNumber value={loan.installmentsCount} />} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Avance de pago</span>
          <span><AnimatedNumber value={progress} decimals={0} suffix="%" /></span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{frequencyLabels[String(loan.frequency)] ?? loan.frequency ?? "Frecuencia"}</Badge>
        <Badge variant="outline">{loanInvestorName(loan)}</Badge>
      </div>

      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground md:right-0">
        <span className="hidden sm:inline">Ver detalle</span>
        <ChevronRightIcon />
      </div>
    </button>
  )
}

function LoanTinyMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 border-l pl-3 first:border-l-0 first:pl-0">
      <p className="truncate font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  )
}

function loanClientName(loan: Loan) {
  return loan.clientName ?? "Cliente"
}

function loanInvestorName(loan: Loan) {
  return loan.investorName ?? "Inversor"
}

function getRemainingDebt(loan: Loan) {
  return Math.max(toNumber(loan.totalDebt) - toNumber(loan.totalPaid), 0)
}

export function RefreshButton({
  loading,
  onClick,
}: {
  loading: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={loading}
      aria-label="Actualizar préstamos"
      title="Actualizar"
    >
      {loading ? <Spinner /> : <RefreshCwIcon />}
    </Button>
  )
}
