import { useCallback, useMemo, useState } from "react"
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ListChecksIcon,
  ReceiptTextIcon,
  Settings2Icon,
} from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTableCard, DataTableColumnHeader } from "@/components/data-table-card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ResponsiveSheetContent,
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetTitle,
} from "@/components/ui/responsive-sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { LoanStatusBadge } from "@/features/loans/components/LoanBadges"
import { LoanDetailPanel, type RelatedData } from "@/features/loans/components/LoanDetailPanel"
import { ErrorState, LoanListSkeleton } from "@/features/loans/components/LoanPageStates"
import { frequencyLabels, statusFilters, statusLabels } from "@/features/loans/loan-constants"
import {
  formatDate,
  formatPreciseCurrencyWithSymbol,
  getLoanPaidAmount,
  getLoanProgress,
  getRemainingDebt,
  loanClientName,
  loanInvestorName,
  loanPublicCode,
  normalizeStatus,
  toNumber,
} from "@/features/loans/loan-utils"
import { formatCurrencyPrecise } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { Loan, LoanStatus, PaginationMeta } from "@/types/loans"

type OperationsFocus = "all" | "review" | "active" | "risk" | "company"
type OperationsView = "table" | "cards"

type ColumnKey =
  | "publicCode"
  | "client"
  | "investor"
  | "status"
  | "creditDate"
  | "frequency"
  | "principal"
  | "totalDebt"
  | "remainingDebt"
  | "paid"
  | "progress"
  | "installments"
  | "rate"

type ColumnDefinition = {
  key: ColumnKey
  label: string
  defaultVisible: boolean
  group: "Identificación" | "Condiciones" | "Importes" | "Seguimiento"
  align?: "left" | "right"
  render: (loan: Loan) => React.ReactNode
  exportValue: (loan: Loan) => string | number
  sortValue: (loan: Loan) => string | number
}

type AdminLoansOperationsPanelProps = {
  loans: Loan[]
  selectedLoan: Loan | null
  pagination: PaginationMeta
  page: number
  statusFilter: "all" | LoanStatus
  searchQuery: string
  loadingList: boolean
  listError: string | null
  emptyMessage: string
  relatedData: RelatedData
  loadingDetail: boolean
  detailError: string | null
  canReview: boolean
  basePath: string
  onRetryList: () => void
  onSelectLoan: (loan: Loan) => void
  onPageChange: (page: number) => void
  onStatusFilterChange: (status: "all" | LoanStatus) => void
  onSearchQueryChange: (query: string) => void
  onApprove: () => void
  onReject: () => void
  onRetryDetail: () => void
  onDataChanged?: () => Promise<void> | void
}

const focusOptions: Array<{ value: OperationsFocus; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "review", label: "Por revisar" },
  { value: "active", label: "Activos" },
  { value: "risk", label: "Riesgo" },
  { value: "company", label: "ABC" },
]

