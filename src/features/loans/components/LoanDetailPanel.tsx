import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckIcon,
  CreditCardIcon,
  EditIcon,
  FileImageIcon,
  MoreHorizontalIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  Trash2Icon,
  UploadIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"
import type { Column, ColumnDef } from "@tanstack/react-table"
import { PhotoProvider, PhotoView } from "react-photo-view"

import {
  DataTableCard,
  DataTableColumnHeader,
  DataTableStaticHeader,
} from "@/components/data-table-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
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
  installmentStatusLabels,
  paymentMethodLabels,
  voucherStatusLabels,
} from "@/features/loans/loan-constants"
import {
  formatDate,
  getInstallmentDisplayStatus,
  formatPreciseCurrencyWithSymbol,
  getLoanPaidAmount,
  getLoanProgress,
  getNextInstallment,
  getRemainingDebt,
  loanClientName,
  loanInvestorName,
  loanPublicCode,
  normalizeStatus,
} from "@/features/loans/loan-utils"
import {
  DeleteWorkflowDialog,
  EvidenceButton,
  PaymentDialog,
  ProcessVoucherDialog,
  VoucherDialog,
  compactPayload,
  toIsoOrUndefined,
} from "@/features/loans/components/PaymentWorkflowDialogs"
import {
  analyzeVoucherEvidence,
  checkOperationIdExists,
  createPayment,
  deletePayment,
  deleteVoucher,
  processVoucher,
  submitVoucher,
  updatePayment,
  updateVoucher,
  type PaymentMutationPayload,
  type VoucherSubmitPayload,
} from "@/lib/loans-api"
import { cn } from "@/lib/utils"
import type { Installment, Loan, Payment, PaymentMethod, PaymentVoucher } from "@/types/loans"

export type RelatedData = {
  installments: Installment[]
  payments: Payment[]
  vouchers: PaymentVoucher[]
}

const scheduleColumns: ColumnDef<Installment>[] = [
  {
    id: "number",
    accessorFn: (installment) => installment.installmentNumber ?? installment.number ?? 0,
    header: sortableHeader("Cuota"),
    cell: ({ row }) => `#${row.original.installmentNumber ?? row.original.number ?? "-"}`,
  },
  {
    id: "dueDate",
    accessorFn: (installment) => installment.dueDate ?? "",
    header: sortableHeader("Vence"),
    cell: ({ row }) => formatDate(row.original.dueDate),
  },
  {
    id: "amount",
    accessorFn: (installment) => Number(installment.amount ?? 0),
    header: sortableHeader("Monto"),
    cell: ({ row }) => formatPreciseCurrencyWithSymbol(row.original.amount),
  },
  {
    id: "paid",
    accessorFn: (installment) => Number(installment.paidAmount ?? 0),
    header: sortableHeader("Pagado"),
    cell: ({ row }) => formatPreciseCurrencyWithSymbol(row.original.paidAmount),
  },
  {
    id: "status",
    accessorFn: (installment) => {
      const status = getInstallmentDisplayStatus(installment)
      return installmentStatusLabels[status] ?? status ?? "Pendiente"
    },
    header: sortableHeader("Estado"),
    cell: ({ row }) => <InstallmentBadge status={getInstallmentDisplayStatus(row.original)} />,
  },
]

type SortDirection = false | "asc" | "desc"

