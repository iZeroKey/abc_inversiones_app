import { Link } from "react-router-dom"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import {
  DataTableCard,
  DataTableColumnHeader,
  DataTableStaticHeader,
} from "@/components/data-table-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/formatters"
import { InstallmentBadge, LoanStatusBadge, VoucherStatusBadge } from "@/features/loans/components/LoanBadges"
import { AmountBlock, InfoRow } from "@/features/loans/components/LoanMetricBits"
import {
  CompactEmpty,
  DetailSkeleton,
  EmptyDetail,
  relatedEmptyIcons,
} from "@/features/loans/components/LoanPageStates"
import {
  frequencyLabels,
  interestPeriodLabels,
} from "@/features/loans/loan-constants"
import {
  formatDate,
  formatPreciseCurrencyWithSymbol,
  getLoanProgress,
  getNextInstallment,
  getRemainingDebt,
  loanClientName,
  loanInvestorName,
  loanPublicCode,
  normalizeStatus,
} from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { Installment, Loan, Payment, PaymentVoucher } from "@/types/loans"

export type RelatedData = {
  installments: Installment[]
  payments: Payment[]
  vouchers: PaymentVoucher[]
}

const scheduleColumns: ColumnDef<Installment>[] = [
  {
    id: "number",
    accessorFn: (installment) => installment.installmentNumber ?? installment.number ?? 0,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cuota" />,
    cell: ({ row }) => `#${row.original.installmentNumber ?? row.original.number ?? "-"}`,
  },
  {
    id: "dueDate",
    accessorFn: (installment) => installment.dueDate ?? "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vence" />,
    cell: ({ row }) => formatDate(row.original.dueDate),
  },
  {
    id: "amount",
    accessorFn: (installment) => Number(installment.amount ?? 0),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Monto" />,
    cell: ({ row }) => formatPreciseCurrencyWithSymbol(row.original.amount),
  },
  {
    id: "paid",
    accessorFn: (installment) => Number(installment.paidAmount ?? 0),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Pagado" />,
    cell: ({ row }) => formatPreciseCurrencyWithSymbol(row.original.paidAmount),
  },
  {
    id: "status",
    accessorFn: (installment) => installment.status ?? "pending",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <InstallmentBadge status={row.original.status ?? "pending"} />,
  },
]

const paymentColumns: ColumnDef<Payment>[] = [
  {
    id: "date",
    accessorFn: (payment) => payment.paymentDate ?? payment.createdAt ?? "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => formatDate(row.original.paymentDate ?? row.original.createdAt),
  },
  {
    id: "amount",
    accessorFn: (payment) => Number(payment.amount ?? 0),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Monto" />,
    cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.amount)}</span>,
  },
  {
    id: "method",
    accessorFn: (payment) => payment.method ?? "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Método" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.method ?? "Sin método"}</Badge>,
  },
  {
    id: "reference",
    accessorFn: (payment) => payment.reference ?? "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Referencia" />,
    cell: ({ row }) => (
      <span className="block max-w-32 truncate font-mono text-xs">
        {row.original.reference ?? "-"}
      </span>
    ),
  },
]

