import type { Column, ColumnDef } from "@tanstack/react-table"
import {
  CheckIcon,
  EditIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { useMemo, type ElementType } from "react"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import {
  DataTableCard,
  DataTableColumnHeader,
  DataTableStaticHeader,
} from "@/components/data-table-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VoucherStatusBadge } from "@/features/loans/components/LoanBadges"
import {
  CompactEmpty,
  relatedEmptyIcons,
} from "@/features/loans/components/LoanPageStates"
import { EvidenceButton } from "@/features/loans/components/PaymentWorkflowDialogs"
import { paymentMethodLabels, voucherStatusLabels } from "@/features/loans/loan-constants"
import { formatDate } from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { Payment, PaymentVoucher } from "@/types/loans"

function sortableHeader<TData, TValue>(title: string, align: "left" | "right" = "left") {
  return ({
    column,
  }: {
    column: Column<TData, TValue>
  }) => (
    <DataTableColumnHeader
      column={column}
      title={title}
      align={align}
    />
  )
}

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
  canEditVoucher: (voucher: PaymentVoucher) => boolean,
  canDeleteVoucher: (voucher: PaymentVoucher) => boolean,
  canProcessVoucher: (voucher: PaymentVoucher) => boolean,
  onEditVoucher: (voucher: PaymentVoucher) => void,
  onDeleteVoucher: (voucher: PaymentVoucher) => void,
  onApproveVoucher: (voucher: PaymentVoucher) => void,
  onRejectVoucher: (voucher: PaymentVoucher) => void,
) {
  const actions: ReturnType<typeof getPaymentActions> = []

  if (canProcessVoucher(voucher)) {
    actions.push(
      { label: "Aprobar", icon: CheckIcon, onClick: () => onApproveVoucher(voucher) },
      { label: "Rechazar", icon: XIcon, destructive: true, onClick: () => onRejectVoucher(voucher) },
    )
  }

  if (canEditVoucher(voucher)) {
    actions.push({ label: "Editar voucher", icon: EditIcon, onClick: () => onEditVoucher(voucher) })
  }

  if (canDeleteVoucher(voucher)) {
    actions.push({ label: "Eliminar voucher", icon: Trash2Icon, destructive: true, onClick: () => onDeleteVoucher(voucher) })
  }

  return actions
}

function hasVoucherPaymentRowActions(
  voucher: PaymentVoucher,
  canEditVoucher: (voucher: PaymentVoucher) => boolean,
  canDeleteVoucher: (voucher: PaymentVoucher) => boolean,
  canProcessVoucher: (voucher: PaymentVoucher) => boolean,
) {
  return canProcessVoucher(voucher) || canEditVoucher(voucher) || canDeleteVoucher(voucher)
}

export function PaymentsTable({
  payments,
  vouchers,
  canManage,
  showUnappliedVouchers,
  canEditVoucher,
  canDeleteVoucher,
  canProcessVoucher,
  onEdit,
  onDelete,
  onEditVoucher,
  onDeleteVoucher,
  onApproveVoucher,
  onRejectVoucher,
}: {
  payments: Payment[]
  vouchers: PaymentVoucher[]
  canManage: boolean
  showUnappliedVouchers: boolean
  canEditVoucher: (voucher: PaymentVoucher) => boolean
  canDeleteVoucher: (voucher: PaymentVoucher) => boolean
  canProcessVoucher: (voucher: PaymentVoucher) => boolean
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  onEditVoucher: (voucher: PaymentVoucher) => void
  onDeleteVoucher: (voucher: PaymentVoucher) => void
  onApproveVoucher: (voucher: PaymentVoucher) => void
  onRejectVoucher: (voucher: PaymentVoucher) => void
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
    const unappliedVoucherRows = showUnappliedVouchers
      ? vouchers
          .filter((voucher) => isUnappliedVoucher(voucher))
          .map((voucher) => ({
            id: `voucher-${voucher.id}`,
            kind: "voucher" as const,
            voucher,
          }))
      : []

    return [...paymentRows, ...unappliedVoucherRows]
  }, [payments, showUnappliedVouchers, vouchers])

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
            <AnimatedNumber value={row.original.kind === "payment" ? row.original.payment.amount : row.original.voucher.amount} isCurrency />
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
            url={row.original.kind === "payment" ? getPaymentEvidenceUrl(row.original.payment) : getVoucherEvidenceUrl(row.original.voucher)}
          />
        ),
      },
      ...(canManage || rows.some((row) => row.kind === "voucher" && hasVoucherPaymentRowActions(row.voucher, canEditVoucher, canDeleteVoucher, canProcessVoucher))
        ? [{
            id: "actions",
            enableSorting: false,
            header: () => <DataTableStaticHeader title="" />,
            cell: ({ row }) => {
              const items = row.original.kind === "payment"
                ? getPaymentActions(row.original.payment, canManage, onEdit, onDelete)
                : getVoucherPaymentRowActions(
                    row.original.voucher,
                    canEditVoucher,
                    canDeleteVoucher,
                    canProcessVoucher,
                    onEditVoucher,
                    onDeleteVoucher,
                    onApproveVoucher,
                    onRejectVoucher,
                  )

              return items.length ? <RowActions items={items} /> : <span className="text-muted-foreground">-</span>
            },
          } satisfies ColumnDef<PaymentListRow>]
        : []),
    ],
    [
      canManage,
      canDeleteVoucher,
      canEditVoucher,
      canProcessVoucher,
      onApproveVoucher,
      onDelete,
      onDeleteVoucher,
      onEdit,
      onEditVoucher,
      onRejectVoucher,
      rows,
    ],
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
