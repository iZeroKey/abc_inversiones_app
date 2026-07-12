import type { ColumnDef } from "@tanstack/react-table"
import { motion, type Variants } from "framer-motion"
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircleIcon,
  HourglassIcon,
  RefreshCwIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react"
import { useMemo } from "react"

const cardVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
}

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { AnimatedText } from "@/components/AnimatedText"
import { DataTableCard, DataTablePaginationBar, DataTableStaticHeader } from "@/components/data-table-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { useIsRecentStructuralChange } from "@/contexts/realtime-context"
import { LoanStatusBadge } from "@/features/loans/components/LoanBadges"
import {
  EmptyLoanList,
  ErrorState,
  LoanListSkeleton,
} from "@/features/loans/components/LoanPageStates"
import { frequencyLabels } from "@/features/loans/loan-constants"
import {
  formatDate,
  getLoanCardFooterIcon,
  getLoanCardFooterText,
  getLoanCardSecondaryLabel,
  getLoanCardSecondaryValue,
  getLoanCardTitle,
  getLoanProgress,
  getLoanStatusColor,
  getRemainingDebt,
  getStatusGroup,
  loanInvestorName,
  loanPublicCode,
  normalizeStatus,
  toNumber
} from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { Loan, PaginationMeta, RelatedUser } from "@/types/loans"

import iconAbc from "@/assets/icon-abc.png"

function shortId(value?: string | null) {
  if (!value) return "-"
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}

