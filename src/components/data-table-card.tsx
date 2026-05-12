import { useState } from "react"
import { ArrowUpIcon } from "lucide-react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

import { CardFrame } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

type SortDirection = false | "asc" | "desc"

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
  className?: string
  clientPagination?: boolean
  emptyMessage?: string
  getRowClassName?: (row: TData) => string | undefined
  getRowId?: (row: TData, index: number) => string
  initialSorting?: SortingState
  pagination?: DataTablePagination
  tableClassName?: string
}

type DataTableSkeletonProps = {
  columns: Array<{
    className?: string
    cellClassName?: string
    headerWidth?: string
    cellWidth?: string
  }>
  rows?: number
  tableClassName?: string
}

export function DataTableCard<TData, TValue>({
  columns,
  data,
  bodyClassName,
  className,
  clientPagination = false,
  emptyMessage = "No hay resultados.",
  getRowClassName,
  getRowId,
  initialSorting = [],
  pagination,
  tableClassName,
}: DataTableCardProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(() => initialSorting)
  const handleSortingChange = (updater: SortingState | ((current: SortingState) => SortingState)) => {
    setSorting(updater)
    if (clientPagination && pagination && pagination.page !== 1) {
      pagination.onPageChange(1)
    }
  }

  // TanStack Table intentionally exposes imperative helpers from its hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: handleSortingChange,
    state: {
      sorting,
    },
  })

  const sortedRows = table.getRowModel().rows
  const visibleRows =
    clientPagination && pagination?.pageSize
      ? sortedRows.slice(
        (Math.max(pagination.page, 1) - 1) * pagination.pageSize,
        Math.max(pagination.page, 1) * pagination.pageSize,
      )
      : sortedRows

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3">
      <CardFrame className={cn("min-w-0 max-w-full", className)}>
        <Table variant="card" className={tableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined
                  const sortDirection = header.column.getIsSorted()
                  const headerContext = header.getContext()

                  return (
                    <TableHead key={header.id} className={meta?.headerClassName}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          Object.assign(headerContext, {
                            sortDirection,
                            toggleSorting: () =>
                              handleSortingChange((current) => {
                                const activeSort = current[0]
                                const isActive = activeSort?.id === header.column.id
                                const nextDesc = isActive ? !activeSort.desc : false

                                return [{ id: header.column.id, desc: nextDesc }]
                              }),
                          }),
                        )}
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
                  className={getRowClassName?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined

                    return (
                      <TableCell key={cell.id} className={meta?.cellClassName}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardFrame>

      {pagination && <DataTablePaginationBar pagination={pagination} />}
    </div>
  )
}

export function DataTableSkeleton({
  columns,
  rows = 6,
  tableClassName,
}: DataTableSkeletonProps) {
  return (
    <CardFrame>
      <Table variant="card" className={tableClassName}>
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
                  <Skeleton className={cn("h-5", column.cellWidth ?? column.headerWidth ?? "w-24")} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardFrame>
  )
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  align = "left",
  sortDirection,
  onSort,
}: {
  column: Column<TData, TValue>
  title: string
  align?: "left" | "right"
  sortDirection?: SortDirection
  onSort?: () => void
}) {
  const sorted = sortDirection ?? column.getIsSorted()

  if (!column.getCanSort()) {
    return (
      <span className={cn("block", align === "right" && "text-right")}>
        {title}
      </span>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-sort={
        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
      }
      className={cn(
        "-mx-2 h-7 bg-transparent px-2 text-sm font-medium text-muted-foreground shadow-none hover:bg-muted/40 hover:text-foreground",
        sorted && "text-foreground",
        align === "right" && "ml-auto",
      )}
      onClick={onSort ?? (() => column.toggleSorting(column.getIsSorted() === "asc"))}
    >
      {title}
      <ArrowUpIcon
        className={cn(
          "size-3.5 shrink-0 text-foreground transition-all duration-200 ease-out",
          sorted ? "scale-100 opacity-100" : "scale-75 opacity-0",
          sorted === "desc" && "rotate-180",
        )}
        data-icon="inline-end"
        aria-hidden={!sorted}
      />
    </Button>
  )
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

function DataTablePaginationBar({
  pagination,
}: {
  pagination: DataTablePagination
}) {
  const totalPages = Math.max(pagination.totalPages, 1)
  const visiblePages = getVisiblePaginationPages(pagination.page, totalPages)

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        Página {pagination.page} de {totalPages}
        {typeof pagination.total === "number"
          ? ` · ${pagination.total} ${pagination.itemLabel ?? "registros"}`
          : ""}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => pagination.onPageChange(Math.max(pagination.page - 1, 1))}
        >
          Anterior
        </Button>
        <div className="flex items-center gap-1">
          {visiblePages.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-9 min-w-9 items-center justify-center px-1 text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === pagination.page ? "default" : "outline"}
                size="sm"
                className="min-w-9 px-3 tabular-nums"
                onClick={() => pagination.onPageChange(item)}
              >
                {item}
              </Button>
            ),
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= totalPages}
          onClick={() => pagination.onPageChange(Math.min(pagination.page + 1, totalPages))}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}

function getVisiblePaginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: Array<number | "ellipsis"> = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) pages.push("ellipsis")

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < totalPages - 1) pages.push("ellipsis")
  pages.push(totalPages)

  return pages
}
