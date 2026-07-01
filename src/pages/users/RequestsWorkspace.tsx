import { useMemo } from "react"
import { CheckIcon, EyeIcon, SearchIcon, UserIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import {
  DataTableCard,
  DataTableColumnHeader,
  DataTableSkeleton,
  DataTableStaticHeader,
} from "@/components/data-table-card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { ContactStack, ErrorState, RequestStatusBadge } from "./components"
import type { AccessRequest, RequestRoleFilter, RequestStatusFilter } from "./utils"
import {
  displayPersonName,
  formatDate,
  getRequestStatusLabel,
  getRoleLabel,
  isPendingRequest,
  requestRoleItems,
  requestStatusItems,
} from "./utils"

export function RequestsWorkspace({
  requests,
  filteredRequests,
  highlightedRequestIds,
  searchQuery,
  roleFilter,
  statusFilter,
  loading,
  error,
  onRetry,
  onSearchQueryChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onInspect,
  onReview,
}: {
  requests: AccessRequest[]
  filteredRequests: AccessRequest[]
  highlightedRequestIds?: Set<string>
  searchQuery: string
  roleFilter: RequestRoleFilter
  statusFilter: RequestStatusFilter
  loading: boolean
  error: string | null
  onRetry: () => void
  onSearchQueryChange: (query: string) => void
  onRoleFilterChange: (value: RequestRoleFilter | null) => void
  onStatusFilterChange: (value: RequestStatusFilter | null) => void
  onInspect: (request: AccessRequest) => void
  onReview: (request: AccessRequest, action: "approved" | "rejected") => void
}) {
  const requestColumns = useMemo<ColumnDef<AccessRequest>[]>(
    () => [
      {
        id: "applicant",
        accessorFn: (request) => `${displayPersonName(request)} ${request.id}`,
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Solicitante"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{displayPersonName(row.original)}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{row.original.id}</p>
          </div>
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
          <DataTableColumnHeader
            column={context.column}
            title="Contacto"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => (
          <ContactStack email={row.original.email} phone={row.original.phone} />
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
          <DataTableColumnHeader
            column={context.column}
            title="Rol solicitado"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => getRoleLabel(row.original.roleRequested),
        meta: {
          headerClassName: "w-[150px]",
        },
      },
      {
        id: "status",
        accessorFn: (request) => getRequestStatusLabel(request.status),
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Estado"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
        ),
        cell: ({ row }) => <RequestStatusBadge status={row.original.status} />,
        meta: {
          headerClassName: "w-[120px]",
        },
      },
      {
        id: "createdAt",
        accessorFn: (request) => request.createdAt ?? "",
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Creada"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
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
          <DataTableColumnHeader
            column={context.column}
            title="Observación"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
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
      {
        id: "actions",
        enableSorting: false,
        header: () => <DataTableStaticHeader title="Acción" align="right" />,
        cell: ({ row }) => {
          const pending = isPendingRequest(row.original.status)

          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInspect(row.original)}
              >
                <EyeIcon data-icon="inline-start" />
                Ver
              </Button>
              {pending && (
                <Button
                  size="sm"
                  onClick={() => onReview(row.original, "approved")}
                >
                  <CheckIcon data-icon="inline-start" />
                  Aprobar
                </Button>
              )}
            </div>
          )
        },
        meta: {
          headerClassName: "w-[170px] text-right",
          cellClassName: "text-right",
        },
      },
    ],
    [onInspect, onReview],
  )

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        <InputGroup className="flex-1">
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            placeholder="Buscar por nombre, correo, teléfono u observación"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </InputGroup>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-100">
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
        </div>
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
            { className: "w-[170px] text-right", headerWidth: "ml-auto w-20", cellWidth: "ml-auto w-32" },
          ]}
        />
      ) : requests.length === 0 ? (
        <Empty className="min-h-90 rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserIcon />
            </EmptyMedia>
            <EmptyTitle>No hay solicitudes</EmptyTitle>
            <EmptyDescription>
              Cuando alguien solicite acceso, aparecerá en esta bandeja de revisión.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filteredRequests.length === 0 ? (
        <Empty className="min-h-90 rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>No hay solicitudes para mostrar</EmptyTitle>
            <EmptyDescription>
              Ajusta los filtros para ver otras solicitudes.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTableCard
          columns={requestColumns}
          data={filteredRequests}
          getRowId={(request) => request.id}
          getRowClassName={(request) => cn(highlightedRequestIds?.has(request.id) && "realtime-row-enter")}
          tableClassName="min-w-[900px] table-fixed"
          initialSorting={[{ id: "createdAt", desc: true }]}
        />
      )}
    </section>
  )
}