const columns: ColumnDefinition[] = [
  {
    key: "publicCode",
    label: "Préstamo",
    defaultVisible: true,
    group: "Identificación",
    render: (loan) => (
      <div className="min-w-0">
        <p className="font-mono text-xs font-semibold">{loanPublicCode(loan)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(loan.startDate ?? loan.createdAt)}</p>
      </div>
    ),
    exportValue: (loan) => loanPublicCode(loan),
    sortValue: (loan) => loan.publicCode ?? "",
  },
  {
    key: "client",
    label: "Cliente",
    defaultVisible: true,
    group: "Identificación",
    render: (loan) => <span className="block max-w-44 truncate text-sm font-medium">{loanClientName(loan)}</span>,
    exportValue: (loan) => loanClientName(loan),
    sortValue: (loan) => loanClientName(loan),
  },
  {
    key: "investor",
    label: "Inversionista",
    defaultVisible: true,
    group: "Identificación",
    render: (loan) => <span className="block max-w-44 truncate text-sm">{loanInvestorName(loan)}</span>,
    exportValue: (loan) => loanInvestorName(loan),
    sortValue: (loan) => loanInvestorName(loan),
  },
  {
    key: "status",
    label: "Estado",
    defaultVisible: true,
    group: "Seguimiento",
    render: (loan) => <LoanStatusBadge status={normalizeStatus(loan)} />,
    exportValue: (loan) => statusLabels[normalizeStatus(loan)] ?? normalizeStatus(loan),
    sortValue: (loan) => statusLabels[normalizeStatus(loan)] ?? normalizeStatus(loan),
  },
  {
    key: "creditDate",
    label: "Fecha",
    defaultVisible: false,
    group: "Identificación",
    render: (loan) => formatDate(loan.startDate ?? loan.createdAt),
    exportValue: (loan) => formatDate(loan.startDate ?? loan.createdAt),
    sortValue: (loan) => getLoanDateValue(loan),
  },
  {
    key: "frequency",
    label: "Modalidad",
    defaultVisible: true,
    group: "Condiciones",
    render: (loan) => frequencyLabels[String(loan.frequency)] ?? loan.frequency ?? "-",
    exportValue: (loan) => frequencyLabels[String(loan.frequency)] ?? loan.frequency ?? "-",
    sortValue: (loan) => frequencyLabels[String(loan.frequency)] ?? String(loan.frequency ?? ""),
  },
  {
    key: "principal",
    label: "Principal",
    defaultVisible: true,
    group: "Importes",
    align: "right",
    render: (loan) => formatPreciseCurrencyWithSymbol(loan.principal),
    exportValue: (loan) => toNumber(loan.principal),
    sortValue: (loan) => toNumber(loan.principal),
  },
  {
    key: "totalDebt",
    label: "Deuda total",
    defaultVisible: false,
    group: "Importes",
    align: "right",
    render: (loan) => formatPreciseCurrencyWithSymbol(loan.totalDebt),
    exportValue: (loan) => toNumber(loan.totalDebt),
    sortValue: (loan) => toNumber(loan.totalDebt),
  },
  {
    key: "remainingDebt",
    label: "Pendiente",
    defaultVisible: true,
    group: "Importes",
    align: "right",
    render: (loan) => formatPreciseCurrencyWithSymbol(getRemainingDebt(loan)),
    exportValue: (loan) => getRemainingDebt(loan),
    sortValue: (loan) => getRemainingDebt(loan),
  },
  {
    key: "paid",
    label: "Pagado",
    defaultVisible: false,
    group: "Importes",
    align: "right",
    render: (loan) => formatPreciseCurrencyWithSymbol(getLoanPaidAmount(loan)),
    exportValue: (loan) => getLoanPaidAmount(loan),
    sortValue: (loan) => getLoanPaidAmount(loan),
  },
  {
    key: "progress",
    label: "Avance",
    defaultVisible: true,
    group: "Seguimiento",
    align: "right",
    render: (loan) => `${Math.round(getLoanProgress(loan))}%`,
    exportValue: (loan) => Math.round(getLoanProgress(loan)),
    sortValue: (loan) => getLoanProgress(loan),
  },
  {
    key: "installments",
    label: "Cuotas",
    defaultVisible: true,
    group: "Seguimiento",
    align: "right",
    render: (loan) => loan.installmentsCount ?? "-",
    exportValue: (loan) => loan.installmentsCount ?? "",
    sortValue: (loan) => loan.installmentsCount ?? 0,
  },
  {
    key: "rate",
    label: "Tasa",
    defaultVisible: false,
    group: "Condiciones",
    align: "right",
    render: (loan) => `${loan.interestRate ?? 0}%`,
    exportValue: (loan) => toNumber(loan.interestRate),
    sortValue: (loan) => toNumber(loan.interestRate),
  },
]

const defaultVisibleColumns = columns
  .filter((column) => column.defaultVisible)
  .map((column) => column.key)
const columnGroups: Array<ColumnDefinition["group"]> = [
  "Identificación",
  "Condiciones",
  "Importes",
  "Seguimiento",
]
const brandLogoUrl = new URL("../../../assets/icon-name-abc.png", import.meta.url).href
const operationsPreferencesKey = "abc-loans-operations-preferences"

type OperationsPreferences = {
  view?: OperationsView
  focus?: OperationsFocus
  visibleColumns?: ColumnKey[]
}

function readOperationsPreferences(): OperationsPreferences {
  try {
    return JSON.parse(localStorage.getItem(operationsPreferencesKey) ?? "{}") as OperationsPreferences
  } catch {
    return {}
  }
}

function writeOperationsPreferences(nextPreferences: OperationsPreferences) {
  const currentPreferences = readOperationsPreferences()
  localStorage.setItem(operationsPreferencesKey, JSON.stringify({ ...currentPreferences, ...nextPreferences }))
}

