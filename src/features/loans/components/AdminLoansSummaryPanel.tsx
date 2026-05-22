import type { ColumnDef } from "@tanstack/react-table"
import { FileSpreadsheetIcon, RefreshCwIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

import {
  DataTableCard,
  DataTableColumnHeader,
  DataTableSkeleton,
} from "@/components/data-table-card"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoanStatusBadge } from "@/features/loans/components/LoanBadges"
import { frequencyLabels, statusLabels } from "@/features/loans/loan-constants"
import { formatDate, formatPreciseCurrencyWithSymbol, toNumber } from "@/features/loans/loan-utils"
import type { AdminLoanSummaryRow } from "@/types/loans"

type AdminLoansSummaryPanelProps = {
  rows: AdminLoanSummaryRow[]
  loading: boolean
  error: string | null
  searchQuery: string
  basePath: string
  onSearchQueryChange: (query: string) => void
  onRetry: () => void
}

export function AdminLoansSummaryPanel({
  rows,
  loading,
  error,
  searchQuery,
  basePath,
  onSearchQueryChange,
  onRetry,
}: AdminLoansSummaryPanelProps) {
  const [summaryView, setSummaryView] = useState("cards")

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return rows

    return rows.filter((row) =>
      [
        row.publicCode,
        row.clientCode,
        row.investorCode,
        row.clientName,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
  }, [rows, searchQuery])

  const totals = useMemo(
    () => ({
      principal: rows.reduce((total, row) => total + toNumber(row.principal), 0),
      paid: rows.reduce((total, row) => total + toNumber(row.paidAmount), 0),
      gain: rows.reduce((total, row) => total + toNumber(row.totalInterest), 0),
      debt: rows.reduce((total, row) => total + toNumber(row.remainingDebt), 0),
    }),
    [rows],
  )

  const summaryColumns = useMemo<ColumnDef<AdminLoanSummaryRow>[]>(
    () => [
      {
        id: "publicCode",
        accessorFn: (row) => row.publicCode ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Código préstamo" />
        ),
        cell: ({ row }) => <SummaryLoanLink row={row.original} basePath={basePath} />,
      },
      {
        id: "clientCode",
        accessorFn: (row) => row.clientCode ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cod. cliente" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.clientCode ?? "-"}</span>
        ),
      },
      {
        id: "clientName",
        accessorFn: (row) => row.clientName ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cliente" />
        ),
        cell: ({ row }) => (
          <span className="block max-w-48 truncate">
            {row.original.clientName ?? "Sin cliente"}
          </span>
        ),
      },
      {
        id: "date",
        accessorFn: (row) => row.creditDate ?? row.createdAt ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Fecha" />
        ),
        cell: ({ row }) => formatDate(row.original.creditDate ?? row.original.createdAt),
      },
      {
        id: "principal",
        accessorFn: (row) => toNumber(row.principal),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Crédito" align="right" />
        ),
        cell: ({ row }) => formatPreciseCurrencyWithSymbol(row.original.principal),
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        id: "frequency",
        accessorFn: (row) => frequencyLabels[String(row.frequency)] ?? row.frequency ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Modalidad" />
        ),
        cell: ({ row }) => frequencyLabels[String(row.original.frequency)] ?? row.original.frequency ?? "-",
      },
      {
        id: "rate",
        accessorFn: (row) => toNumber(row.interestRate),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tasa" />
        ),
        cell: ({ row }) => `${row.original.interestRate ?? 0}%`,
      },
      {
        id: "paid",
        accessorFn: (row) => toNumber(row.paidAmount),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Pagado" align="right" />
        ),
        cell: ({ row }) => formatPreciseCurrencyWithSymbol(row.original.paidAmount),
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        id: "gain",
        accessorFn: (row) => toNumber(row.totalInterest),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Ganancia" align="right" />
        ),
        cell: ({ row }) => formatPreciseCurrencyWithSymbol(row.original.totalInterest),
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        id: "debt",
        accessorFn: (row) => toNumber(row.remainingDebt),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Deuda" align="right" />
        ),
        cell: ({ row }) => formatPreciseCurrencyWithSymbol(row.original.remainingDebt),
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        id: "remainingInstallments",
        accessorFn: (row) => row.remainingInstallments ?? 0,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Restantes" align="right" />
        ),
        cell: ({ row }) => row.original.remainingInstallments ?? 0,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        id: "status",
        accessorFn: (row) => statusLabels[row.status ?? "pending"] ?? row.status ?? "Pendiente",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ row }) => <LoanStatusBadge status={row.original.status ?? "pending"} />,
      },
    ],
    [basePath],
  )

  if (error) {
    return (
      <Alert variant="error">
        <AlertTitle>No se pudo cargar el resumen</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <AlertAction>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon data-icon="inline-start" />
            Reintentar
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-normal">Resumen de préstamos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista administrativa con importes, ganancia, deuda y cuotas restantes.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Buscar préstamo o cliente"
            className="min-w-0 flex-1 lg:w-72"
          />
          <Button type="button" variant="outline" size="icon" onClick={onRetry} aria-label="Actualizar resumen">
            <RefreshCwIcon />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTotal label="Créditos" value={formatPreciseCurrencyWithSymbol(totals.principal)} loading={loading} />
        <SummaryTotal label="Pagado" value={formatPreciseCurrencyWithSymbol(totals.paid)} loading={loading} />
        <SummaryTotal label="Ganancia" value={formatPreciseCurrencyWithSymbol(totals.gain)} loading={loading} />
        <SummaryTotal label="Deuda" value={formatPreciseCurrencyWithSymbol(totals.debt)} loading={loading} />
      </div>

      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <p className="text-sm font-medium">{filteredRows.length} filas</p>
        <Tabs value={summaryView} onValueChange={setSummaryView}>
          <TabsList className="w-fit">
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="table">Tabla</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <SummarySkeleton />
      ) : filteredRows.length === 0 ? (
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileSpreadsheetIcon />
            </EmptyMedia>
            <EmptyTitle>No hay préstamos para resumir</EmptyTitle>
            <EmptyDescription>
              Cuando la API entregue filas administrativas aparecerán en esta tabla.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {summaryView === "cards" ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredRows.map((row) => (
                <SummaryCard key={row.id} row={row} basePath={basePath} />
              ))}
            </div>
          ) : (
            <DataTableCard
              columns={summaryColumns}
              data={filteredRows}
              getRowId={(row) => row.id}
              tableClassName="min-w-[1120px]"
              className="max-h-[min(620px,70vh)] overflow-auto"
            />
          )}
        </>
      )}
    </section>
  )
}

