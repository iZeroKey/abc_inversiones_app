import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { FileSpreadsheetIcon, RefreshCwIcon } from "lucide-react"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoanStatusBadge } from "@/features/loans/components/LoanBadges"
import { frequencyLabels } from "@/features/loans/loan-constants"
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
            <ScrollArea className="h-[min(620px,70vh)] w-full rounded-lg border" scrollbarGutter>
              <div className="min-w-[1120px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código préstamo</TableHead>
                      <TableHead>Cod. cliente</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Crédito</TableHead>
                      <TableHead>Modalidad</TableHead>
                      <TableHead>Tasa</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                      <TableHead className="text-right">Deuda</TableHead>
                      <TableHead className="text-right">Restantes</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <SummaryLoanLink row={row} basePath={basePath} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.clientCode ?? "-"}</TableCell>
                        <TableCell className="max-w-48 truncate">{row.clientName ?? "Sin cliente"}</TableCell>
                        <TableCell>{formatDate(row.creditDate ?? row.createdAt)}</TableCell>
                        <TableCell className="text-right">{formatPreciseCurrencyWithSymbol(row.principal)}</TableCell>
                        <TableCell>{frequencyLabels[String(row.frequency)] ?? row.frequency ?? "-"}</TableCell>
                        <TableCell>{row.interestRate ?? 0}%</TableCell>
                        <TableCell className="text-right">{formatPreciseCurrencyWithSymbol(row.paidAmount)}</TableCell>
                        <TableCell className="text-right">{formatPreciseCurrencyWithSymbol(row.totalInterest)}</TableCell>
                        <TableCell className="text-right">{formatPreciseCurrencyWithSymbol(row.remainingDebt)}</TableCell>
                        <TableCell className="text-right">{row.remainingInstallments ?? 0}</TableCell>
                        <TableCell>
                          <LoanStatusBadge status={row.status ?? "pending"} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
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
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  )
}