export function AdminLoansOperationsPanel({
  loans,
  selectedLoan,
  pagination,
  page,
  statusFilter,
  searchQuery,
  loadingList,
  listError,
  emptyMessage,
  relatedData,
  loadingDetail,
  detailError,
  canReview,
  basePath,
  onRetryList,
  onSelectLoan,
  onPageChange,
  onStatusFilterChange,
  onSearchQueryChange,
  onApprove,
  onReject,
  onRetryDetail,
  onDataChanged,
}: AdminLoansOperationsPanelProps) {
  const [view, setView] = useState<OperationsView>(() => readOperationsPreferences().view ?? "table")
  const [focus, setFocus] = useState<OperationsFocus>(() => readOperationsPreferences().focus ?? "all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<ColumnKey[]>(() => {
    const savedColumns = readOperationsPreferences().visibleColumns?.filter((key) =>
      columns.some((column) => column.key === key),
    )
    return savedColumns?.length ? savedColumns : defaultVisibleColumns
  })
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleColumnKeys.includes(column.key)),
    [visibleColumnKeys],
  )

  const operationRows = useMemo(
    () =>
      loans.filter((loan) => {
      const status = normalizeStatus(loan)
      const dateValue = getLoanDateValue(loan)
      const fromValue = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
      const toValue = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null

      if (focus === "review" && status !== "pending" && status !== "pending_investor_review") return false
      if (focus === "active" && status !== "active" && status !== "approved") return false
      if (focus === "risk" && status !== "defaulted") return false
      if (focus === "company" && (loan.investorId || loan.investorName || loan.investor)) return false
      if (fromValue !== null && dateValue < fromValue) return false
      if (toValue !== null && dateValue > toValue) return false

      return true
      }),
    [dateFrom, dateTo, focus, loans],
  )

  const selectedRows = useMemo(
    () => operationRows.filter((loan) => selectedIds.includes(loan.id)),
    [operationRows, selectedIds],
  )

  const totals = useMemo(
    () => ({
      portfolio: operationRows.reduce((total, loan) => total + toNumber(loan.principal), 0),
      pending: operationRows.reduce((total, loan) => total + getRemainingDebt(loan), 0),
      review: operationRows.filter((loan) => {
        const status = normalizeStatus(loan)
        return status === "pending" || status === "pending_investor_review"
      }).length,
      risk: operationRows.filter((loan) => normalizeStatus(loan) === "defaulted").length,
    }),
    [operationRows],
  )

  const totalPages = Math.max(pagination.totalPages ?? 1, 1)
  const allVisibleSelected = operationRows.length > 0 && selectedRows.length === operationRows.length

  const handleToggleColumn = (key: ColumnKey, checked: boolean) => {
    setVisibleColumnKeys((current) => {
      if (checked) {
        const nextColumns = [...new Set([...current, key])]
        writeOperationsPreferences({ visibleColumns: nextColumns })
        return nextColumns
      }
      if (current.length === 1) return current
      const nextColumns = current.filter((columnKey) => columnKey !== key)
      writeOperationsPreferences({ visibleColumns: nextColumns })
      return nextColumns
    })
  }

  const handleToggleRow = useCallback((loanId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, loanId])] : current.filter((id) => id !== loanId),
    )
  }, [])

  const handleToggleVisibleRows = useCallback((checked: boolean) => {
    setSelectedIds(checked ? operationRows.map((loan) => loan.id) : [])
  }, [operationRows])

  const handleInspectLoan = useCallback((loan: Loan) => {
    onSelectLoan(loan)
    setDetailOpen(true)
  }, [onSelectLoan])

  const operationColumns = useMemo<ColumnDef<Loan>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={(checked) => handleToggleVisibleRows(Boolean(checked))}
            aria-label="Seleccionar préstamos visibles"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={(nextChecked) =>
              handleToggleRow(row.original.id, Boolean(nextChecked))
            }
            aria-label={`Seleccionar ${loanPublicCode(row.original)}`}
          />
        ),
        meta: {
          headerClassName: "w-10",
        },
      },
      ...visibleColumns.map<ColumnDef<Loan>>((column) => ({
        id: column.key,
        accessorFn: (loan) => column.sortValue(loan),
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title={column.label}
            align={column.align}
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) =>
          column.key === "publicCode" ? (
            <LoanCodeCell loan={row.original} onInspect={handleInspectLoan} />
          ) : (
            column.render(row.original)
          ),
        meta: {
          headerClassName: cn(column.align === "right" && "text-right"),
          cellClassName: cn(column.align === "right" && "text-right"),
        },
      })),
    ],
    [
      allVisibleSelected,
      handleInspectLoan,
      handleToggleRow,
      handleToggleVisibleRows,
      selectedIds,
      visibleColumns,
    ],
  )

  const exportRows = selectedRows

  return (
    <section className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OperationKpi label="Cartera filtrada" value={formatPreciseCurrencyWithSymbol(totals.portfolio)} loading={loadingList} />
        <OperationKpi label="Saldo pendiente" value={formatPreciseCurrencyWithSymbol(totals.pending)} loading={loadingList} />
        <OperationKpi label="Por revisar" value={totals.review} loading={loadingList} />
        <OperationKpi label="En riesgo" value={totals.risk} loading={loadingList} />
      </div>

      <div className="flex flex-col gap-4 border-b pb-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <ListChecksIcon className="size-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-normal">Mesa administrativa</h2>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Resumen, selección, exportación y detalle operativo en una sola vista.
          </p>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(280px,1fr)_minmax(180px,240px)_minmax(180px,240px)]">
          <input
            className="h-9 min-w-0 rounded-lg border bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Buscar código, cliente o inversionista"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
          <DatePickerFilter label="Desde" value={dateFrom} onChange={setDateFrom} />
          <DatePickerFilter label="Hasta" value={dateTo} onChange={setDateTo} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <FilterGroup label="Vista">
            {focusOptions.map((option) => (
              <Button
                key={option.value}
                variant={focus === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFocus(option.value)
                  writeOperationsPreferences({ focus: option.value })
                }}
              >
                {option.label}
              </Button>
            ))}
          </FilterGroup>
          <FilterGroup label="Estado">
            {statusFilters.map((status) => (
              <Button
                key={status.value}
                variant={statusFilter === status.value ? "secondary" : "outline"}
                size="sm"
                onClick={() => onStatusFilterChange(status.value)}
              >
                {status.label}
              </Button>
            ))}
          </FilterGroup>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SelectionSummary total={operationRows.length} selected={selectedRows.length} />
          <ViewModeSwitch
            value={view}
            onChange={(nextView) => {
              setView(nextView)
              writeOperationsPreferences({ view: nextView })
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
          {view === "table" && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="col-span-2 h-8 w-full sm:w-auto" />}>
                <Settings2Icon data-icon="inline-start" />
                Columnas
                <ChevronDownIcon data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {columnGroups.map((group) => (
                  <DropdownMenuGroup key={group}>
                    <DropdownMenuLabel>{group}</DropdownMenuLabel>
                    {columns
                      .filter((column) => column.group === group)
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.key}
                          checked={visibleColumnKeys.includes(column.key)}
                          onCheckedChange={(checked) => handleToggleColumn(column.key, Boolean(checked))}
                        >
                          {column.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full sm:w-auto"
            disabled={exportRows.length === 0}
            onClick={() => void exportToExcel(exportRows, visibleColumns)}
          >
            <FileSpreadsheetIcon data-icon="inline-start" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full sm:w-auto"
            disabled={exportRows.length === 0}
            onClick={() => exportToPdf(exportRows, visibleColumns)}
          >
            <FileTextIcon data-icon="inline-start" />
            PDF
          </Button>
        </div>
      </div>

      {loadingList ? (
        <LoanListSkeleton variant={view === "table" ? "table" : "cards"} />
      ) : listError ? (
        <ErrorState message={listError} onRetry={onRetryList} />
      ) : operationRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">Sin préstamos en esta vista</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {operationRows.map((loan) => (
            <OperationCard
              key={loan.id}
              loan={loan}
              checked={selectedIds.includes(loan.id)}
              active={detailOpen && selectedLoan?.id === loan.id}
              onCheckedChange={(checked) => handleToggleRow(loan.id, checked)}
              onInspect={handleInspectLoan}
            />
          ))}
        </div>
      ) : (
        <DataTableCard
          columns={operationColumns}
          data={operationRows}
          getRowId={(loan) => loan.id}
          getRowClassName={(loan) =>
            cn(detailOpen && selectedLoan?.id === loan.id && "bg-accent/40")
          }
          tableClassName="min-w-[1180px]"
          initialSorting={[{ id: "publicCode", desc: true }]}
          pagination={
            totalPages > 1
              ? {
                  page,
                  totalPages,
                  total: pagination.total,
                  itemLabel: "préstamos",
                  onPageChange,
                }
              : undefined
          }
        />
      )}

      {view === "cards" && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(page - 1, 1))}
          >
            Anterior
          </Button>
          <span className="rounded-lg border px-3 py-1 text-sm text-muted-foreground">
            {page} de {totalPages}
          </span>
          <Button
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          >
            Siguiente
          </Button>
        </div>
      )}

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <ResponsiveSheetContent
          contentKey={selectedLoan?.id ?? "loan-detail"}
          defaultDesktopWidth={760}
          minDesktopWidth={560}
          maxDesktopWidth={1080}
          showCloseButton
        >
          <SheetHeader>
            <SheetTitle>Detalle operativo</SheetTitle>
            <SheetDescription>
              Revisa cronograma, pagos, vouchers y acciones del préstamo seleccionado.
            </SheetDescription>
          </SheetHeader>
          <SheetPanel className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
            <LoanDetailPanel
              loan={selectedLoan}
              relatedData={relatedData}
              loading={loadingDetail}
              error={detailError}
              canReview={canReview}
              basePath={basePath}
              onApprove={onApprove}
              onReject={onReject}
              onRetry={onRetryDetail}
              onDataChanged={onDataChanged}
              sticky={false}
              hideBackButton
              paymentPresentation="panel"
            />
          </SheetPanel>
        </ResponsiveSheetContent>
      </Sheet>
    </section>
  )
}

function DatePickerFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedDate = value ? parseInputDate(value) ?? undefined : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" className="h-9 w-full justify-start font-normal" />}>
        <CalendarIcon data-icon="inline-start" />
        <span className="text-muted-foreground">{label}</span>
        <span className="truncate">
          {selectedDate
            ? new Intl.DateTimeFormat("es-PE", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(selectedDate)
            : "Sin límite"}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return
            onChange(formatInputDate(date))
            setOpen(false)
          }}
        />
        {value && (
          <div className="mt-2 border-t p-3">
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => onChange("")}>
              Limpiar fecha
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 border-l-2 border-primary/25 pl-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <ScrollArea className="h-8 min-w-0" scrollFade>
        <div className="flex w-max gap-2 pb-1 pr-2">{children}</div>
      </ScrollArea>
    </div>
  )
}

function ViewModeSwitch({
  value,
  onChange,
}: {
  value: OperationsView
  onChange: (value: OperationsView) => void
}) {
  return (
    <div className="relative grid h-8 grid-cols-2 overflow-hidden rounded-lg border bg-background p-0.5 text-sm shadow-xs/5 sm:w-52">
      <span
        className={cn(
          "absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-primary shadow-sm transition-transform duration-200 ease-out",
          value === "cards" && "translate-x-[calc(100%+4px)]",
        )}
      />
      {(["table", "cards"] as OperationsView[]).map((option) => {
        const active = value === option
        return (
          <button
            key={option}
            type="button"
            className={cn(
              "relative z-10 rounded-md px-3 font-medium text-muted-foreground transition-colors",
              active && "text-primary-foreground",
            )}
            onClick={() => onChange(option)}
          >
            {option === "table" ? "Tabla" : "Tarjetas"}
          </button>
        )
      })}
    </div>
  )
}

