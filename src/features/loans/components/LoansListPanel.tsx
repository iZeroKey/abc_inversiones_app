import {
  ChevronRightIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import { Progress } from "@/components/ui/progress"
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
  getLoanProgress,
  getRemainingDebt,
  loanClientName,
  loanInvestorName,
  loanPublicCode,
  normalizeStatus,
} from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { Loan, LoanStatus, PaginationMeta } from "@/types/loans"

export function LoansListPanel({
  loans,
  highlightedLoanIds,
  selectedLoan,
  pagination,
  page,
  statusFilter,
  searchQuery,
  loading,
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
            placeholder="Buscar por código, cliente o inversionista"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </InputGroup>

        <ScrollArea className="h-9 w-full" scrollFade>
          <div className="flex w-max gap-2 px-0.5 pb-1">
            {statusFilters.map((status) => (
              <Button
                key={status.value}
                variant={statusFilter === status.value ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusFilterChange(status.value)}
                className="shrink-0"
              >
                {status.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-base font-semibold">Préstamos</h2>
        <p className="text-sm text-muted-foreground">
          {pagination.total ?? loans.length} encontrados
        </p>
      </div>

      {loading ? (
        <LoanListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loans.length === 0 ? (
        <EmptyLoanList message={emptyMessage} />
      ) : variant === "cards" ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {loans.map((loan) => (
            <LoanCardRow
              key={loan.id}
              loan={loan}
              isNew={highlightedLoanIds?.has(loan.id) ?? false}
              selected={loan.id === selectedLoan?.id}
              perspective={perspective}
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

      {!loading && !error && totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination>
            <PaginationContent className="flex items-center gap-1.5">
              <PaginationItem>
                <Button
                  variant="outline"
                  size="default"
                  className="rounded-full px-4"
                  disabled={page <= 1}
                  onClick={() => onPageChange(Math.max(page - 1, 1))}
                >
                  Anterior
                </Button>
              </PaginationItem>
              
              {(() => {
                const pages: Array<number | string> = [];
                const maxVisible = 5;
                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  const start = Math.max(2, page - 1);
                  const end = Math.min(totalPages - 1, page + 1);
                  if (start > 2) pages.push("...");
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages - 1) pages.push("...");
                  pages.push(totalPages);
                }

                return pages.map((pageVal, index) => {
                  if (pageVal === "...") {
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <span className="px-2 text-muted-foreground">...</span>
                      </PaginationItem>
                    );
                  }

                  const isCurrent = pageVal === page;
                  return (
                    <PaginationItem key={pageVal}>
                      <Button
                        variant={isCurrent ? "default" : "outline"}
                        size="icon"
                        className={cn(
                          "rounded-full",
                          isCurrent
                            ? "bg-slate-900 text-white hover:bg-slate-900/90 dark:bg-slate-50 dark:text-slate-900"
                            : "border-border hover:bg-muted"
                        )}
                        onClick={() => onPageChange(Number(pageVal))}
                      >
                        {pageVal}
                      </Button>
                    </PaginationItem>
                  );
                });
              })()}

              <PaginationItem>
                <Button
                  variant="outline"
                  size="default"
                  className="rounded-full px-4"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                >
                  Siguiente
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

function LoanCardRow({
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
  const progress = Math.round(getLoanProgress(loan))
  const title =
    perspective === "client"
      ? "Préstamo con ABC Inversiones"
      : `Préstamo de ${loanClientName(loan)}`
  const date = formatDate(loan.startDate ?? loan.createdAt)
  const frequency = frequencyLabels[String(loan.frequency)] ?? loan.frequency ?? "Frecuencia"

  return (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-4 text-left shadow-sm transition-shadow hover:shadow-md sm:gap-4 md:px-5",
        isNew && "realtime-row-enter",
        selected && "border-primary/40 bg-accent/30",
      )}
      onClick={() => onSelect(loan)}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary sm:size-12">
        <ReceiptTextIcon />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-base font-semibold leading-tight">
            <AnimatedNumber value={loan.principal} isCurrency />
          </h3>
          <LoanStatusBadge status={normalizeStatus(loan)} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          <span className="font-mono">{loanPublicCode(loan)}</span>
          <span className="hidden sm:inline">
            <span className="px-1.5">-</span>
            <span>{title}</span>
          </span>
        </p>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
          {frequency} · <span className="text-success"><AnimatedNumber value={progress} decimals={0} suffix="% pagado" /></span>
          <span className="hidden sm:inline"> · {date}</span>
        </p>
      </div>

      <div className="hidden shrink-0 grid-cols-3 gap-4 text-right text-xs text-muted-foreground md:grid">
        <LoanPlainMetric label="Deuda" value={<AnimatedNumber value={loan.totalDebt} isCurrency />} />
        <LoanPlainMetric label="Restante" value={<AnimatedNumber value={getRemainingDebt(loan)} isCurrency />} />
        <LoanPlainMetric label="Cuotas" value={<AnimatedNumber value={loan.installmentsCount} />} />
      </div>

      <ChevronRightIcon className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </button>
  )
}

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

function LoanPlainMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground tabular-nums">{value}</p>
      <p>{label}</p>
    </div>
  )
}

function LoanTinyMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-l pl-3 first:border-l-0 first:pl-0">
      <p className="truncate font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  )
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
