import { motion, type Variants } from "framer-motion"
import { ArrowDownIcon, CheckIcon, EditIcon, FileImageIcon, Loader2Icon, Trash2Icon, XIcon } from "lucide-react"
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"

const cardVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
}

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import { useRealtime } from "@/contexts/realtime-context"
import { PaymentStatusBadge, VoucherStatusBadge } from "@/features/loans/components/LoanBadges"
import {
  CompactEmpty,
  relatedEmptyIcons,
} from "@/features/loans/components/LoanPageStates"
import { DelayedOpenGate } from "@/features/loans/hooks/usePaymentMutations"
import { paymentMethodLabels } from "@/features/loans/loan-constants"
import { formatDate } from "@/features/loans/loan-utils"
import { useIsMobile } from "@/hooks/use-media-query"
import type { LoanTransaction, PaginationMeta, Payment, PaymentVoucher } from "@/types/loans"

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

  type ActionItem = { label: string; destructive?: boolean; onClick: () => void; priority: number }

  const processActions: ActionItem[] = []
  const footerActions: ActionItem[] = []

  // Create a mock payment/voucher to pass to handlers since they expect Payment/PaymentVoucher types
  const mockPayment = item as unknown as Payment
  const mockVoucher = item as unknown as PaymentVoucher

  if (isPayment) {
    if (canManage && item.status !== "reversed") {
      footerActions.push({ label: "Editar", onClick: () => onEdit(mockPayment), priority: 20 })
      footerActions.push({ label: "Eliminar", destructive: true, onClick: () => onDelete(mockPayment), priority: 40 })
    }
  } else {
    if (canProcessVoucher(mockVoucher)) {
      processActions.push({ label: "Aprobar", onClick: () => onApproveVoucher(mockVoucher), priority: 10 })
      processActions.push({ label: "Rechazar", destructive: true, onClick: () => onRejectVoucher(mockVoucher), priority: 30 })
    }
    if (canDeleteVoucher(mockVoucher)) {
      footerActions.push({ label: "Eliminar", destructive: true, onClick: () => onDeleteVoucher(mockVoucher), priority: 40 })
    }
    if (canEditVoucher(mockVoucher)) {
      footerActions.push({ label: "Editar", onClick: () => onEditVoucher(mockVoucher), priority: 20 })
    }
  }

  const prioritizedActions = [...processActions, ...footerActions].sort((a, b) => a.priority - b.priority)

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
                  <PaymentStatusBadge status={item.status} className="rounded-full" />
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
                  <p className="whitespace-pre-wrap wrap-break-word">{observation}</p>
                ) : (
                  <p className="text-muted-foreground/70 italic text-xs">Sin observación</p>
                )}
              </div>
            </div>
          </div>
        </DrawerPanel>

        <DrawerFooter variant="bare">
          <div className="grid grid-cols-2 gap-2 w-full">
            {prioritizedActions.map((a) => (
              <Button
                key={a.label}
                variant={a.destructive ? "destructive" : a.label === "Aprobar" ? "default" : "secondary"}
                onClick={a.onClick}
                className="w-full"
              >
                {a.label === "Aprobar" ? <CheckIcon /> : null}
                {a.label === "Rechazar" ? <XIcon /> : null}
                {a.label === "Editar" ? <EditIcon data-icon="inline-start" /> : null}
                {a.label === "Eliminar" ? <Trash2Icon data-icon="inline-start" /> : null}
                {a.label}
              </Button>
            ))}
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className={`w-full ${prioritizedActions.length === 0 || !prioritizedActions.some((a) => a.label === "Aprobar") ? "col-span-2" : ""}`}
            >
              Cerrar
            </Button>
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
  lastMutatedItem,
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
  lastMutatedItem?: { id: string; type: "voucher" | "payment"; status: string; updatedAt: string } | null
}) {
  const { lastMessage } = useRealtime()

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
    if (lastMutatedItem?.id === rawSelectedItem.id) {
      return {
        ...rawSelectedItem,
        status: lastMutatedItem.status,
        updatedAt: lastMutatedItem.updatedAt,
      }
    }
    return rawSelectedItem
  }, [rawSelectedItem, lastMutatedItem])

  // Client & Admin: update status from WebSocket events
  useEffect(() => {
    if (!drawerOpen || !rawSelectedItem || !lastMessage?.type) return
    const data = lastMessage.data as Record<string, unknown> | undefined
    if (!data) return

    const currentId = rawSelectedItem.id
    if (!currentId) return

    if (lastMessage.type === "voucher.updated" && data.voucherId === currentId) {
      const newStatus = typeof data.status === "string" ? data.status : null
      if (newStatus) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRawSelectedItem((prev) => prev ? { ...prev, status: newStatus as LoanTransaction["status"] } : prev)
      }
    }

    if (lastMessage.type === "voucher.deleted" && data.voucherId === currentId) {
      setRawSelectedItem((prev) => prev ? { ...prev, status: "reversed" as LoanTransaction["status"] } : prev)
    }

    if (lastMessage.type === "payment.deleted" && data.paymentId === currentId) {
      setRawSelectedItem((prev) => prev ? { ...prev, status: "reversed" as LoanTransaction["status"] } : prev)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, drawerOpen])

  const handleCardClick = (item: LoanTransaction) => {
    clearTimeout(closingTimeoutRef.current)
    setRawSelectedItem({ ...item })
    setDrawerOpen(true)
  }

  if (transactions.length === 0 && !rawSelectedItem) {
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
      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
        initial="initial"
        animate="animate"
      >
        {transactions.map((item) => {
          const isPayment = item.type === "payment"
          const evidenceUrl = item.evidenceUrl && !item.evidenceUrl.startsWith("storage://") ? item.evidenceUrl : null
          const amount = item.amount
          const date = item.date || item.createdAt || ""
          const method = isPayment
            ? (item.method ? paymentMethodLabels[item.method] ?? item.method : null)
            : "Transferencia"
          const reference = item.reference ?? item.operationId ?? null

          return (
            <motion.button
              key={item.id}
              type="button"
              variants={cardVariants}
              onClick={() => handleCardClick(item)}
              className="group relative flex w-full cursor-pointer items-start gap-4 rounded-2xl bg-card p-4 text-left shadow-xs/5 transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                      <PaymentStatusBadge status={item.status} />
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
            </motion.button>
          )
        })}
      </motion.div>

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
