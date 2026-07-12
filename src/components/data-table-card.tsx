"use no memo"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"

import { ResponsivePagination } from "@/components/ResponsivePagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableColumnMeta = {
  headerClassName?: string
  cellClassName?: string
}

export type DataTablePagination = {
  page: number
  pageSize?: number
  totalPages: number
  total?: number
  itemLabel?: string
  onPageChange: (page: number) => void
}

type DataTableCardProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  bodyClassName?: string
  cardRows?: boolean
  className?: string
  clientPagination?: boolean
  emptyMessage?: string
  getRowAccentColor?: (row: TData) => string | undefined
  getRowClassName?: (row: TData) => string | undefined
  getRowId?: (row: TData, index: number) => string
  onRowClick?: (row: TData) => void
  pagination?: DataTablePagination
  tableClassName?: string
}

type DataTableSkeletonProps = {
  columns: Array<{
    className?: string
    cellClassName?: string
    headerWidth?: string
    cellWidth?: string
    cellRender?: () => React.ReactNode
  }>
  rows?: number
  tableClassName?: string
}


export function DataTableCard<TData, TValue>({
  columns,
  data,
  bodyClassName,
  cardRows = false,
  className,
  clientPagination = false,
  emptyMessage = "No hay resultados.",
  getRowAccentColor,
  getRowClassName,
  getRowId,
  onRowClick,
  pagination,
  tableClassName,
}: DataTableCardProps<TData, TValue>) {
// eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is incompatible with React Compiler; "use no memo" opts out
  const table = useReactTable({
    data,
    columns,
    enableSorting: false,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  })

  const rows = table.getRowModel().rows
  const visibleRows =
    clientPagination && pagination?.pageSize
      ? rows.slice(
        (Math.max(pagination.page, 1) - 1) * pagination.pageSize,
        Math.max(pagination.page, 1) * pagination.pageSize,
      )
      : rows

  const tableContent = (
    <Table className={tableClassName}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined

              return (
                <TableHead key={header.id} className={meta?.headerClassName}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className={bodyClassName}>
        {visibleRows.length ? (
          visibleRows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                "cursor-pointer",
                getRowClassName?.(row.original),
              )}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell, cellIndex) => {
                const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined
                const accentColor = cardRows && cellIndex === 0
                  ? getRowAccentColor?.(row.original)
                  : undefined

                return (
                  <TableCell
                    key={cell.id}
                    className={cn(meta?.cellClassName, "relative")}
                  >
                    {accentColor && (
                      <span
                        className={cn(
                          "absolute inset-y-1.5 left-0 w-1 rounded-full",
                          accentColor.replace("border-l-", "bg-"),
                        )}
                      />
                    )}
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                )
              })}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-24 text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3">
      <div className={cn("bg-card rounded-xl shadow-xs/5 overflow-hidden", className)}>
        {tableContent}
      </div>
      {pagination && <DataTablePaginationBar pagination={pagination} />}
    </div>
  )
}

export function DataTableSkeleton({
  columns,
  rows = 6,
  tableClassName,
}: DataTableSkeletonProps) {
  const content = (
    <Table className={tableClassName}>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={index} className={column.className}>
              <Skeleton className={cn("h-4", column.headerWidth ?? "w-20")} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {columns.map((column, columnIndex) => (
              <TableCell key={columnIndex} className={column.cellClassName}>
                {column.cellRender ? column.cellRender() : (
                  <Skeleton className={cn("h-5", column.cellWidth ?? column.headerWidth ?? "w-24")} />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className="flex min-w-0 max-w-full flex-col bg-card rounded-xl shadow-xs/5 overflow-hidden">
      {content}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTableColumnHeader({ title, align }: { column?: any; title: string; align?: "left" | "right" }) {
  return <DataTableStaticHeader title={title} align={align} />
}

export function DataTableStaticHeader({
  title,
  align = "left",
}: {
  title: string
  align?: "left" | "right"
}) {
  return (
    <span
      className={cn(
        "-mx-2 flex h-7 items-center px-2 text-sm font-medium text-muted-foreground",
        align === "right" && "ml-auto justify-end text-right",
      )}
    >
      {title}
    </span>
  )
}

export function DataTablePaginationBar({
  pagination,
}: {
  pagination: DataTablePagination
}) {
  const totalPages = Math.max(pagination.totalPages, 1)

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 w-full mt-2">
      {typeof pagination.total === "number" && (
        <span className="text-xs text-muted-foreground font-medium">
          Página {pagination.page} de {totalPages} · {pagination.total} {pagination.itemLabel ?? "registros"}
        </span>
      )}
      <ResponsivePagination
        currentPage={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.onPageChange}
        className="mt-0"
      />
    </div>
  )
}
