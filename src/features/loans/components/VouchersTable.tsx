import { CheckIcon, EditIcon, FileImageIcon, MoreHorizontalIcon, Trash2Icon, XIcon } from "lucide-react"
import { type ElementType, type ReactNode } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { VoucherStatusBadge } from "@/features/loans/components/LoanBadges"
import {
  CompactEmpty,
  relatedEmptyIcons,
} from "@/features/loans/components/LoanPageStates"
import { formatDate } from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { Payment, PaymentVoucher } from "@/types/loans"

function getVoucherEvidenceUrl(voucher: PaymentVoucher) {
  const url = voucher.evidenceUrl ?? voucher.fileUrl
  if (!url || url.startsWith("storage://")) return null
  return url
}

function getPaymentEvidenceUrl(payment: Payment) {
  if (!payment.evidenceUrl || payment.evidenceUrl.startsWith("storage://")) return null
  return payment.evidenceUrl
}

function getVoucherImageUrl(voucher: PaymentVoucher) {
  return getVoucherEvidenceUrl(voucher)
}

function getVoucherImageClassName(index: number) {
  const pattern = index % 6
  if (pattern === 1) return "h-72"
  if (pattern === 2) return "h-48"
  if (pattern === 4) return "h-64"
  return "h-56"
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

export function VouchersTable({
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
              String(deleteTarget.item.id) === (item.id.startsWith("voucher-") ? item.id.replace("voucher-", "") : item.id.replace("payment-", "")),
          )

          return (
            <Card
              key={item.id}
              className="relative mb-3 break-inside-avoid overflow-hidden rounded-xl before:rounded-[7px]"
            >
              {isDeleting && (
                <div className="absolute inset-0 z-20 flex flex-col bg-background/95 text-center animate-in fade-in duration-200">
                  <div className={cn("flex flex-col items-center justify-center gap-2 px-4", getVoucherImageClassName(index))}>
                    <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <Trash2Icon className="size-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">¿Confirmar eliminación?</p>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Esta acción es irreversible y podría deshacer cálculos asociados.
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col justify-center gap-2 px-4 pb-4">
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
                <span className="font-medium"><AnimatedNumber value={item.amount} isCurrency /></span>
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
