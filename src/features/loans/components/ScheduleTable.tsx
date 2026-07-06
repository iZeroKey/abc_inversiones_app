import type { Column, ColumnDef } from "@tanstack/react-table"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import {
  DataTableCard,
  DataTableColumnHeader,
} from "@/components/data-table-card"
import { InstallmentBadge } from "@/features/loans/components/LoanBadges"
import {
  CompactEmpty,
  relatedEmptyIcons,
} from "@/features/loans/components/LoanPageStates"
import { installmentStatusLabels } from "@/features/loans/loan-constants"
import { formatDate, getInstallmentDisplayStatus } from "@/features/loans/loan-utils"
import type { Installment } from "@/types/loans"

type SortDirection = false | "asc" | "desc"

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
    cell: ({ row }) => <AnimatedNumber value={row.original.amount} isCurrency />,
  },
  {
    id: "paid",
    accessorFn: (installment) => Number(installment.paidAmount ?? 0),
    header: sortableHeader("Pagado"),
    cell: ({ row }) => <AnimatedNumber value={row.original.paidAmount} isCurrency />,
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

export function ScheduleTable({ installments }: { installments: Installment[] }) {
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
      tableVariant="clean"
      tableClassName="min-w-[620px]"
    />
  )
}