const voucherColumns: ColumnDef<PaymentVoucher>[] = [
  {
    id: "date",
    accessorFn: (voucher) => voucher.createdAt ?? "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: "amount",
    accessorFn: (voucher) => Number(voucher.amount ?? 0),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Monto" />,
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
  {
    id: "status",
    accessorFn: (voucher) => voucher.status ?? "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <VoucherStatusBadge status={row.original.status} />,
  },
  {
    id: "file",
    enableSorting: false,
    header: () => <DataTableStaticHeader title="Archivo" />,
    cell: ({ row }) =>
      row.original.evidenceUrl || row.original.fileUrl ? (
        <Button
          variant="link"
          size="sm"
          render={
            <a
              href={row.original.evidenceUrl ?? row.original.fileUrl ?? ""}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          Abrir
        </Button>
      ) : (
        "-"
      ),
  },
]

export function LoanDetailPanel({
  loan,
  relatedData,
  loading,
  error,
  canReview,
  basePath,
  onApprove,
  onReject,
  onRetry,
  perspective = "admin",
  sticky = true,
  hideBackButton = false,
}: {
  loan: Loan | null
  relatedData: RelatedData
  loading: boolean
  error: string | null
  canReview: boolean
  basePath: string
  onApprove: () => void
  onReject: () => void
  onRetry: () => void
  perspective?: "admin" | "client" | "investor"
  sticky?: boolean
  hideBackButton?: boolean
}) {
  if (loading) {
    return (
      <section className="min-h-[420px]">
        <DetailSkeleton />
      </section>
    )
  }

  if (!loan) {
    return (
      <section className="min-h-[420px] rounded-lg border border-dashed">
        <EmptyDetail />
      </section>
    )
  }

  const progress = getLoanProgress(loan)
  const nextInstallment = getNextInstallment(relatedData.installments)
  const title =
    perspective === "client"
      ? "Préstamo con ABC Inversiones"
      : `Préstamo de ${loanClientName(loan)}`

  return (
    <section
      className={cn(
        "min-w-0",
        sticky && "lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto",
      )}
    >
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {!hideBackButton && (
            <Button className="shrink-0" variant="ghost" size="icon-sm" render={<Link to={basePath} />}>
              <ArrowLeftIcon />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight sm:truncate">{title}</h2>
              <LoanStatusBadge status={normalizeStatus(loan, relatedData.installments)} />
            </div>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{loanPublicCode(loan)}</p>
          </div>
        </div>
        {canReview && (
          <div className="flex shrink-0 items-center gap-2 max-sm:w-full mt-1 sm:mt-0">
            <Button className="flex-1 sm:flex-none" variant="outline" size="sm" onClick={onReject}>
              <XIcon className="text-destructive" data-icon="inline-start" />
              Rechazar
            </Button>
            <Button className="flex-1 sm:flex-none" size="sm" onClick={onApprove}>
              <CheckIcon data-icon="inline-start" />
              Aprobar
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 py-5">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm">
            <AlertCircleIcon className="mt-0.5 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-destructive">Detalle parcial</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <AmountBlock label="Principal" value={formatCurrency(loan.principal)} />
          <AmountBlock label="Deuda total" value={formatCurrency(loan.totalDebt)} />
          <AmountBlock label="Pendiente" value={formatCurrency(getRemainingDebt(loan))} />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Avance de pago</p>
              <p className="text-xs text-muted-foreground">
                Pagado {formatPreciseCurrencyWithSymbol(loan.totalPaid)} de{" "}
                {formatPreciseCurrencyWithSymbol(loan.totalDebt)}
              </p>
            </div>
            <Badge variant="success">{Math.round(progress)}%</Badge>
          </div>
          <Progress value={progress} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow icon={UserRoundIcon} label="Inversionista" value={loanInvestorName(loan)} />
          <InfoRow
            icon={CalendarClockIcon}
            label="Próxima cuota"
            value={nextInstallment ? formatDate(nextInstallment.dueDate) : "Sin cuota pendiente"}
          />
          <InfoRow
            icon={TrendingUpIcon}
            label="Tasa"
            value={`${loan.interestRate ?? 0}% ${interestPeriodLabels[String(loan.interestPeriod)] ?? ""}`}
          />
          <InfoRow
            icon={ReceiptTextIcon}
            label="Regla"
            value={`${loan.installmentsCount ?? 0} cuotas · ${frequencyLabels[String(loan.frequency)] ?? loan.frequency ?? "-"}`}
          />
        </div>

        <Tabs defaultValue="schedule" className="min-h-0">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="schedule" className="flex-1">
              Cronograma
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1">
              Pagos
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="flex-1">
              Vouchers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <ScheduleTable installments={relatedData.installments} />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTable payments={relatedData.payments} />
          </TabsContent>
          <TabsContent value="vouchers">
            <VouchersTable vouchers={relatedData.vouchers} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

function ScheduleTable({ installments }: { installments: Installment[] }) {
  if (installments.length === 0) {
    return (
      <CompactEmpty
        icon={relatedEmptyIcons.schedule}
        title="Sin cronograma"
        description="Aún no hay cuotas para este préstamo."
      />
    )
  }

  return (
    <DataTableCard
      columns={scheduleColumns}
      data={installments}
      getRowId={(installment) => installment.id}
      tableClassName="min-w-[620px]"
    />
  )
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <CompactEmpty
        icon={relatedEmptyIcons.payments}
        title="Sin pagos"
        description="Los pagos registrados se mostrarán en esta vista."
      />
    )
  }

  return (
    <DataTableCard
      columns={paymentColumns}
      data={payments}
      getRowId={(payment) => payment.id}
      tableClassName="min-w-[560px]"
    />
  )
}

function VouchersTable({ vouchers }: { vouchers: PaymentVoucher[] }) {
  if (vouchers.length === 0) {
    return (
      <CompactEmpty
        icon={relatedEmptyIcons.vouchers}
        title="Sin vouchers"
        description="Los vouchers del préstamo aparecerán separados del formulario."
      />
    )
  }

  return (
    <DataTableCard
      columns={voucherColumns}
      data={vouchers}
      getRowId={(voucher) => voucher.id}
      tableClassName="min-w-[560px]"
    />
  )
}
