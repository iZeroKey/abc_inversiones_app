import type { ColumnDef } from "@tanstack/react-table"
import { SearchIcon, UserIcon } from "lucide-react"
import { useMemo } from "react"

import { AnimatedText } from "@/components/AnimatedText"
import {
  DataTableCard,
  DataTableColumnHeader,
  DataTableSkeleton
} from "@/components/data-table-card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useIsRecentStructuralChange } from "@/contexts/realtime-context"
import { cn } from "@/lib/utils"

import { ContactStack, ErrorState, RequestStatusBadge } from "./components"
import type { AccessRequest, PaginationMeta, RequestRoleFilter, RequestStatusFilter } from "./utils"
import {
  USERS_PAGE_SIZE,
  displayPersonName,
  formatDate,
  getRequestStatusLabel,
  getRoleLabel,
  requestRoleItems,
  requestStatusItems
} from "./utils"

export function RequestsWorkspace({
  requests,
  highlightedRequestIds,
  pagination,
  page,
  searchQuery,
  roleFilter,
  statusFilter,
  loading,
  refreshing,
  isFetching,
  error,
  tabsList,
  onRetry,
  onSearchQueryChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onPageChange,
  onInspect,
}: {
  requests: AccessRequest[]
  highlightedRequestIds?: Set<string>
  pagination: PaginationMeta
  page: number
  searchQuery: string
  roleFilter: RequestRoleFilter
  statusFilter: RequestStatusFilter
  loading: boolean
  refreshing: boolean
  isFetching?: boolean
  error: string | null
  tabsList?: React.ReactNode
  onRetry: () => void
  onSearchQueryChange: (query: string) => void
  onRoleFilterChange: (value: RequestRoleFilter | null) => void
  onStatusFilterChange: (value: RequestStatusFilter | null) => void
  onPageChange: (page: number) => void
  onInspect: (request: AccessRequest) => void
}) {
  const isRecentRequestChange = useIsRecentStructuralChange("requests")
  const isStructuralFetching = isFetching && isRecentRequestChange

  const requestColumns = useMemo<ColumnDef<AccessRequest>[]>(
    () => [
      {
        id: "applicant",
        accessorFn: (request) => `${displayPersonName(request)} ${request.id}`,
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Solicitante" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={`${displayPersonName(row.original)} ${row.original.id}`}>
            <div className="min-w-0">
              <p className="truncate font-medium">{displayPersonName(row.original)}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{row.original.id}</p>
            </div>
          </AnimatedText>
        ),
        meta: {
          headerClassName: "w-[260px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "contact",
        accessorFn: (request) => `${request.email ?? ""} ${request.phone ?? ""}`,
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Contacto" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={`${row.original.email ?? ""} ${row.original.phone ?? ""}`}>
            <ContactStack email={row.original.email} phone={row.original.phone} disableExpand />
          </AnimatedText>
        ),
        meta: {
          headerClassName: "w-[260px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "roleRequested",
        accessorFn: (request) => getRoleLabel(request.roleRequested),
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Rol solicitado" />
        ),
        cell: ({ row }) => <AnimatedText value={row.original.roleRequested}>{getRoleLabel(row.original.roleRequested)}</AnimatedText>,
        meta: {
          headerClassName: "w-[150px]",
        },
      },
      {
        id: "status",
        accessorFn: (request) => getRequestStatusLabel(request.status),
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Estado" />
        ),
        cell: ({ row }) => <AnimatedText value={row.original.status}><RequestStatusBadge status={row.original.status} /></AnimatedText>,
        meta: {
          headerClassName: "w-[120px]",
        },
      },
      {
        id: "createdAt",
        accessorFn: (request) => request.createdAt ?? "",
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Creada" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        meta: {
          headerClassName: "w-[120px]",
        },
      },
      {
        id: "observation",
        accessorFn: (request) => request.observation ?? "",
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Observación" />
        ),
        cell: ({ row }) => (
          <span className="block truncate text-muted-foreground">
            {row.original.observation || "-"}
          </span>
        ),
        meta: {
          headerClassName: "w-[210px]",
          cellClassName: "min-w-0",
        },
      },
    ],
    [],
  )

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="rounded-2xl bg-card p-4 shadow-xs/5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Field>
            <FieldLabel>Buscar</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                placeholder="Nombre, correo, teléfono u observación"
                onChange={(event) => onSearchQueryChange(event.target.value)}
              />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel>Rol solicitado</FieldLabel>
            <Select items={requestRoleItems} value={roleFilter} onValueChange={onRoleFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {requestRoleItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Estado</FieldLabel>
            <Select items={requestStatusItems} value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {requestStatusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base font-semibold whitespace-nowrap">Solicitudes</h2>
          {isFetching && <Spinner className="size-4 shrink-0" />}
          <p className="text-sm text-muted-foreground truncate">
            {pagination.total ?? requests.length} encontradas
          </p>
        </div>

        {tabsList && (
          <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label="Vista">
            {tabsList}
          </div>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <DataTableSkeleton
          rows={6}
          tableClassName="min-w-[900px] table-fixed"
          columns={[
            { className: "w-[260px]", headerWidth: "w-28", cellWidth: "w-44" },
            { className: "w-[260px]", headerWidth: "w-24", cellWidth: "w-52" },
            { className: "w-[150px]", headerWidth: "w-28", cellWidth: "w-24" },
            { className: "w-[120px]", headerWidth: "w-16", cellWidth: "w-20" },
            { className: "w-[120px]", headerWidth: "w-16", cellWidth: "w-24" },
            { className: "w-[210px]", headerWidth: "w-24", cellWidth: "w-36" },
          ]}
        />
      ) : requests.length === 0 ? (
        <Empty className="min-h-90 rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserIcon />
            </EmptyMedia>
            <EmptyTitle>No hay solicitudes para mostrar</EmptyTitle>
            <EmptyDescription>
              Ajusta los filtros o espera a que alguien solicite acceso.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTableCard
          columns={requestColumns}
          data={requests}
          getRowId={(request) => request.id}
          getRowClassName={(request) => cn(highlightedRequestIds?.has(request.id) && "realtime-row-enter")}
          onRowClick={onInspect}
          tableClassName="min-w-[900px] table-fixed"
          bodyClassName={cn((refreshing || isStructuralFetching) && "opacity-50 pointer-events-none transition-opacity duration-200")}
          pagination={{
            page: pagination.page ?? page,
            pageSize: pagination.limit ?? USERS_PAGE_SIZE,
            totalPages: pagination.totalPages ?? 1,
            total: pagination.total,
            itemLabel: "solicitudes",
            onPageChange,
          }}
        />
      )}
    </section>
  )
}
