import { useMemo } from "react"
import { LinkIcon, SearchIcon, UserCogIcon, UsersIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import {
  DataTableCard,
  DataTableColumnHeader,
  DataTableStaticHeader,
} from "@/components/data-table-card"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
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
  CurrentUser,
  ManagedUser,
  PaginationMeta,
  RoleFilter,
  StatusFilter,
} from "./utils"
import {
  USERS_PAGE_SIZE,
  canLinkAuthAccount,
  canManageUser,
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
  currentUser,
  onEditUser,
  onLinkAuth,
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
  currentUser: CurrentUser
  onEditUser: (user: ManagedUser) => void
  onLinkAuth: (user: ManagedUser) => void
  onPageChange: (page: number) => void
  onRetry: () => void
  onRoleFilterChange: (value: RoleFilter | null) => void
  onSearchQueryChange: (query: string) => void
  onStatusFilterChange: (value: StatusFilter | null) => void
}) {

  const userColumns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        id: "user",
        accessorFn: (item) => `${displayPersonName(item)} ${item.publicCode ?? item.id}`,
        header: (context) => (
          <DataTableColumnHeader column={context.column} title="Usuario" />
        ),
        cell: ({ row }) => <UserIdentity user={row.original} />,
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
          <ContactStack email={row.original.email} phone={row.original.phone} />
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
        cell: ({ row }) =>
          row.original.dni ? (
            <span className="font-mono text-sm">{row.original.dni}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Sin documento</span>
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
          <span className={cn("block truncate", !row.original.bank && "text-muted-foreground")}>
            {row.original.bank || "Sin banco"}
          </span>
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
        cell: ({ row }) => <BankAccountsStack accounts={row.original.bankAccounts} />,
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
          <span className={cn("text-sm", !row.original.maritalStatus && "text-muted-foreground")}>
            {getMaritalStatusLabel(row.original.maritalStatus)}
          </span>
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
          <RoleBadge role={row.original.role} isOwner={row.original.isOwner} />
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
          <div className="flex flex-wrap gap-1">
            <StatusBadge active={row.original.active !== false} />
            <AccessBadge user={row.original} />
          </div>
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
      {
        id: "action",
        enableSorting: false,
        header: () => <DataTableStaticHeader title="Acción" align="right" />,
        cell: ({ row }) => {
          const editable = canManageUser(currentUser, row.original)
          const linkable = canLinkAuthAccount(currentUser, row.original)

          return (
            <div className="flex justify-end gap-2">
              {linkable && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onLinkAuth(row.original)}
                >
                  <LinkIcon data-icon="inline-start" />
                  Acceso
                </Button>
              )}
              {editable && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEditUser(row.original)}
                >
                  <UserCogIcon data-icon="inline-start" />
                  Editar
                </Button>
              )}
            </div>
          )
        },
        meta: {
          headerClassName: "w-[220px] text-right",
          cellClassName: "text-right",
        },
      },
    ],
    [currentUser, onEditUser, onLinkAuth],
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
          tableClassName="min-w-[1080px] table-fixed"
          bodyClassName={cn(refreshing && "opacity-70")}
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