function sortableHeader<TData, TValue>(title: string, align: "left" | "right" = "left") {
  return ({
    column,
    sortDirection,
    toggleSorting,
  }: {
    column: Column<TData, TValue>
    sortDirection?: SortDirection
    toggleSorting?: () => void
  }) => (
    <DataTableColumnHeader
      column={column}
      title={title}
      align={align}
      sortDirection={sortDirection}
      onSort={toggleSorting}
    />
  )
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
  hideBackButton = false,
  onSubViewChange,
  onDataChanged,
  paymentPresentation = "dialog",
  resetTrigger,
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
  onDataChanged?: () => Promise<void> | void
  paymentPresentation?: "dialog" | "panel"
  onSubViewChange?: (subView: string | null) => void
  resetTrigger?: number
}) {
  const { user, session, fetchWithAuth } = useAuth()
  const [paymentDialogPayment, setPaymentDialogPayment] = useState<Payment | null | undefined>()
  const [voucherDialogVoucher, setVoucherDialogVoucher] = useState<PaymentVoucher | null | undefined>()
  const [processDialog, setProcessDialog] = useState<{
    voucher: PaymentVoucher
    mode: "approve" | "reject"
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "payment" | "voucher"
    item: Payment | PaymentVoucher
    source?: "list" | "gallery"
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const currentSubView = useMemo(() => {
    if (paymentPresentation !== "panel") return null
    if (paymentDialogPayment === null) return "payment-create"
    if (paymentDialogPayment) return "payment-edit"
    return null
  }, [paymentPresentation, paymentDialogPayment])

  useEffect(() => {
    onSubViewChange?.(currentSubView)
  }, [currentSubView, onSubViewChange])

  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setPaymentDialogPayment(undefined)
    }
  }, [resetTrigger])

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

  const paidAmount = getLoanPaidAmount(loan, relatedData.installments)
  const progress = getLoanProgress(loan, relatedData.installments)
  const nextInstallment = getNextInstallment(relatedData.installments)
  const loanStatus = normalizeStatus(loan, relatedData.installments)
  const paymentAllowedStatuses = new Set(["active", "defaulted", "overdue"])
  const canSubmitVoucher = perspective === "client" && loan.status === "active"
  const canRegisterPayment = perspective === "admin" && paymentAllowedStatuses.has(loanStatus)
  const title =
    perspective === "client"
      ? "Préstamo con ABC Inversiones"
      : `Préstamo de ${loanClientName(loan)}`

  const refreshAfterMutation = async (title: string, description: string) => {
    toastManager.add({ type: "success", title, description })
    await onDataChanged?.()
  }

  const handlePaymentSubmit = async (form: {
    amount: string
    paymentDate: string
    method: PaymentMethod
    reference: string
    observation: string
    evidence: File | null
  }, onUploadProgress: (progress: number) => void) => {
    const payload = compactPayload<PaymentMutationPayload>({
      amount: form.amount,
      paymentDate: toIsoOrUndefined(form.paymentDate),
      method: form.method,
      reference: form.reference.trim() || undefined,
      observation: form.observation.trim() || undefined,
      evidence: form.evidence,
    })

    setSubmitting(true)
    try {
      if (paymentDialogPayment) {
        await updatePayment(fetchWithAuth, paymentDialogPayment.id, payload as PaymentMutationPayload)
        setPaymentDialogPayment(undefined)
        await refreshAfterMutation("Pago actualizado", "El cronograma se recalculó correctamente.")
      } else {
        await createPayment(
          fetchWithAuth,
          { loanId: loan.id, ...(payload as PaymentMutationPayload) },
          { accessToken: session?.access_token, onUploadProgress },
        )
        setPaymentDialogPayment(undefined)
        await refreshAfterMutation("Pago registrado", "El pago fue aplicado al préstamo.")
      }
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo guardar el pago",
        description: getErrorText(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleVoucherAnalyze = async (
    file: File,
    onUploadProgress: (progress: number) => void,
    signal?: AbortSignal,
  ) => {
    setAnalyzing(true)
    try {
      const result = await analyzeVoucherEvidence(
        fetchWithAuth,
        file,
        { accessToken: session?.access_token, onUploadProgress, signal },
      )
      return {
        amount: result.extracted?.amount ?? undefined,
        operationId: result.extracted?.operationId ?? undefined,
        operationDate: result.extracted?.operationDate ? toInputDate(result.extracted.operationDate) : undefined,
      }
    } catch (error) {
      if (isAbortError(error)) throw error
      toastManager.add({
        type: "error",
        title: "No se pudo analizar el voucher",
        description: getErrorText(error),
      })
      throw error
    } finally {
      setAnalyzing(false)
    }
  }

  const handleVoucherSubmit = async (form: {
    amount: string
    operationId: string
    operationDate: string
    observation: string
    evidence: File | null
  }, onUploadProgress: (progress: number) => void) => {
    setSubmitting(true)
    try {
      const operationId = form.operationId.trim()
      if (!voucherDialogVoucher) {
        const exists = await checkOperationIdExists(fetchWithAuth, operationId)
        if (exists) {
          toastManager.add({
            type: "warning",
            title: "Operación duplicada",
            description: "Ese ID de operación ya fue registrado.",
          })
          return
        }
        const payload: VoucherSubmitPayload = {
          loanId: loan.id,
          amount: form.amount,
          operationId,
          operationDate: toIsoOrUndefined(form.operationDate),
          observation: form.observation.trim() || undefined,
          evidence: form.evidence,
        }
        await submitVoucher(
          fetchWithAuth,
          payload,
          { accessToken: session?.access_token, onUploadProgress },
        )
        setVoucherDialogVoucher(undefined)
        await refreshAfterMutation("Voucher enviado", "Quedó pendiente de revisión.")
      } else {
        await updateVoucher(fetchWithAuth, voucherDialogVoucher.id, compactPayload({
          amount: form.amount,
          operationId,
          operationDate: toIsoOrUndefined(form.operationDate),
          observation: form.observation.trim() || undefined,
        }))
        setVoucherDialogVoucher(undefined)
        await refreshAfterMutation("Voucher actualizado", "Los datos quedaron sincronizados.")
      }
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo guardar el voucher",
        description: getErrorText(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleProcessVoucher = async (form: { action: "approve" | "reject"; observation: string }) => {
    if (!processDialog) return

    setSubmitting(true)
    try {
      await processVoucher(fetchWithAuth, processDialog.voucher.id, {
        action: form.action,
        observation: form.observation.trim() || undefined,
      })
      setProcessDialog(null)
      await refreshAfterMutation(
        form.action === "approve" ? "Voucher aprobado" : "Voucher rechazado",
        "El estado se actualizó correctamente.",
      )
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo procesar el voucher",
        description: getErrorText(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTarget = async () => {
    if (!deleteTarget) return

    setSubmitting(true)
    try {
      if (deleteTarget.type === "payment") {
        await deletePayment(fetchWithAuth, deleteTarget.item.id)
        await refreshAfterMutation("Pago eliminado", "El préstamo fue recalculado.")
      } else {
        await deleteVoucher(fetchWithAuth, deleteTarget.item.id)
        await refreshAfterMutation("Voucher eliminado", "El flujo quedó actualizado.")
      }
      setDeleteTarget(null)
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo eliminar",
        description: getErrorText(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (paymentPresentation === "panel" && paymentDialogPayment !== undefined) {
    return (
      <section className="flex min-h-0 flex-col transition-all duration-300 animate-in fade-in slide-in-from-right-6">
        <PaymentDialog
          open
          payment={paymentDialogPayment}
          submitting={submitting}
          analyzing={analyzing}
          presentation="panel"
          onOpenChange={(open) => {
            if (!open) setPaymentDialogPayment(undefined)
          }}
          onAnalyze={async (file, onUploadProgress, signal) => {
            const analyzed = await handleVoucherAnalyze(file, onUploadProgress, signal)
            return {
              amount: analyzed.amount,
              reference: analyzed.operationId,
              paymentDate: analyzed.operationDate,
            }
          }}
          onSubmit={(form, onUploadProgress) => handlePaymentSubmit(form, onUploadProgress)}
        />
      </section>
    )
  }

  return (
    <section
      className={cn(
        "min-w-0 transition-all duration-300 animate-in fade-in slide-in-from-left-6",
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
        {(canReview || canSubmitVoucher || canRegisterPayment) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full mt-1 sm:mt-0">
            {canRegisterPayment && (
              <Button className="flex-1 sm:flex-none" size="sm" onClick={() => setPaymentDialogPayment(null)}>
                <CreditCardIcon data-icon="inline-start" />
                Registrar pago
              </Button>
            )}
            {canSubmitVoucher && (
              <Button className="flex-1 sm:flex-none" size="sm" onClick={() => setVoucherDialogVoucher(null)}>
                <UploadIcon data-icon="inline-start" />
                Subir voucher
              </Button>
            )}
            {canReview && (
              <Button className="flex-1 sm:flex-none" variant="outline" size="sm" onClick={onReject}>
              <XIcon className="text-destructive" data-icon="inline-start" />
              Rechazar
              </Button>
            )}
            {canReview && (
              <Button className="flex-1 sm:flex-none" size="sm" onClick={onApprove}>
                <CheckIcon data-icon="inline-start" />
                Aprobar
              </Button>
            )}
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
          <AmountBlock label="Pendiente" value={formatCurrency(getRemainingDebt(loan, relatedData.installments))} />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Avance de pago</p>
              <p className="text-xs text-muted-foreground">
                Pagado {formatPreciseCurrencyWithSymbol(paidAmount)} de{" "}
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
            <PaymentsTable
              payments={relatedData.payments}
              vouchers={relatedData.vouchers}
              canManage={perspective === "admin"}
              showPendingVouchers={perspective === "client"}
              canManageVoucher={(voucher) =>
                canEditVoucher(voucher, perspective, user?.id) || canDeleteVoucher(voucher, perspective, user?.id)
              }
              onEdit={setPaymentDialogPayment}
              onDelete={(payment) => setDeleteTarget({ type: "payment", item: payment, source: "list" })}
              onEditVoucher={setVoucherDialogVoucher}
              onDeleteVoucher={(voucher) => setDeleteTarget({ type: "voucher", item: voucher, source: "list" })}
            />
          </TabsContent>
          <TabsContent value="vouchers">
            <VouchersTable
              vouchers={relatedData.vouchers}
              payments={relatedData.payments}
              canDeletePayment={perspective === "admin"}
              canEdit={(voucher) => canEditVoucher(voucher, perspective, user?.id)}
              canDelete={(voucher) => canDeleteVoucher(voucher, perspective, user?.id)}
              canProcess={(voucher) => canProcessVoucher(voucher, loan, perspective, user?.id)}
              onEdit={setVoucherDialogVoucher}
              onDelete={(voucher) => setDeleteTarget({ type: "voucher", item: voucher, source: "gallery" })}
              onDeletePayment={(payment) => setDeleteTarget({ type: "payment", item: payment, source: "gallery" })}
              onApprove={(voucher) => setProcessDialog({ voucher, mode: "approve" })}
              onReject={(voucher) => setProcessDialog({ voucher, mode: "reject" })}
              deleteTarget={deleteTarget}
              submitting={submitting}
              onCancelDelete={() => setDeleteTarget(null)}
              onConfirmDelete={handleDeleteTarget}
            />
          </TabsContent>
        </Tabs>
      </div>

      {paymentDialogPayment !== undefined && (
        <PaymentDialog
          open
          payment={paymentDialogPayment}
          submitting={submitting}
          analyzing={analyzing}
          onOpenChange={(open) => {
            if (!open) setPaymentDialogPayment(undefined)
          }}
          onAnalyze={async (file, onUploadProgress, signal) => {
            const analyzed = await handleVoucherAnalyze(file, onUploadProgress, signal)
            return {
              amount: analyzed.amount,
              reference: analyzed.operationId,
              paymentDate: analyzed.operationDate,
            }
          }}
          onSubmit={(form, onUploadProgress) => handlePaymentSubmit(form, onUploadProgress)}
        />
      )}
      {voucherDialogVoucher !== undefined && (
        <VoucherDialog
          open
          voucher={voucherDialogVoucher}
          submitting={submitting}
          analyzing={analyzing}
          onOpenChange={(open) => {
            if (!open) setVoucherDialogVoucher(undefined)
          }}
          onAnalyze={handleVoucherAnalyze}
          onSubmit={(form, onUploadProgress) => handleVoucherSubmit(form, onUploadProgress)}
        />
      )}
      {processDialog && (
        <ProcessVoucherDialog
          open
          voucher={processDialog.voucher}
          mode={processDialog.mode}
          submitting={submitting}
          onOpenChange={(open) => {
            if (!open) setProcessDialog(null)
          }}
          onSubmit={(form) => void handleProcessVoucher(form)}
        />
      )}
      {deleteTarget && deleteTarget.source !== "gallery" && (
        <DeleteWorkflowDialog
          open={true}
          title={deleteTarget.type === "payment" ? "Eliminar pago" : "Eliminar voucher"}
          description={
            deleteTarget.type === "payment"
              ? "El pago se eliminará lógicamente y el préstamo se recalculará."
              : "El voucher se eliminará lógicamente. Si ya generó un pago, el sistema lo revertirá."
          }
          submitting={submitting}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          onConfirm={() => void handleDeleteTarget()}
        />
      )}
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

function PaymentsTable({
  payments,
  vouchers,
  canManage,
  showPendingVouchers,
  canManageVoucher,
  onEdit,
  onDelete,
  onEditVoucher,
  onDeleteVoucher,
}: {
  payments: Payment[]
  vouchers: PaymentVoucher[]
  canManage: boolean
  showPendingVouchers: boolean
  canManageVoucher: (voucher: PaymentVoucher) => boolean
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  onEditVoucher: (voucher: PaymentVoucher) => void
  onDeleteVoucher: (voucher: PaymentVoucher) => void
}) {
  type PaymentListRow =
    | { id: string; kind: "payment"; payment: Payment; voucher?: never }
    | { id: string; kind: "voucher"; payment?: never; voucher: PaymentVoucher }

  const rows = useMemo<PaymentListRow[]>(() => {
    const paymentRows = payments.map((payment) => ({
      id: `payment-${payment.id}`,
      kind: "payment" as const,
      payment,
    }))
    const pendingVoucherRows = showPendingVouchers
      ? vouchers
          .filter((voucher) => isPendingVoucherForClient(voucher))
          .map((voucher) => ({
            id: `voucher-${voucher.id}`,
            kind: "voucher" as const,
            voucher,
          }))
      : []

    return [...paymentRows, ...pendingVoucherRows]
  }, [payments, showPendingVouchers, vouchers])

  const columns = useMemo<ColumnDef<PaymentListRow>[]>(
    () => [
      {
        id: "date",
        accessorFn: (row) =>
          row.kind === "payment"
            ? row.payment.paymentDate ?? row.payment.createdAt ?? ""
            : row.voucher.operationDate ?? row.voucher.createdAt ?? "",
        header: sortableHeader("Fecha"),
        cell: ({ row }) =>
          row.original.kind === "payment"
            ? formatDate(row.original.payment.paymentDate ?? row.original.payment.createdAt)
            : formatDate(row.original.voucher.operationDate ?? row.original.voucher.createdAt),
      },
      {
        id: "amount",
        accessorFn: (row) => Number(row.kind === "payment" ? row.payment.amount ?? 0 : row.voucher.amount ?? 0),
        header: sortableHeader("Monto"),
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.kind === "payment" ? row.original.payment.amount : row.original.voucher.amount)}
          </span>
        ),
      },
      {
        id: "method",
        accessorFn: (row) =>
          row.kind === "payment"
            ? row.payment.method ? paymentMethodLabels[row.payment.method] ?? row.payment.method : ""
            : "Transferencia",
        header: sortableHeader("Método"),
        cell: ({ row }) => {
          if (row.original.kind === "voucher") return <Badge variant="outline">Transferencia</Badge>
          const method = row.original.payment.method
          return <Badge variant="outline">{method ? paymentMethodLabels[method] ?? method : "Sin método"}</Badge>
        },
      },
      {
        id: "status",
        accessorFn: (row) =>
          row.kind === "payment" ? "Aplicado" : voucherStatusLabels[row.voucher.status ?? "pending_investor_review"] ?? row.voucher.status ?? "",
        header: sortableHeader("Estado"),
        cell: ({ row }) => {
          if (row.original.kind === "payment") return <Badge variant="success">Aplicado</Badge>
          return <VoucherStatusBadge status={row.original.voucher.status} />
        },
      },
      {
        id: "reference",
        accessorFn: (row) => row.kind === "payment" ? row.payment.reference ?? "" : row.voucher.operationId ?? "",
        header: sortableHeader("Referencia"),
        cell: ({ row }) => (
          <span className="block max-w-32 truncate font-mono text-xs">
            {row.original.kind === "payment" ? row.original.payment.reference ?? "-" : row.original.voucher.operationId ?? "-"}
          </span>
        ),
      },
      {
        id: "evidence",
        enableSorting: false,
        header: () => <DataTableStaticHeader title="Evidencia" />,
        cell: ({ row }) => (
          <EvidenceButton
            url={row.original.kind === "payment" ? row.original.payment.evidenceUrl : row.original.voucher.evidenceUrl}
          />
        ),
      },
      ...(canManage || rows.some((row) => row.kind === "voucher" && canManageVoucher(row.voucher))
        ? [{
            id: "actions",
            enableSorting: false,
            header: () => <DataTableStaticHeader title="" />,
            cell: ({ row }) => {
              const items = row.original.kind === "payment"
                ? getPaymentActions(row.original.payment, canManage, onEdit, onDelete)
                : getVoucherPaymentRowActions(row.original.voucher, canManageVoucher, onEditVoucher, onDeleteVoucher)

              return items.length ? <RowActions items={items} /> : <span className="text-muted-foreground">-</span>
            },
          } satisfies ColumnDef<PaymentListRow>]
        : []),
    ],
    [canManage, canManageVoucher, onDelete, onDeleteVoucher, onEdit, onEditVoucher, rows],
  )

  if (rows.length === 0) {
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
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      tableClassName="min-w-[740px]"
    />
  )
}

function getPaymentActions(
  payment: Payment,
  canManage: boolean,
  onEdit: (payment: Payment) => void,
  onDelete: (payment: Payment) => void,
) {
  if (!canManage) return []

  return [
    { label: "Editar", icon: EditIcon, onClick: () => onEdit(payment) },
    { label: "Eliminar", icon: Trash2Icon, destructive: true, onClick: () => onDelete(payment) },
  ]
}

function getVoucherPaymentRowActions(
  voucher: PaymentVoucher,
  canManageVoucher: (voucher: PaymentVoucher) => boolean,
  onEditVoucher: (voucher: PaymentVoucher) => void,
  onDeleteVoucher: (voucher: PaymentVoucher) => void,
) {
  if (!canManageVoucher(voucher)) return []

  return [
    { label: "Editar voucher", icon: EditIcon, onClick: () => onEditVoucher(voucher) },
    { label: "Eliminar voucher", icon: Trash2Icon, destructive: true, onClick: () => onDeleteVoucher(voucher) },
  ]
}

function VouchersTable({
  vouchers,
  payments,
  canDeletePayment,
  canEdit,
  canDelete,
  canProcess,
  onEdit,
  onDelete,
  onDeletePayment,
  onApprove,
  onReject,
  deleteTarget,
  submitting,
  onCancelDelete,
  onConfirmDelete,
}: {
  vouchers: PaymentVoucher[]
  payments: Payment[]
  canDeletePayment: boolean
  canEdit: (voucher: PaymentVoucher) => boolean
  canDelete: (voucher: PaymentVoucher) => boolean
  canProcess: (voucher: PaymentVoucher) => boolean
  onEdit: (voucher: PaymentVoucher) => void
  onDelete: (voucher: PaymentVoucher) => void
  onDeletePayment: (payment: Payment) => void
  onApprove: (voucher: PaymentVoucher) => void
  onReject: (voucher: PaymentVoucher) => void
  deleteTarget: { type: "payment" | "voucher"; item: Payment | PaymentVoucher; source?: "list" | "gallery" } | null
  submitting: boolean
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  type GalleryAction = {
    label: string
    icon: ElementType
    destructive?: boolean
    onClick: () => void
  }
  type GalleryItem = {
    id: string
    amount?: string | number
    date?: string | null
    imageUrl: string | null
    title: string
    badge: ReactNode
    actions: GalleryAction[]
  }

  const galleryItems: GalleryItem[] = [
    ...vouchers.map((voucher) => ({
      id: `voucher-${voucher.id}`,
      amount: voucher.amount,
      date: voucher.createdAt ?? voucher.operationDate,
      imageUrl: getVoucherImageUrl(voucher),
      title: voucher.operationId ? `Operación ${voucher.operationId}` : "Voucher sin operación",
      badge: <VoucherStatusBadge status={voucher.status} />,
      actions: [
        ...(canProcess(voucher)
          ? [
              { label: "Aprobar", icon: CheckIcon, onClick: () => onApprove(voucher) },
              { label: "Rechazar", icon: XIcon, destructive: true, onClick: () => onReject(voucher) },
            ]
          : []),
        ...(canEdit(voucher)
          ? [{ label: "Editar", icon: EditIcon, onClick: () => onEdit(voucher) }]
          : []),
        ...(canDelete(voucher)
          ? [{ label: "Eliminar voucher", icon: Trash2Icon, destructive: true, onClick: () => onDelete(voucher) }]
          : []),
      ],
    })),
    ...payments
      .filter((payment) => Boolean(getPaymentEvidenceUrl(payment)))
      .map((payment) => ({
        id: `payment-${payment.id}`,
        amount: payment.amount,
        date: payment.paymentDate ?? payment.createdAt,
        imageUrl: getPaymentEvidenceUrl(payment),
        title: payment.reference ? `Pago ${payment.reference}` : "Pago registrado",
        badge: <Badge variant="success">Aplicado</Badge>,
        actions: canDeletePayment
          ? [{ label: "Eliminar pago", icon: Trash2Icon, destructive: true, onClick: () => onDeletePayment(payment) }]
          : [],
      })),
  ]

  if (galleryItems.length === 0) {
    return (
      <CompactEmpty
        icon={relatedEmptyIcons.vouchers}
        title="Sin vouchers"
        description="Los vouchers del préstamo aparecerán separados del formulario."
      />
    )
  }

  return (
    <PhotoProvider>
      <div className="columns-1 gap-3 sm:columns-2 xl:columns-3">
        {galleryItems.map((item, index) => {
          const isDeleting = Boolean(
            deleteTarget &&
              deleteTarget.source === "gallery" &&
              deleteTarget.type === (item.id.startsWith("voucher-") ? "voucher" : "payment") &&
              String(deleteTarget.item.id) === (item.id.startsWith("voucher-") ? item.id.replace("voucher-", "") : item.id.replace("payment-", ""))
          )

          return (
            <Card
              key={item.id}
              className="relative mb-3 break-inside-avoid overflow-hidden rounded-[8px] before:rounded-[7px]"
            >
              {isDeleting && (
                <div className="absolute inset-0 z-20 flex flex-col justify-between bg-background/95 p-4 text-center animate-in fade-in duration-200">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <Trash2Icon className="size-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">¿Confirmar eliminación?</p>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Esta acción es irreversible y podría deshacer cálculos asociados.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="w-full h-8"
                      disabled={submitting}
                      onClick={onConfirmDelete}
                    >
                      {submitting ? <Spinner /> : "Confirmar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-8"
                      disabled={submitting}
                      onClick={onCancelDelete}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
              <CardContent className="p-0">
                {item.imageUrl ? (
                  <PhotoView src={item.imageUrl}>
                    <button
                      type="button"
                      className={cn(
                        "group relative flex w-full cursor-zoom-in items-center justify-center overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        getVoucherImageClassName(index),
                      )}
                      aria-label="Ver voucher en tamaño completo"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  </PhotoView>
                ) : (
                  <div className={cn("flex w-full flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground", getVoucherImageClassName(index))}>
                    <FileImageIcon />
                    <span className="text-xs font-medium">Sin imagen</span>
                  </div>
                )}
              </CardContent>
              <CardHeader className="gap-1.5 p-2.5 pb-1.5">
                <div className="min-w-0">
                  <CardTitle className="truncate text-sm">
                    {item.title}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.date)}</p>
                </div>
              </CardHeader>
              <CardFooter className="flex-row items-center justify-between gap-2 p-2.5 pt-0">
                <span className="font-medium">{formatCurrency(item.amount)}</span>
                <div className="flex min-w-0 items-center gap-1.5">
                  {item.badge}
                  {item.actions.length > 0 ? <RowActions items={item.actions} /> : null}
                </div>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </PhotoProvider>
  )
}

function getVoucherImageUrl(voucher: PaymentVoucher) {
  const imageUrl = voucher.evidenceUrl ?? voucher.fileUrl
  if (!imageUrl || imageUrl.startsWith("storage://")) return null
  return imageUrl
}

function getPaymentEvidenceUrl(payment: Payment) {
  if (!payment.evidenceUrl || payment.evidenceUrl.startsWith("storage://")) return null
  return payment.evidenceUrl
}

function getVoucherImageClassName(index: number) {
  const pattern = index % 6
  if (pattern === 1) return "h-72"
  if (pattern === 2) return "h-48"
  if (pattern === 4) return "h-64"
  return "h-56"
}

function isPendingVoucherForClient(voucher: PaymentVoucher) {
  return ["draft", "pending_investor_review", "pending_admin_review"].includes(voucher.status ?? "")
}

function RowActions({
  items,
}: {
  items: Array<{
    label: string
    icon: ElementType
    destructive?: boolean
    onClick: () => void
  }>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {items.map((item) => {
            const Icon = item.icon
            return (
              <DropdownMenuItem
                key={item.label}
                className={cn(item.destructive && "text-destructive")}
                onClick={item.onClick}
              >
                <Icon />
                {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function canEditVoucher(voucher: PaymentVoucher, perspective: "admin" | "client" | "investor", userId?: string) {
  if (perspective === "admin") return voucher.status === "owner_approved"
  return (
    perspective === "client" &&
    voucher.clientId === userId &&
    isPendingVoucherForClient(voucher)
  )
}

function canDeleteVoucher(voucher: PaymentVoucher, perspective: "admin" | "client" | "investor", userId?: string) {
  if (perspective === "admin") return true
  return (
    perspective === "client" &&
    voucher.clientId === userId &&
    isPendingVoucherForClient(voucher)
  )
}

function canProcessVoucher(
  voucher: PaymentVoucher,
  loan: Loan,
  perspective: "admin" | "client" | "investor",
  userId?: string,
) {
  if (perspective === "investor") {
    return voucher.status === "pending_investor_review" && loan.investorId === userId
  }

  if (perspective !== "admin") return false

  return ["pending_investor_review", "pending_admin_review", "investor_approved"].includes(voucher.status ?? "")
}

function getErrorText(error: unknown) {
  return error instanceof Error ? error.message : "Inténtalo nuevamente."
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function toInputDate(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}