function UserCell({ 
  user, 
  fallbackName, 
  perspective 
}: { 
  user?: RelatedUser | null
  fallbackName: string
  perspective: "admin" | "client" | "investor" 
}) {
  const name = user ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || user.publicCode || fallbackName : fallbackName;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
  const showDetails = perspective === "admin";
  
  const isAbc = name === "ABC Inversiones" || name === "ABC INVERSIONES";
  const finalAvatarUrl = isAbc ? iconAbc : user?.avatarUrl;

  return (
    <div className="flex items-center gap-2 max-w-64 -ml-2 px-2 py-1 h-auto sm:h-auto">
      <Avatar className="size-7">
        {finalAvatarUrl ? <AvatarImage src={finalAvatarUrl} alt="" className="object-cover" /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate font-medium text-sm text-left">{name}</span>
        {showDetails && user && (user.publicCode || user.email || user.id) ? (
          <span className="block truncate text-xs text-muted-foreground text-left">
            {user.publicCode || user.email || shortId(user.id)}
          </span>
        ) : null}
      </span>
    </div>
  )
}


function EmptyCell({ className }: { className?: string }) {
  return <span className={cn("text-muted-foreground/30 select-none", className)}>—</span>
}

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
  viewMode,
  pagination,
  page,
  loading,
  isFetching,
  isPlaceholderData,
  error,
  emptyMessage,
  onRetry,
  onSelectLoan,
  onPageChange,
  perspective = "admin",
}: {
  loans: Loan[]
  highlightedLoanIds?: Set<string>
  selectedLoan: Loan | null
  viewMode: "cards" | "table"
  pagination: PaginationMeta
  page: number
  loading: boolean
  isFetching?: boolean
  isPlaceholderData?: boolean
  error: string | null
  emptyMessage: string
  onRetry: () => void
  onSelectLoan: (loan: Loan) => void
  onPageChange: (page: number) => void
  perspective?: "admin" | "client" | "investor"
}) {
  const isRecentLoansChange = useIsRecentStructuralChange("loans")
  const isStructuralFetching = isFetching && isRecentLoansChange
  const totalPages = Math.max(pagination.totalPages ?? 1, 1)

  const loanColumns = useMemo<ColumnDef<Loan>[]>(() => {
    const clientColumns: ColumnDef<Loan>[] = [
      {
        id: "publicCode",
        accessorFn: (loan) => loan.publicCode ?? "",
        header: () => <DataTableStaticHeader title="Código" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">#{loanPublicCode(row.original)}</span>
        ),
      },
      {
        id: "name",
        accessorFn: (loan) => loan.name ?? "",
        header: () => <DataTableStaticHeader title="Nombre" />,
        cell: ({ row }) => (
          <span className="block max-w-[20ch] truncate font-medium">{row.original.name ?? `Préstamo #${loanPublicCode(row.original)}`}</span>
        ),
      },
      {
        id: "principal",
        accessorFn: (loan) => toNumber(loan.principal),
        header: () => <DataTableStaticHeader title="Principal" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums font-medium" value={toNumber(row.original.principal)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "totalDebt",
        accessorFn: (loan) => toNumber(loan.totalDebt),
        header: () => <DataTableStaticHeader title="Deuda total" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums" value={toNumber(row.original.totalDebt)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "paid",
        accessorFn: (loan) => toNumber(loan.totalPaid),
        header: () => <DataTableStaticHeader title="Pagado" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums" value={toNumber(row.original.totalPaid)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "remainingDebt",
        accessorFn: (loan) => getRemainingDebt(loan),
        header: () => <DataTableStaticHeader title="Saldo" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums font-medium" value={getRemainingDebt(row.original)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "frequency",
        accessorFn: (loan) => frequencyLabels[String(loan.frequency)] ?? loan.frequency ?? "",
        header: () => <DataTableStaticHeader title="Frecuencia" />,
        cell: ({ row }) => frequencyLabels[String(row.original.frequency)] ?? row.original.frequency ?? <EmptyCell />,
      },
      {
        id: "installmentsCount",
        accessorFn: (loan) => loan.installmentsCount ?? 0,
        header: () => <DataTableStaticHeader title="Cuotas" align="right" />,
        cell: ({ row }) => row.original.installmentsCount ?? <EmptyCell />,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "nextPayment",
        accessorFn: (loan) => loan.nextInstallment?.dueDate ?? "",
        header: () => <DataTableStaticHeader title="Próximo pago" />,
        cell: ({ row }) => {
          const next = row.original.nextInstallment
          return <AnimatedText>{next?.dueDate ? formatDate(next.dueDate) : <EmptyCell />}</AnimatedText>
        },
      },
      {
        id: "status",
        accessorFn: (loan) => normalizeStatus(loan),
        header: () => <DataTableStaticHeader title="Estado" />,
        cell: ({ row }) => <AnimatedText value={normalizeStatus(row.original)}><LoanStatusBadge status={normalizeStatus(row.original)} /></AnimatedText>,
      },
    ]

    const investorColumns: ColumnDef<Loan>[] = [
      {
        id: "publicCode",
        accessorFn: (loan) => loan.publicCode ?? "",
        header: () => <DataTableStaticHeader title="Código" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">#{loanPublicCode(row.original)}</span>
        ),
      },
      {
        id: "name",
        accessorFn: (loan) => loan.name ?? "",
        header: () => <DataTableStaticHeader title="Nombre" />,
        cell: ({ row }) => (
          <span className="block max-w-[20ch] truncate font-medium">{row.original.name ?? `Préstamo #${loanPublicCode(row.original)}`}</span>
        ),
      },
      {
        id: "clientName",
        accessorFn: (loan) => loan.clientName ?? "",
        header: () => <DataTableStaticHeader title="Cliente" />,
        cell: ({ row }) => (
          <UserCell 
            user={row.original.client} 
            fallbackName={row.original.clientName ?? "Cliente"} 
            perspective={perspective} 
          />
        ),
      },
      {
        id: "principal",
        accessorFn: (loan) => toNumber(loan.principal),
        header: () => <DataTableStaticHeader title="Inversión" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums font-medium" value={toNumber(row.original.principal)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "totalDebt",
        accessorFn: (loan) => toNumber(loan.totalDebt),
        header: () => <DataTableStaticHeader title="Retorno esperado" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums" value={toNumber(row.original.totalDebt)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "paid",
        accessorFn: (loan) => toNumber(loan.totalPaid),
        header: () => <DataTableStaticHeader title="Recibido" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums" value={toNumber(row.original.totalPaid)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "remainingDebt",
        accessorFn: (loan) => getRemainingDebt(loan),
        header: () => <DataTableStaticHeader title="Pendiente" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums font-medium" value={getRemainingDebt(row.original)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "frequency",
        accessorFn: (loan) => frequencyLabels[String(loan.frequency)] ?? loan.frequency ?? "",
        header: () => <DataTableStaticHeader title="Frecuencia" />,
        cell: ({ row }) => frequencyLabels[String(row.original.frequency)] ?? row.original.frequency ?? <EmptyCell />,
      },
      {
        id: "installmentsCount",
        accessorFn: (loan) => loan.installmentsCount ?? 0,
        header: () => <DataTableStaticHeader title="Cuotas" align="right" />,
        cell: ({ row }) => row.original.installmentsCount ?? <EmptyCell />,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "nextPayment",
        accessorFn: (loan) => loan.nextInstallment?.dueDate ?? "",
        header: () => <DataTableStaticHeader title="Próximo pago" />,
        cell: ({ row }) => {
          const next = row.original.nextInstallment
          return <AnimatedText>{next?.dueDate ? formatDate(next.dueDate) : <EmptyCell />}</AnimatedText>
        },
      },
      {
        id: "status",
        accessorFn: (loan) => normalizeStatus(loan),
        header: () => <DataTableStaticHeader title="Estado" />,
        cell: ({ row }) => <AnimatedText value={normalizeStatus(row.original)}><LoanStatusBadge status={normalizeStatus(row.original)} /></AnimatedText>,
      },
    ]

    const adminColumns: ColumnDef<Loan>[] = [
      {
        id: "publicCode",
        accessorFn: (loan) => loan.publicCode ?? "",
        header: () => <DataTableStaticHeader title="Código" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">#{loanPublicCode(row.original)}</span>
        ),
      },
      {
        id: "name",
        accessorFn: (loan) => loan.name ?? "",
        header: () => <DataTableStaticHeader title="Nombre" />,
        cell: ({ row }) => (
          <span className="block max-w-[20ch] truncate font-medium">{row.original.name ?? `Préstamo #${loanPublicCode(row.original)}`}</span>
        ),
      },
      {
        id: "clientName",
        accessorFn: (loan) => loan.clientName ?? "",
        header: () => <DataTableStaticHeader title="Cliente" />,
        cell: ({ row }) => (
          <UserCell 
            user={row.original.client} 
            fallbackName={row.original.clientName ?? "Cliente"} 
            perspective={perspective} 
          />
        ),
      },
      {
        id: "investorName",
        accessorFn: (loan) => loanInvestorName(loan),
        header: () => <DataTableStaticHeader title="Inversionista" />,
        cell: ({ row }) => (
          <UserCell 
            user={row.original.investor} 
            fallbackName={loanInvestorName(row.original)} 
            perspective={perspective} 
          />
        ),
      },
      {
        id: "principal",
        accessorFn: (loan) => toNumber(loan.principal),
        header: () => <DataTableStaticHeader title="Principal" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums font-medium" value={toNumber(row.original.principal)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "totalDebt",
        accessorFn: (loan) => toNumber(loan.totalDebt),
        header: () => <DataTableStaticHeader title="Deuda total" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums" value={toNumber(row.original.totalDebt)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "paid",
        accessorFn: (loan) => toNumber(loan.totalPaid),
        header: () => <DataTableStaticHeader title="Pagado" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums" value={toNumber(row.original.totalPaid)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "remainingDebt",
        accessorFn: (loan) => getRemainingDebt(loan),
        header: () => <DataTableStaticHeader title="Saldo" align="right" />,
        cell: ({ row }) => (
          <AnimatedNumber className="tabular-nums font-medium" value={getRemainingDebt(row.original)} isCurrency />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "rate",
        accessorFn: (loan) => toNumber(loan.interestRate),
        header: () => <DataTableStaticHeader title="Tasa" align="right" />,
        cell: ({ row }) => `${row.original.interestRate ?? 0}%`,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "frequency",
        accessorFn: (loan) => frequencyLabels[String(loan.frequency)] ?? loan.frequency ?? "",
        header: () => <DataTableStaticHeader title="Frecuencia" />,
        cell: ({ row }) => frequencyLabels[String(row.original.frequency)] ?? row.original.frequency ?? <EmptyCell />,
      },
      {
        id: "installmentsCount",
        accessorFn: (loan) => loan.installmentsCount ?? 0,
        header: () => <DataTableStaticHeader title="Cuotas" align="right" />,
        cell: ({ row }) => row.original.installmentsCount ?? <EmptyCell />,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "nextPayment",
        accessorFn: (loan) => loan.nextInstallment?.dueDate ?? "",
        header: () => <DataTableStaticHeader title="Próximo pago" />,
        cell: ({ row }) => {
          const next = row.original.nextInstallment
          return next?.dueDate ? formatDate(next.dueDate) : <EmptyCell />
        },
      },
      {
        id: "status",
        accessorFn: (loan) => normalizeStatus(loan),
        header: () => <DataTableStaticHeader title="Estado" />,
        cell: ({ row }) => <LoanStatusBadge status={normalizeStatus(row.original)} />,
      },
    ]

    if (perspective === "client") return clientColumns
    if (perspective === "investor") return investorColumns
    return adminColumns
  }, [perspective])

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {loading ? (
        <LoanListSkeleton variant={viewMode} />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loans.length === 0 ? (
        <EmptyLoanList
          title={perspective === "investor" ? "No hay inversiones" : "No hay préstamos"}
          message={emptyMessage}
        />
      ) : (
        <div className={cn("transition-opacity duration-200", (isPlaceholderData || isStructuralFetching) && "opacity-50 pointer-events-none")}>
          {viewMode === "cards" ? (
            <motion.div
              className="grid gap-3 md:grid-cols-2"
              variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
              initial="initial"
              animate="animate"
            >
              {loans.map((loan) => (
                <motion.div key={loan.id} variants={cardVariants}>
                  <LoanCardRow
                    loan={loan}
                    isNew={highlightedLoanIds?.has(loan.id) ?? false}
                    selected={loan.id === selectedLoan?.id}
                    onSelect={onSelectLoan}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <DataTableCard
              columns={loanColumns}
              data={loans}
              getRowId={(loan) => loan.id}
              getRowClassName={(loan) => cn(highlightedLoanIds?.has(loan.id) && "realtime-row-enter")}
              onRowClick={onSelectLoan}
              tableClassName={cn(
                "min-w-[900px]",
                perspective === "admin" && "min-w-[1200px]",
                perspective === "investor" && "min-w-[1000px]",
              )}
              emptyMessage={emptyMessage}
            />
          )}
        </div>
      )}

      {!loading && !error && (
        <DataTablePaginationBar
          pagination={{
            page,
            totalPages,
            total: pagination.total,
            itemLabel: perspective === "investor" ? "inversiones" : "préstamos",
            onPageChange,
          }}
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
        "relative flex h-full w-full flex-col rounded-2xl bg-card text-left shadow-xs/5",
        "border-l-4",
        borderColor,
        isNew && "realtime-row-enter",
        selected && "bg-accent/30",
        isPaid && "text-muted-foreground",
      )}
      onClick={() => onSelect(loan)}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-xs font-semibold text-[#D2D2DE]">ID</span>
          <span className="truncate font-mono text-sm font-semibold text-[#00236F]">
            #{loanPublicCode(loan)}
          </span>
        </div>
        <LoanStatusBadge status={status} size="default" className={cn(isPaid && "opacity-60")} />
      </div>

      <p className="mt-2 truncate px-4 text-xl font-semibold text-foreground">
        {loan.name ?? `Préstamo #${loanPublicCode(loan)}`}
      </p>

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

      <div className={cn("mt-3 px-4", !showProgress && "invisible")} aria-hidden={!showProgress}>
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

export function RefreshButton({
  loading,
  onClick,
}: {
  loading: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="secondary"
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
