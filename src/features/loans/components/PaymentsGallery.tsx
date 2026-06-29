import { type ReactElement, useState, useMemo, useRef, useEffect } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"
import { CheckIcon, EditIcon, FileImageIcon, Trash2Icon, XIcon, Loader2Icon, ArrowDownIcon } from "lucide-react"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerPopup,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import { VoucherStatusBadge } from "@/features/loans/components/LoanBadges"
import {
  CompactEmpty,
  relatedEmptyIcons,
} from "@/features/loans/components/LoanPageStates"
import { paymentMethodLabels } from "@/features/loans/loan-constants"
import { formatDate } from "@/features/loans/loan-utils"
import { DelayedOpenGate } from "@/features/loans/hooks/usePaymentMutations"
import { useIsMobile } from "@/hooks/use-media-query"
import type { PaginationMeta, Payment, PaymentVoucher, LoanTransaction } from "@/types/loans"

// ─── Helpers ────────────────────────────────────────────────────────

function getPaymentEvidenceUrl(payment: Payment) {
  if (!payment.evidenceUrl || payment.evidenceUrl.startsWith("storage://")) return null
  return payment.evidenceUrl
}

function getVoucherEvidenceUrl(voucher: PaymentVoucher) {
  const url = voucher.evidenceUrl ?? voucher.fileUrl
  if (!url || url.startsWith("storage://")) return null
  return url
}

function isUnappliedVoucher(voucher: PaymentVoucher) {
  return ["draft", "pending_investor_review", "pending_admin_review", "investor_approved"].includes(voucher.status ?? "")
}



// ─── Detail Drawer ──────────────────────────────────────────────────

