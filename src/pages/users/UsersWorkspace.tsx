import type { ColumnDef } from "@tanstack/react-table"
import { SearchIcon, UsersIcon } from "lucide-react"
import { useMemo } from "react"

import { AnimatedText } from "@/components/AnimatedText"
import {
  DataTableCard,
  DataTableColumnHeader,
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

import {
  AccessBadge,
  BankAccountsStack,
  ContactStack,
  ErrorState,
  RoleBadge,
  StatusBadge,
  UserIdentity,
  UsersSkeleton,
} from "./components"
import type {
  ManagedUser,
  PaginationMeta,
  RoleFilter,
  StatusFilter,
} from "./utils"
import {
  USERS_PAGE_SIZE,
  displayPersonName,
  formatDate,
  getMaritalStatusLabel,
  getRoleLabel,
  normalizeRole,
  roleItems,
  statusItems,
} from "./utils"

export function UsersWorkspace({
  users,
  highlightedUserIds,
  pagination,
  page,
  roleFilter,
  statusFilter,
  searchQuery,
  loading,
  refreshing,
  error,
  isFetching,
  tabsList,
  onRowClick,
  onPageChange,
  onRetry,
  onRoleFilterChange,
  onSearchQueryChange,
  onStatusFilterChange,
}: {
  users: ManagedUser[]
  highlightedUserIds?: Set<string>
  pagination: PaginationMeta
  page: number
  roleFilter: RoleFilter
  statusFilter: StatusFilter
  searchQuery: string
  loading: boolean
  refreshing: boolean
  error: string | null
  isFetching?: boolean
  tabsList?: React.ReactNode
  onRowClick: (user: ManagedUser) => void
  onPageChange: (page: number) => void
  onRetry: () => void
  onRoleFilterChange: (value: RoleFilter | null) => void
  onSearchQueryChange: (query: string) => void
  onStatusFilterChange: (value: StatusFilter | null) => void
}) {
  const isRecentUserChange = useIsRecentStructuralChange("users")
  const isStructuralFetching = isFetching && isRecentUserChange

  const userColumns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        id: "user",
        accessorFn: (item) => `${displayPersonName(item)} ${item.publicCode ?? item.id}`,
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Usuario" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={`${displayPersonName(row.original)} ${row.original.publicCode ?? row.original.id} ${row.original.avatarUrl ?? ""}`} className="w-full min-w-0">
            <UserIdentity user={row.original} />
          </AnimatedText>
        ),
        meta: {
          headerClassName: "w-[260px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "contact",
        accessorFn: (item) => `${item.email ?? ""} ${item.phone ?? ""} ${item.dni ?? ""}`,
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Contacto" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={`${row.original.email ?? ""} ${row.original.phone ?? ""}`} className="w-full min-w-0">
            <ContactStack email={row.original.email} phone={row.original.phone} disableExpand />
          </AnimatedText>
        ),
        meta: {
          headerClassName: "w-[250px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "dni",
        accessorFn: (item) => item.dni ?? "",
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="DNI" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={row.original.dni ?? ""} className="w-full min-w-0">
            {row.original.dni ? (
              <span className="font-mono text-sm block truncate">{row.original.dni}</span>
            ) : (
              <span className="text-sm text-muted-foreground block truncate">Sin documento</span>
            )}
          </AnimatedText>
        ),
        meta: {
          headerClassName: "w-[120px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "bank",
        accessorFn: (item) => item.bank ?? "",
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Banco" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={row.original.bank ?? ""} className="w-full min-w-0">
            <span className={cn("block truncate", !row.original.bank && "text-muted-foreground")}>
              {row.original.bank || "Sin banco"}
            </span>
          </AnimatedText>
        ),
        meta: {
          headerClassName: "w-[150px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "bankAccounts",
        accessorFn: (item) => (item.bankAccounts ?? []).join(" "),
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Cuentas" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={(row.original.bankAccounts ?? []).join(" ")} className="w-full min-w-0">
            <BankAccountsStack accounts={row.original.bankAccounts} />
          </AnimatedText>
        ),
        meta: {
          headerClassName: "w-[220px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "maritalStatus",
        accessorFn: (item) => item.maritalStatus ? getMaritalStatusLabel(item.maritalStatus) : "",
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Estado civil" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={row.original.maritalStatus ?? ""}>
            <span className={cn("text-sm", !row.original.maritalStatus && "text-muted-foreground")}>
              {getMaritalStatusLabel(row.original.maritalStatus)}
            </span>
          </AnimatedText>
        ),
        meta: {
          headerClassName: "w-[150px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "role",
        accessorFn: (item) => getRoleLabel(normalizeRole(item.role)),
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Rol" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={row.original.role}><RoleBadge role={row.original.role} isOwner={row.original.isOwner} /></AnimatedText>
        ),
        meta: {
          headerClassName: "w-[150px]",
        },
      },
      {
        id: "status",
        accessorFn: (item) => `${item.active === false ? "Inactivo" : "Activo"} ${item.authUserId ? "Con acceso" : "Operativo"}`,
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Estado" />
        ),
        cell: ({ row }) => (
          <AnimatedText value={`${row.original.active}-${row.original.authUserId ? "auth" : "none"}`}>
            <div className="flex flex-wrap gap-1">
              <StatusBadge active={row.original.active !== false} />
              <AccessBadge user={row.original} />
            </div>
          </AnimatedText>
        ),
        meta: {
          headerClassName: "w-[160px]",
        },
      },
      {
        id: "createdAt",
        accessorFn: (item) => item.createdAt ?? "",
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Registro" />
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
    ],
    [],
  )

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="rounded-2xl bg-card p-4 shadow-xs/5">
        <div className="grid gap-3 md:grid-cols-3">
          <Field>
            <FieldLabel>Buscar</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                placeholder="Código, nombre, DNI, correo, teléfono o banco"
                onChange={(event) => onSearchQueryChange(event.target.value)}
              />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel>Rol</FieldLabel>
            <Select items={roleItems} value={roleFilter} onValueChange={onRoleFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roleItems.map((item) => (
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
            <Select items={statusItems} value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusItems.map((item) => (
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
          <h2 className="text-base font-semibold whitespace-nowrap">Usuarios</h2>
          {isFetching && <Spinner className="size-4 shrink-0" />}
          <p className="text-sm text-muted-foreground truncate">
            {pagination.total ?? users.length} encontrados
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
        <UsersSkeleton />
      ) : users.length === 0 ? (
        <Empty className="min-h-90 rounded-lg border bg-card shadow-xs/5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No hay usuarios para mostrar</EmptyTitle>
            <EmptyDescription>
              Ajusta los filtros o revisa las solicitudes para incorporar nuevos usuarios.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTableCard
          columns={userColumns}
          data={users}
          getRowId={(item) => item.id}
          getRowClassName={(item) => cn(highlightedUserIds?.has(item.id) && "realtime-row-enter")}
          onRowClick={onRowClick}
          tableClassName="min-w-[1080px] table-fixed"
          bodyClassName={cn((refreshing || isStructuralFetching) && "opacity-50 pointer-events-none transition-opacity duration-200")}
          pagination={{
            page: pagination.page ?? page,
            pageSize: pagination.limit ?? USERS_PAGE_SIZE,
            totalPages: pagination.totalPages ?? 1,
            total: pagination.total,
            itemLabel: "usuarios",
            onPageChange,
          }}
        />
      )}
    </section>
  )
}
