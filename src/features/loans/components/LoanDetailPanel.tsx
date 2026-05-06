import { Link } from "react-router-dom"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarClockIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  UserRoundIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
}) {
  if (!loan && loading) {
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
      <div className="flex flex-col gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link to={basePath} />}>
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-normal">{title}</h2>
              <LoanStatusBadge status={normalizeStatus(loan, relatedData.installments)} />
            </div>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{loanPublicCode(loan)}</p>
          </div>
        </div>
        {canReview && (
          <div className="flex flex-wrap gap-2 pl-10">
            <Button variant="outline" size="sm" onClick={onReject}>
              Rechazar
            </Button>
            <Button size="sm" onClick={onApprove}>
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

        {loading && <DetailSkeleton />}

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
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cuota</TableHead>
            <TableHead>Vence</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Pagado</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map((installment) => (
            <TableRow key={installment.id}>
              <TableCell>#{installment.installmentNumber ?? installment.number ?? "-"}</TableCell>
              <TableCell>{formatDate(installment.dueDate)}</TableCell>
              <TableCell>{formatPreciseCurrencyWithSymbol(installment.amount)}</TableCell>
              <TableCell>{formatPreciseCurrencyWithSymbol(installment.paidAmount)}</TableCell>
              <TableCell>
                <InstallmentBadge status={installment.status ?? "pending"} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Referencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.paymentDate ?? payment.createdAt)}</TableCell>
              <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
              <TableCell>
                <Badge variant="outline">{payment.method ?? "Sin método"}</Badge>
              </TableCell>
              <TableCell className="max-w-32 truncate font-mono text-xs">{payment.reference ?? "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Archivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vouchers.map((voucher) => (
            <TableRow key={voucher.id}>
              <TableCell>{formatDate(voucher.createdAt)}</TableCell>
              <TableCell>{formatCurrency(voucher.amount)}</TableCell>
              <TableCell>
                <VoucherStatusBadge status={voucher.status} />
              </TableCell>
              <TableCell>
                {voucher.evidenceUrl || voucher.fileUrl ? (
                  <Button
                    variant="link"
                    size="sm"
                    render={<a href={voucher.evidenceUrl ?? voucher.fileUrl ?? ""} target="_blank" rel="noreferrer" />}
                  >
                    Abrir
                  </Button>
                ) : (
                  "-"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