function SummaryTotal({
  label,
  value,
  loading,
}: {
  label: string
  value: string
  loading: boolean
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="mt-2 h-6 w-32" /> : <p className="mt-2 text-xl font-semibold">{value}</p>}
    </div>
  )
}

function SummaryCard({
  row,
  basePath,
}: {
  row: AdminLoanSummaryRow
  basePath: string
}) {
  return (
    <article className="rounded-lg border">
      <div className="flex flex-col gap-2 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <SummaryLoanLink row={row} basePath={basePath} />
            <p className="mt-1 truncate text-sm text-muted-foreground">{row.clientName ?? "Sin cliente"}</p>
          </div>
          <LoanStatusBadge status={row.status ?? "pending"} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 pt-0">
        <MobileMetric label="Crédito" value={formatPreciseCurrencyWithSymbol(row.principal)} />
        <MobileMetric label="Pagado" value={formatPreciseCurrencyWithSymbol(row.paidAmount)} />
        <MobileMetric label="Ganancia" value={formatPreciseCurrencyWithSymbol(row.totalInterest)} />
        <MobileMetric label="Deuda" value={formatPreciseCurrencyWithSymbol(row.remainingDebt)} />
        <MobileMetric label="Modalidad" value={frequencyLabels[String(row.frequency)] ?? row.frequency ?? "-"} />
        <MobileMetric label="Cuotas" value={String(row.remainingInstallments ?? 0)} />
      </div>
    </article>
  )
}

function SummaryLoanLink({
  row,
  basePath,
}: {
  row: AdminLoanSummaryRow
  basePath: string
}) {
  const code = row.publicCode

  return (
    <Link className="font-mono text-sm font-semibold underline-offset-4 hover:underline" to={code ? `${basePath}/${code}` : basePath}>
      {code ?? "Sin código"}
    </Link>
  )
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  )
}

function SummarySkeleton() {
  return (
    <DataTableSkeleton
      rows={6}
      tableClassName="min-w-[1120px]"
      columns={[
        { headerWidth: "w-28", cellWidth: "w-28" },
        { headerWidth: "w-24", cellWidth: "w-24" },
        { headerWidth: "w-20", cellWidth: "w-36" },
        { headerWidth: "w-16", cellWidth: "w-24" },
        { className: "text-right", headerWidth: "ml-auto w-20", cellWidth: "ml-auto w-24" },
        { headerWidth: "w-20", cellWidth: "w-20" },
        { headerWidth: "w-12", cellWidth: "w-12" },
        { className: "text-right", headerWidth: "ml-auto w-20", cellWidth: "ml-auto w-24" },
        { className: "text-right", headerWidth: "ml-auto w-20", cellWidth: "ml-auto w-24" },
        { className: "text-right", headerWidth: "ml-auto w-20", cellWidth: "ml-auto w-24" },
        { className: "text-right", headerWidth: "ml-auto w-16", cellWidth: "ml-auto w-12" },
        { headerWidth: "w-16", cellWidth: "w-20" },
      ]}
    />
  )
}
