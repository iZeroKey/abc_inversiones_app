import { LayoutGridIcon, SearchIcon, TableIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoansListPanel } from "@/features/loans/components/LoansListPanel"
import { statusFilters } from "@/features/loans/loan-constants"
import type { Loan, LoanStatus, PaginationMeta } from "@/types/loans"

const VIEW_PREFERENCE_KEY = "abc-loans-view"

function readViewPreference(): "cards" | "table" {
  try {
    const stored = localStorage.getItem(VIEW_PREFERENCE_KEY)
    if (stored === "cards" || stored === "table") return stored
  } catch { /* ignore */ }
  return "cards"
}

function writeViewPreference(view: "cards" | "table") {
  try {
    localStorage.setItem(VIEW_PREFERENCE_KEY, view)
  } catch { /* ignore */ }
}

export function SimpleLoansWorkspace({
  loans,
  highlightedLoanIds,
  pagination,
  page,
  statusFilter,
  searchQuery,
  loadingList,
  isFetchingList,
  listError,
  emptyMessage,
  perspective,
  onRetryList,
  onOpenLoan,
  onPageChange,
  onStatusFilterChange,
  onSearchQueryChange,
}: {
  loans: Loan[]
  highlightedLoanIds?: Set<string>
  pagination: PaginationMeta
  page: number
  statusFilter: "all" | LoanStatus
  searchQuery: string
  loadingList: boolean
  isFetchingList?: boolean
  listError: string | null
  emptyMessage: string
  perspective: "admin" | "client" | "investor"
  onRetryList: () => void
  onOpenLoan: (loan: Loan) => void
  onPageChange: (page: number) => void
  onStatusFilterChange: (status: "all" | LoanStatus) => void
  onSearchQueryChange: (query: string) => void
}) {
  const [viewMode, setViewMode] = useState<"cards" | "table">(readViewPreference)

  const handleViewModeChange = (value: string) => {
    const mode = value as "cards" | "table"
    setViewMode(mode)
    writeViewPreference(mode)
  }

  return (
    <section className="flex w-full flex-col gap-4">
      <div className="rounded-2xl bg-card p-4 shadow-xs/5">
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel>Buscar</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Código, cliente o monto"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
              />
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel>Estado</FieldLabel>
            <ScrollArea className="h-10 min-w-0" scrollFade>
              <div className="flex w-max items-center gap-2 px-0.5 py-0.5 pr-2">
                {statusFilters.map((status) => (
                  <Button
                    key={status.value}
                    variant={statusFilter === status.value ? "default" : "secondary"}
                    size="sm"
                    onClick={() => onStatusFilterChange(status.value)}
                    className="shrink-0 rounded-full px-3 shadow-none"
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </Field>
        </div>
      </div>


      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base font-semibold whitespace-nowrap">
            {perspective === "investor" ? "Inversiones" : "Préstamos"}
          </h2>
          {isFetchingList && <Spinner className="size-4 shrink-0" />}
          <p className="text-sm text-muted-foreground truncate">
            {pagination.total ?? loans.length} encontrados
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label="Vista">
          <Tabs value={viewMode} onValueChange={handleViewModeChange}>
            <TabsList className="w-fit">
              <TabsTrigger value="cards" className="gap-1.5">
                <LayoutGridIcon className="size-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5">
                <TableIcon className="size-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <LoansListPanel
        loans={loans}
        highlightedLoanIds={highlightedLoanIds}
        selectedLoan={null}
        viewMode={viewMode}
        pagination={pagination}
        page={page}
        loading={loadingList}
        isFetching={isFetchingList}
        error={listError}
        emptyMessage={emptyMessage}
        perspective={perspective}
        onRetry={onRetryList}
        onSelectLoan={onOpenLoan}
        onPageChange={onPageChange}
      />

    </section>
  )
}