function PaymentDetailDrawer({
  open,
  onOpenChange,
  item,
  canManage,
  canEditVoucher,
  canDeleteVoucher,
  canProcessVoucher,
  onEdit,
  onDelete,
  onEditVoucher,
  onDeleteVoucher,
  onApproveVoucher,
  onRejectVoucher,
  drawerWidth,
  dialogElements,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LoanTransaction | null
  canManage: boolean
  canEditVoucher: (v: PaymentVoucher) => boolean
  canDeleteVoucher: (v: PaymentVoucher) => boolean
  canProcessVoucher: (v: PaymentVoucher) => boolean
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  onEditVoucher: (v: PaymentVoucher) => void
  onDeleteVoucher: (v: PaymentVoucher) => void
  onApproveVoucher: (v: PaymentVoucher) => void
  onRejectVoucher: (v: PaymentVoucher) => void
  drawerWidth?: number
  dialogElements: ReactElement | null
}) {
  const isMobile = useIsMobile()
  if (!item) return null

  const isPayment = item.type === "payment"
  const evidenceUrl = item.evidenceUrl && !item.evidenceUrl.startsWith("storage://") ? item.evidenceUrl : null
  const amount = item.amount
  const date = item.date || item.createdAt || ""
  const method = isPayment
    ? (item.method ? paymentMethodLabels[item.method] ?? item.method : null)
    : "Transferencia"
  const reference = item.reference ?? item.operationId ?? null
  const observation = item.observation ?? null

  type ActionItem = { label: string; destructive?: boolean; onClick: () => void }

  const processActions: ActionItem[] = []
  const footerActions: ActionItem[] = []

  // Create a mock payment/voucher to pass to handlers since they expect Payment/PaymentVoucher types
  const mockPayment = item as unknown as Payment
  const mockVoucher = item as unknown as PaymentVoucher

  if (isPayment) {
    if (canManage) {
      footerActions.push({ label: "Editar", onClick: () => onEdit(mockPayment) })
      footerActions.push({ label: "Eliminar", destructive: true, onClick: () => onDelete(mockPayment) })
    }
  } else {
    if (canProcessVoucher(mockVoucher)) {
      processActions.push({ label: "Aprobar", onClick: () => onApproveVoucher(mockVoucher) })
      processActions.push({ label: "Rechazar", destructive: true, onClick: () => onRejectVoucher(mockVoucher) })
    }
    if (canEditVoucher(mockVoucher)) {
      footerActions.push({ label: "Editar", onClick: () => onEditVoucher(mockVoucher) })
    }
    if (canDeleteVoucher(mockVoucher)) {
      footerActions.push({ label: "Eliminar", destructive: true, onClick: () => onDeleteVoucher(mockVoucher) })
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"} nested>
      <DrawerPopup
        showBar
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: drawerWidth ?? 620, maxWidth: "min(1080px, calc(100vw - 2rem))", minWidth: 560 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>
            Detalle de pago
          </DrawerTitle>
          <DrawerDescription>
            {isPayment ? "Pago aplicado al préstamo" : "Pago pendiente de proceso"}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerPanel>
          <div className="space-y-5">
            {/* Image */}
            <div className="w-full rounded-xl border-4 border-muted/30 bg-muted/30 overflow-hidden">
              {evidenceUrl ? (
                <PhotoView src={evidenceUrl}>
                  <button
                    type="button"
                    className="flex w-full cursor-zoom-in items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <img
                      src={evidenceUrl}
                      alt="Evidencia"
                      className="aspect-video w-full object-cover"
                    />
                  </button>
                </PhotoView>
              ) : (
                <div className="flex aspect-video items-center justify-center text-muted-foreground opacity-50">
                  <FileImageIcon className="size-12" />
                </div>
              )}
            </div>

            {/* Amount & status */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-3xl font-black tabular-nums tracking-tight">
                  <AnimatedNumber value={amount} isCurrency />
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{formatDate(date)}</p>
              </div>
              <div className="shrink-0">
                {isPayment ? (
                  <Badge variant="success" className="rounded-full">Aplicado</Badge>
                ) : (
                  <VoucherStatusBadge status={item.status} />
                )}
              </div>
            </div>

            <Separator />

            {/* Details */}
            <dl className="space-y-3 text-sm">
              {method && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Método</dt>
                  <dd className="font-medium text-right">{method}</dd>
                </div>
              )}

              {reference && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Referencia</dt>
                  <dd className="font-mono text-xs font-medium text-right break-all max-w-[60%]">
                    {reference}
                  </dd>
                </div>
              )}


            </dl>

            <div className="space-y-2 text-sm">
              <p className="font-medium text-muted-foreground">Observación</p>
              <div className="rounded-xl bg-muted/40 p-3.5 text-foreground">
                {observation ? (
                  <p className="whitespace-pre-wrap break-words">{observation}</p>
                ) : (
                  <p className="text-muted-foreground/70 italic text-xs">Sin observación</p>
                )}
              </div>
            </div>

            {/* Inline actions for processable vouchers */}
            {processActions.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  {processActions.map((a) => (
                    <Button
                      key={a.label}
                      size="sm"
                      variant={a.destructive ? "destructive" : "default"}
                      onClick={a.onClick}
                    >
                      {a.label === "Aprobar" ? <CheckIcon /> : <XIcon />}
                      {a.label}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        </DrawerPanel>

        <DrawerFooter variant="bare">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1">
              {footerActions.map((a) => (
                <Button
                  key={a.label}
                  variant={a.destructive ? "destructive" : "ghost"}
                  size="sm"
                  onClick={a.onClick}
                >
                  {a.label === "Editar" ? <EditIcon /> : null}
                  {a.label === "Eliminar" ? <Trash2Icon /> : null}
                  {a.label}
                </Button>
              ))}
            </div>
            <DrawerClose render={<Button variant="outline" />}>
              Cerrar
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerPopup>
      {dialogElements}
    </Drawer>
  )
}

// ─── Gallery Grid ───────────────────────────────────────────────────

export function PaymentsGallery({
  transactions,
  canManage,
  canEditVoucher,
  canDeleteVoucher,
  canProcessVoucher,
  onEdit,
  onDelete,
  onEditVoucher,
  onDeleteVoucher,
  onApproveVoucher,
  onRejectVoucher,
  drawerWidth,
  dialogElements,
  transactionsMeta,
  loadingTransactions,
  onLoadMoreTransactions,
}: {
  transactions: LoanTransaction[]
  canManage: boolean
  canEditVoucher: (v: PaymentVoucher) => boolean
  canDeleteVoucher: (v: PaymentVoucher) => boolean
  canProcessVoucher: (v: PaymentVoucher) => boolean
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  onEditVoucher: (v: PaymentVoucher) => void
  onDeleteVoucher: (v: PaymentVoucher) => void
  onApproveVoucher: (v: PaymentVoucher) => void
  onRejectVoucher: (v: PaymentVoucher) => void
  drawerWidth?: number
  dialogElements: ReactElement | null
  transactionsMeta?: PaginationMeta
  loadingTransactions?: boolean
  onLoadMoreTransactions?: () => void
}) {
  const [rawSelectedItem, setRawSelectedItem] = useState<LoanTransaction | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(closingTimeoutRef.current), [])

  const handleOpenChange = (open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      clearTimeout(closingTimeoutRef.current)
      closingTimeoutRef.current = setTimeout(() => {
        setRawSelectedItem(null)
      }, 500)
    } else {
      clearTimeout(closingTimeoutRef.current)
    }
  }

  const selectedItem = useMemo(() => {
    if (!rawSelectedItem) return null
    // Try to find the item in the updated transactions list to get its fresh state
    const target = transactions.find((t) => t.id === rawSelectedItem.id)
    if (target) return target
    
    // Fallback: If an unapplied voucher became a payment, the payment might have the voucher's ID as reference,
    // but the unified transactions array just handles it gracefully, or the id will be completely different.
    return rawSelectedItem
  }, [transactions, rawSelectedItem])

  const handleCardClick = (item: LoanTransaction) => {
    clearTimeout(closingTimeoutRef.current)
    setRawSelectedItem(item)
    setDrawerOpen(true)
  }

  if (transactions.length === 0) {
    return (
      <>
        <CompactEmpty
          icon={relatedEmptyIcons.payments}
          title="Sin movimientos"
          description="Los pagos y vouchers se mostrarán aquí."
        />
        {dialogElements}
      </>
    )
  }

  return (
    <PhotoProvider>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {transactions.map((item, index) => {
          const isPayment = item.type === "payment"
          const evidenceUrl = item.evidenceUrl && !item.evidenceUrl.startsWith("storage://") ? item.evidenceUrl : null
          const amount = item.amount
          const date = item.date || item.createdAt || ""
          const method = isPayment
            ? (item.method ? paymentMethodLabels[item.method] ?? item.method : null)
            : "Transferencia"
          const reference = item.reference ?? item.operationId ?? null

          return (
            <button
              key={item.id}
              type="button"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
              onClick={() => handleCardClick(item)}
              className="group relative flex w-full cursor-pointer items-start gap-4 rounded-2xl border bg-card p-4 text-left transition-all hover:border-foreground/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-muted-foreground/10 bg-muted/40">
                {evidenceUrl ? (
                  <img
                    src={evidenceUrl}
                    alt=""
                    className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground opacity-40">
                    <FileImageIcon className="size-8" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-lg font-bold tabular-nums tracking-tight min-w-0 truncate">
                    <AnimatedNumber value={amount} isCurrency />
                  </span>
                  <div className="shrink-0">
                    {isPayment ? (
                      <Badge variant="success">Aplicado</Badge>
                    ) : (
                      <VoucherStatusBadge status={item.status} />
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{formatDate(date)}</p>

                {method && (
                  <p className="text-xs text-muted-foreground">{method}</p>
                )}

                {reference && (
                  <p className="truncate text-xs font-mono text-muted-foreground">
                    Ref: {reference}
                  </p>
                )}

              </div>
            </button>
          )
        })}
      </div>

      {transactionsMeta && (
        <div className="col-span-full pt-4">
          {onLoadMoreTransactions &&
          (transactionsMeta.page ?? 1) < (transactionsMeta.totalPages ?? 1) ? (
            <button
              type="button"
              onClick={() => {
                onLoadMoreTransactions?.()
              }}
              disabled={loadingTransactions}
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-transparent py-4 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingTransactions ? (
                <>
                  <Loader2Icon className="size-4 animate-spin text-primary" />
                  Cargando operaciones...
                </>
              ) : (
                <>
                  Ver más transacciones
                  <ArrowDownIcon className="size-4 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-primary" />
                </>
              )}
            </button>
          ) : null}
        </div>
      )}

      <DelayedOpenGate open={drawerOpen} onOpenChange={handleOpenChange}>
        {(gateOpen, gateOnOpenChange) => (
          <PaymentDetailDrawer
            open={gateOpen}
            onOpenChange={gateOnOpenChange}
            item={selectedItem}
            canManage={canManage}
            canEditVoucher={canEditVoucher}
            canDeleteVoucher={canDeleteVoucher}
            canProcessVoucher={canProcessVoucher}
            onEdit={onEdit}
            onDelete={onDelete}
            onEditVoucher={onEditVoucher}
            onDeleteVoucher={onDeleteVoucher}
            onApproveVoucher={onApproveVoucher}
            onRejectVoucher={onRejectVoucher}
            drawerWidth={drawerWidth}
            dialogElements={dialogElements}
          />
        )}
      </DelayedOpenGate>

      {!selectedItem && dialogElements}
    </PhotoProvider>
  )
}