function SelectionSummary({
  total,
  selected,
}: {
  total: number
  selected: number
}) {
  return (
    <div className="grid h-8 grid-cols-2 overflow-hidden rounded-lg border bg-background text-sm sm:flex sm:w-fit">
      <span className="px-3 text-center leading-8 text-muted-foreground">{total} filas</span>
      <span
        className={cn(
          "border-l px-3 text-center font-medium leading-8",
          selected > 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        {selected} seleccionadas
      </span>
    </div>
  )
}

function OperationKpi({
  label,
  value,
  loading = false,
}: {
  label: string
  value: string | number
  loading?: boolean
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-muted/20 p-3 sm:p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-28 max-w-full" />
      ) : (
        <p className="mt-2 break-words text-xl font-semibold tracking-normal tabular-nums lg:text-2xl">{value}</p>
      )}
    </div>
  )
}

function LoanCodeCell({
  loan,
  onInspect,
}: {
  loan: Loan
  onInspect: (loan: Loan) => void
}) {
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="font-mono text-xs font-semibold underline-offset-4 hover:underline"
        onClick={() => onInspect(loan)}
      >
        {loanPublicCode(loan)}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">{formatDate(loan.startDate ?? loan.createdAt)}</p>
    </div>
  )
}

function OperationCard({
  loan,
  checked,
  active,
  onCheckedChange,
  onInspect,
}: {
  loan: Loan
  checked: boolean
  active: boolean
  onCheckedChange: (checked: boolean) => void
  onInspect: (loan: Loan) => void
}) {
  const progress = Math.round(getLoanProgress(loan))

  return (
    <article
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        active && "border-primary/40 bg-accent/30",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(nextChecked) => onCheckedChange(Boolean(nextChecked))}
        aria-label={`Seleccionar ${loanPublicCode(loan)}`}
      />
      <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onInspect(loan)}>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary">
          <ReceiptTextIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">S/ {formatCurrencyPrecise(loan.principal)}</p>
            <LoanStatusBadge status={normalizeStatus(loan)} />
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{loanPublicCode(loan)}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {loanClientName(loan)} · {progress}% pagado
          </p>
        </div>
        <ChevronRightIcon className="shrink-0 text-muted-foreground" />
      </button>
    </article>
  )
}

