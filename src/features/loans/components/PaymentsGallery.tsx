import { useState, useMemo } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"
import { CheckIcon, EditIcon, FileImageIcon, Trash2Icon, XIcon } from "lucide-react"

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
import type { Payment, PaymentVoucher } from "@/types/loans"

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

// ─── Types ──────────────────────────────────────────────────────────

type PaymentGalleryItem =
  | { kind: "payment"; payment: Payment; voucher?: PaymentVoucher }
  | { kind: "unapplied_voucher"; voucher: PaymentVoucher }

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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PaymentGalleryItem | null
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
}) {
  const isMobile = useIsMobile()
  if (!item) return null

  const isPayment = item.kind === "payment"
  const evidenceUrl = isPayment
    ? (getPaymentEvidenceUrl(item.payment) ?? (item.voucher ? getVoucherEvidenceUrl(item.voucher) : null))
    : getVoucherEvidenceUrl(item.voucher)
  const amount = isPayment ? item.payment.amount : item.voucher.amount
  const date = isPayment
    ? (item.payment.paymentDate ?? item.payment.createdAt)
    : (item.voucher.operationDate ?? item.voucher.createdAt)
  const method = isPayment
    ? (item.payment.method ? paymentMethodLabels[item.payment.method] ?? item.payment.method : null)
    : "Transferencia"
  const reference = isPayment
    ? (item.payment.reference ?? null)
    : (item.voucher.operationId ?? null)
  const observation = isPayment
    ? (item.payment.observation ?? null)
    : (item.voucher.observation ?? null)

  type ActionItem = { label: string; destructive?: boolean; onClick: () => void }

  const processActions: ActionItem[] = []
  const footerActions: ActionItem[] = []

  if (isPayment) {
    if (canManage) {
      footerActions.push({ label: "Editar", onClick: () => onEdit(item.payment) })
      footerActions.push({ label: "Eliminar", destructive: true, onClick: () => onDelete(item.payment) })
    }
  } else {
    const voucher = item.voucher
    if (canProcessVoucher(voucher)) {
      processActions.push({ label: "Aprobar", onClick: () => onApproveVoucher(voucher) })
      processActions.push({ label: "Rechazar", destructive: true, onClick: () => onRejectVoucher(voucher) })
    }
    if (canEditVoucher(voucher)) {
      footerActions.push({ label: "Editar", onClick: () => onEditVoucher(voucher) })
    }
    if (canDeleteVoucher(voucher)) {
      footerActions.push({ label: "Eliminar", destructive: true, onClick: () => onDeleteVoucher(voucher) })
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showBar
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: drawerWidth ?? 620, maxWidth: "min(1080px, calc(100vw - 2rem))", minWidth: 560 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>
            {isPayment ? "Detalle de pago" : "Detalle de voucher"}
          </DrawerTitle>
          <DrawerDescription>
            {isPayment ? "Pago aplicado al préstamo" : "Voucher pendiente de proceso"}
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
                  <VoucherStatusBadge status={item.voucher.status} />
                )}
              </div>
            </div>

            <Separator />

            {/* Details */}
            <dl className="space-y-3 text-sm">
              {isPayment && method && (
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

              {!isPayment && item.voucher.status && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Estado voucher</dt>
                  <dd className="font-medium text-right">
                    <VoucherStatusBadge status={item.voucher.status} />
                  </dd>
                </div>
              )}

              {observation && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Observación</dt>
                  <dd className="text-right max-w-[60%] break-words">{observation}</dd>
                </div>
              )}
            </dl>

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
    </Drawer>
  )
}

// ─── Gallery Grid ───────────────────────────────────────────────────

export function PaymentsGallery({
  payments,
  vouchers,
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
}: {
  payments: Payment[]
  vouchers: PaymentVoucher[]
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
}) {
  const voucherMap = useMemo(() => {
    const map = new Map<string, PaymentVoucher>()
    for (const v of vouchers) {
      map.set(v.id, v)
    }
    return map
  }, [vouchers])

  const items = useMemo<PaymentGalleryItem[]>(() => {
    const result: PaymentGalleryItem[] = []

    for (const payment of payments) {
      const voucher = payment.voucherId ? voucherMap.get(payment.voucherId) : undefined
      result.push({ kind: "payment", payment, voucher })
    }

    const linkedVoucherIds = new Set(payments.filter(p => p.voucherId).map(p => p.voucherId!))
    for (const voucher of vouchers) {
      if (!linkedVoucherIds.has(voucher.id) && isUnappliedVoucher(voucher)) {
        result.push({ kind: "unapplied_voucher", voucher })
      }
    }

    result.sort((a, b) => {
      const dateA = a.kind === "payment"
        ? (a.payment.paymentDate ?? a.payment.createdAt ?? "")
        : (a.voucher.operationDate ?? a.voucher.createdAt ?? "")
      const dateB = b.kind === "payment"
        ? (b.payment.paymentDate ?? b.payment.createdAt ?? "")
        : (b.voucher.operationDate ?? b.voucher.createdAt ?? "")
      return dateB.localeCompare(dateA)
    })

    return result
  }, [payments, vouchers, voucherMap])

  const [selectedItem, setSelectedItem] = useState<PaymentGalleryItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleCardClick = (item: PaymentGalleryItem) => {
    setSelectedItem(item)
    setDrawerOpen(true)
  }

  if (items.length === 0) {
    return (
      <CompactEmpty
        icon={relatedEmptyIcons.payments}
        title="Sin movimientos"
        description="Los pagos y vouchers se mostrarán aquí."
      />
    )
  }

  return (
    <PhotoProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const isPayment = item.kind === "payment"
          const evidenceUrl = isPayment
            ? (getPaymentEvidenceUrl(item.payment) ?? (item.voucher ? getVoucherEvidenceUrl(item.voucher) : null))
            : getVoucherEvidenceUrl(item.voucher)
          const amount = isPayment ? item.payment.amount : item.voucher.amount
          const date = isPayment
            ? (item.payment.paymentDate ?? item.payment.createdAt)
            : (item.voucher.operationDate ?? item.voucher.createdAt)
          const method = isPayment
            ? (item.payment.method ? paymentMethodLabels[item.payment.method] ?? item.payment.method : null)
            : "Transferencia"
          const reference = isPayment
            ? (item.payment.reference ?? null)
            : (item.voucher.operationId ?? null)

          return (
            <button
              key={`${item.kind}-${isPayment ? item.payment.id : item.voucher.id}`}
              type="button"
              onClick={() => handleCardClick(item)}
              className="group flex items-stretch gap-3 rounded-xl border border-border/40 bg-card p-3 text-left text-foreground shadow-xs transition-all duration-200 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="w-28 shrink-0 relative overflow-hidden rounded-lg border-2 border-muted/30 bg-muted/30">
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
                      <VoucherStatusBadge status={item.voucher.status} />
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

      <DelayedOpenGate open={drawerOpen} onOpenChange={setDrawerOpen}>
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
          />
        )}
      </DelayedOpenGate>
    </PhotoProvider>
  )
}
