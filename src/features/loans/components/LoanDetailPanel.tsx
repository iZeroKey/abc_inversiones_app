import { useMemo, useState, type ElementType } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckIcon,
  CreditCardIcon,
  EditIcon,
  EyeIcon,
  FileImageIcon,
  MoreHorizontalIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  Trash2Icon,
  UploadIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
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
  paymentMethodLabels,
} from "@/features/loans/loan-constants"
import {
  formatDate,
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
  onDataChanged,
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
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

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
  const canSubmitVoucher = perspective === "client" && paymentAllowedStatuses.has(loanStatus)
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
      toastManager.add({
        type: "success",
        title: "OCR completado",
        description: result.warnings?.[0] ?? "Revisa los datos extraídos antes de enviar.",
      })
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
              canManage={perspective === "admin"}
              onEdit={setPaymentDialogPayment}
              onDelete={(payment) => setDeleteTarget({ type: "payment", item: payment })}
            />
          </TabsContent>
          <TabsContent value="vouchers">
            <VouchersTable
              vouchers={relatedData.vouchers}
              canEdit={(voucher) => canEditVoucher(voucher, perspective, user?.id)}
              canDelete={(voucher) => canDeleteVoucher(voucher, perspective, user?.id)}
              canProcess={(voucher) => canProcessVoucher(voucher, loan, perspective, user?.id)}
              onEdit={setVoucherDialogVoucher}
              onDelete={(voucher) => setDeleteTarget({ type: "voucher", item: voucher })}
              onApprove={(voucher) => setProcessDialog({ voucher, mode: "approve" })}
              onReject={(voucher) => setProcessDialog({ voucher, mode: "reject" })}
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
      <DeleteWorkflowDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === "payment" ? "Eliminar pago" : "Eliminar voucher"}
        description={
          deleteTarget?.type === "payment"
            ? "El pago se eliminará lógicamente y el préstamo se recalculará."
            : "El voucher se eliminará lógicamente. Si ya generó un pago, el backend lo revertirá."
        }
        submitting={submitting}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => void handleDeleteTarget()}
      />
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
  canManage,
  onEdit,
  onDelete,
}: {
  payments: Payment[]
  canManage: boolean
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
}) {
  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
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
        cell: ({ row }) => {
          const method = row.original.method
          return <Badge variant="outline">{method ? paymentMethodLabels[method] ?? method : "Sin método"}</Badge>
        },
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
      {
        id: "evidence",
        enableSorting: false,
        header: () => <DataTableStaticHeader title="Evidencia" />,
        cell: ({ row }) => <EvidenceButton url={row.original.evidenceUrl} />,
      },
      ...(canManage
        ? [{
            id: "actions",
            enableSorting: false,
            header: () => <DataTableStaticHeader title="" />,
            cell: ({ row }) => (
              <RowActions
                items={[
                  { label: "Editar", icon: EditIcon, onClick: () => onEdit(row.original) },
                  { label: "Eliminar", icon: Trash2Icon, destructive: true, onClick: () => onDelete(row.original) },
                ]}
              />
            ),
          } satisfies ColumnDef<Payment>]
        : []),
    ],
    [canManage, onDelete, onEdit],
  )

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
      columns={columns}
      data={payments}
      getRowId={(payment) => payment.id}
      tableClassName="min-w-[640px]"
    />
  )
}

function VouchersTable({
  vouchers,
  canEdit,
  canDelete,
  canProcess,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  vouchers: PaymentVoucher[]
  canEdit: (voucher: PaymentVoucher) => boolean
  canDelete: (voucher: PaymentVoucher) => boolean
  canProcess: (voucher: PaymentVoucher) => boolean
  onEdit: (voucher: PaymentVoucher) => void
  onDelete: (voucher: PaymentVoucher) => void
  onApprove: (voucher: PaymentVoucher) => void
  onReject: (voucher: PaymentVoucher) => void
}) {
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
    <PhotoProvider>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {vouchers.map((voucher) => {
          const imageUrl = voucher.evidenceUrl ?? voucher.fileUrl
          const actions = [
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
              ? [{ label: "Eliminar", icon: Trash2Icon, destructive: true, onClick: () => onDelete(voucher) }]
              : []),
          ]

          return (
            <Card key={voucher.id} className="overflow-hidden rounded-[8px] before:rounded-[7px]">
              <CardContent className="p-0">
                {imageUrl ? (
                  <PhotoView src={imageUrl}>
                    <button
                      type="button"
                      className="group relative flex aspect-square w-full items-center justify-center overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Ver voucher en tamaño completo"
                    >
                      <img
                        src={imageUrl}
                        alt={voucher.operationId ? `Voucher ${voucher.operationId}` : "Voucher subido"}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute bottom-2 right-2 inline-flex size-8 items-center justify-center rounded-full border bg-background/90 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <EyeIcon />
                      </span>
                    </button>
                  </PhotoView>
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground">
                    <FileImageIcon />
                    <span className="text-xs font-medium">Sin imagen</span>
                  </div>
                )}
              </CardContent>
              <CardHeader className="gap-2 p-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm">
                      {voucher.operationId ? `Operación ${voucher.operationId}` : "Voucher sin operación"}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(voucher.createdAt)}</p>
                  </div>
                  <VoucherStatusBadge status={voucher.status} />
                </div>
              </CardHeader>
              <CardFooter className="justify-between gap-2 p-3 pt-0">
                <span className="font-medium">{formatCurrency(voucher.amount)}</span>
                {actions.length > 0 ? <RowActions items={actions} /> : <span className="text-muted-foreground">-</span>}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </PhotoProvider>
  )
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
    (voucher.status === "draft" || voucher.status === "pending_investor_review")
  )
}

function canDeleteVoucher(voucher: PaymentVoucher, perspective: "admin" | "client" | "investor", userId?: string) {
  if (perspective === "admin") return true
  return (
    perspective === "client" &&
    voucher.clientId === userId &&
    (voucher.status === "draft" || voucher.status === "pending_investor_review")
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

  return loan.investorId
    ? voucher.status === "investor_approved"
    : voucher.status === "pending_investor_review" || voucher.status === "investor_approved"
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