function getLoanDateValue(loan: Loan) {
  const date = new Date(loan.startDate ?? loan.createdAt ?? "").getTime()
  return Number.isFinite(date) ? date : 0
}

function parseInputDate(value: string) {
  if (!value) return null

  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null

  date.setHours(0, 0, 0, 0)
  return date
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

async function exportToExcel(rows: Loan[], activeColumns: ColumnDefinition[]) {
  const XLSX = await import("xlsx-js-style")
  const generatedAt = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date())
  const headerRowIndex = 3
  const lastColumnIndex = Math.max(activeColumns.length - 1, 0)
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["ABC Inversiones"],
    ["Préstamos seleccionados"],
    [`Reporte operativo · ${generatedAt} · ${rows.length} filas`],
    activeColumns.map((column) => column.label),
    ...rows.map((loan) => activeColumns.map((column) => getExcelCellValue(column, loan))),
  ])

  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1")
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumnIndex } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumnIndex } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColumnIndex } },
  ]
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: { r: range.e.r, c: lastColumnIndex },
    }),
  }
  worksheet["!rows"] = [
    { hpt: 24 },
    { hpt: 22 },
    { hpt: 18 },
    { hpt: 22 },
  ]

  const titleCell = worksheet.A1
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 18, color: { rgb: "10172F" } },
      alignment: { vertical: "center" },
    }
  }

  const subtitleCell = worksheet.A2
  if (subtitleCell) {
    subtitleCell.s = {
      font: { bold: true, sz: 13, color: { rgb: "10172F" } },
      alignment: { vertical: "center" },
    }
  }

  const metaCell = worksheet.A3
  if (metaCell) {
    metaCell.s = {
      font: { sz: 10, color: { rgb: "667085" } },
      alignment: { vertical: "center" },
    }
  }

  for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
    const definition = activeColumns[columnIndex]
    const headerAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: columnIndex })
    const headerCell = worksheet[headerAddress]
    if (headerCell) {
      headerCell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "10172F" } },
        alignment: { horizontal: definition.align === "right" ? "right" : "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "10172F" } },
          bottom: { style: "thin", color: { rgb: "10172F" } },
        },
      }
    }

    for (let rowIndex = headerRowIndex + 1; rowIndex <= range.e.r; rowIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })
      const cell = worksheet[address]
      if (!cell) continue

      cell.s = {
        font: { color: { rgb: "111827" } },
        alignment: { horizontal: definition.align === "right" ? "right" : "left", vertical: "center" },
        border: {
          bottom: { style: "thin", color: { rgb: "D7DCE7" } },
        },
      }
      if (rowIndex % 2 === 0) {
        cell.s.fill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } }
      }
      if (isMoneyColumn(definition.key)) cell.s.numFmt = '"S/ " #,##0.00'
      if (definition.key === "rate" || definition.key === "progress") cell.s.numFmt = "0.00%"
      if (definition.key === "creditDate") cell.s.numFmt = "dd mmm yyyy"
    }
  }

  worksheet["!cols"] = activeColumns.map((column) => ({ wch: getExcelColumnWidth(column) }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Prestamos")
  XLSX.writeFile(workbook, `prestamos-seleccionados-${formatDownloadTimestamp()}.xlsx`, {
    bookType: "xlsx",
  })
}

function exportToPdf(rows: Loan[], activeColumns: ColumnDefinition[]) {
  const filename = `prestamos-seleccionados-${formatDownloadTimestamp()}`
  const absoluteLogoUrl = new URL(brandLogoUrl, window.location.href).href
  const tableRows = rows
    .map((loan) =>
      `<tr>${activeColumns
        .map((column) => `<td>${escapeHtml(formatExportValue(column, loan))}</td>`)
        .join("")}</tr>`,
    )
    .join("")
  const tableHeaders = activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")
  const timestamp = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date())
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${filename}</title>
        <style>
          :root { --brand: #10172f; --accent: #00a86b; --line: #d7dce7; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #111827; }
          header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid var(--brand); padding-bottom: 18px; margin-bottom: 22px; }
          .brand { display: flex; align-items: center; gap: 12px; }
          .logo { height: 42px; width: auto; object-fit: contain; filter: brightness(0) saturate(100%) invert(8%) sepia(20%) saturate(2133%) hue-rotate(196deg) brightness(91%) contrast(93%); }
          .mark { width: 42px; height: 42px; border-radius: 12px; background: var(--brand); color: white; display: grid; place-items: center; font-weight: 800; }
          h1 { font-size: 20px; margin: 0; color: var(--brand); }
          .meta { color: #667085; font-size: 12px; margin-top: 4px; }
          .pill { border: 1px solid var(--line); border-radius: 999px; padding: 6px 10px; font-size: 12px; color: #475467; }
          table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
          th, td { border-bottom: 1px solid var(--line); padding: 7px 6px; text-align: left; }
          th { background: #f6f8fb; color: #344054; font-weight: 700; }
          tr:nth-child(even) td { background: #fbfcfe; }
          footer { margin-top: 18px; color: #667085; font-size: 11px; }
        </style>
      </head>
      <body>
        <header>
          <div class="brand">
            <img class="logo" src="${absoluteLogoUrl}" alt="ABC Inversiones" />
              <div>
                <h1>Préstamos seleccionados</h1>
              <div class="meta">ABC Inversiones · Reporte operativo · ${escapeHtml(timestamp)}</div>
            </div>
          </div>
          <div class="pill">${rows.length} filas</div>
        </header>
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <footer>Generado desde la mesa administrativa de ABC Inversiones.</footer>
        <script>
          const logo = document.querySelector(".logo");
          const printNow = () => setTimeout(() => window.print(), 120);
          if (logo && !logo.complete) {
            logo.addEventListener("load", printNow, { once: true });
            logo.addEventListener("error", printNow, { once: true });
          } else {
            printNow();
          }
        </script>
      </body>
    </html>
  `
  const printWindow = window.open("", "_blank")
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
}

function getExcelCellValue(column: ColumnDefinition, loan: Loan) {
  const value = column.exportValue(loan)

  if (column.key === "creditDate") {
    const date = new Date(loan.startDate ?? loan.createdAt ?? "")
    return Number.isFinite(date.getTime()) ? date : ""
  }

  if (isMoneyColumn(column.key) || column.key === "installments") {
    return toNumber(value)
  }

  if (column.key === "rate" || column.key === "progress") {
    return toNumber(value) / 100
  }

  return value
}

function getExcelColumnWidth(column: ColumnDefinition) {
  if (column.key === "client" || column.key === "investor") return 24
  if (isMoneyColumn(column.key)) return 16
  if (column.key === "publicCode") return 14
  if (column.key === "creditDate") return 14
  return 13
}

function formatExportValue(column: ColumnDefinition, loan: Loan) {
  const value = column.exportValue(loan)

  if (isMoneyColumn(column.key)) {
    return formatPreciseCurrencyWithSymbol(toNumber(value))
  }

  if (column.key === "rate" || column.key === "progress") {
    return `${toNumber(value).toLocaleString("es-PE", { minimumFractionDigits: column.key === "rate" ? 2 : 0, maximumFractionDigits: 2 })}%`
  }

  return String(value)
}

function isMoneyColumn(key: ColumnKey) {
  return key === "principal" || key === "totalDebt" || key === "remainingDebt" || key === "paid"
}

function formatDownloadTimestamp() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}
