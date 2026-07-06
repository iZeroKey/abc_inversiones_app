import { useMemo, useState } from "react"
import { ChevronDownIcon, LinkIcon, SearchIcon, Settings2Icon, UserCogIcon, UsersIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import {
  DataTableCard,
  DataTableColumnHeader,
  DataTableStaticHeader,
} from "@/components/data-table-card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  UserColumnKey,
} from "./utils"
import {
  USERS_PAGE_SIZE,
  canLinkAuthAccount,
  canManageUser,
  defaultVisibleUserColumns,
  displayPersonName,
  formatDate,
  getMaritalStatusLabel,
  getRoleLabel,
  normalizeRole,
  readUsersPreferences,
  roleItems,
  statusItems,
  userColumnGroups,
  userColumnsConfig,
  writeUsersPreferences,
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
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<UserColumnKey[]>(() => {
    const savedColumns = readUsersPreferences().visibleColumns?.filter((key) =>
      userColumnsConfig.some((column) => column.key === key),
    )
    return savedColumns?.length ? savedColumns : defaultVisibleUserColumns
  })
  const handleToggleColumn = (key: UserColumnKey, checked: boolean) => {
    setVisibleColumnKeys((current) => {
      if (checked) {
        const nextColumns = current.includes(key) ? current : [...current, key]
        writeUsersPreferences({ visibleColumns: nextColumns })
        return nextColumns
      }
      if (key === "user" || key === "action") return current
      const nextColumns = current.filter((columnKey) => columnKey !== key)
      writeUsersPreferences({ visibleColumns: nextColumns })
      return nextColumns
    })
  }
  const userColumns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        id: "user",
        accessorFn: (item) => `${displayPersonName(item)} ${item.publicCode ?? item.id}`,
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="Usuario"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
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
          headerClassName: "w-[250px]",
          cellClassName: "min-w-0",
        },
      },
      {
        id: "dni",
        accessorFn: (item) => item.dni ?? "",
        header: (context) => (
          <DataTableColumnHeader
            column={context.column}
            title="DNI"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
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
          <DataTableColumnHeader
            column={context.column}
            title="Banco"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
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
          <DataTableColumnHeader
            column={context.column}
            title="Cuentas"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
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
          <DataTableColumnHeader
            column={context.column}
            title="Estado civil"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
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
          <DataTableColumnHeader
            column={context.column}
            title="Rol"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
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
          <DataTableColumnHeader
            column={context.column}
            title="Estado"
            sortDirection={(context as { sortDirection?: false | "asc" | "desc" }).sortDirection}
            onSort={(context as { toggleSorting?: () => void }).toggleSorting}
          />
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
          <DataTableColumnHeader
            column={context.column}
            title="Registro"
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
                  variant="outline"
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
  const visibleUserColumns = useMemo(
    () => userColumns.filter((column) => visibleColumnKeys.includes(column.id as UserColumnKey)),
    [userColumns, visibleColumnKeys],
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
            placeholder="Buscar por código, nombre, DNI, correo, teléfono o banco"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </InputGroup>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-140">
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
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="w-full justify-between" />}>
              <Settings2Icon data-icon="inline-start" />
              Columnas
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {userColumnGroups.map((group) => (
                <DropdownMenuGroup key={group}>
                  <DropdownMenuLabel>{group}</DropdownMenuLabel>
                  {userColumnsConfig
                    .filter((column) => column.group === group)
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.key}
                        checked={visibleColumnKeys.includes(column.key)}
                        disabled={column.key === "user" || column.key === "action"}
                        onCheckedChange={(checked) => handleToggleColumn(column.key, Boolean(checked))}
                      >
                        {column.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
          columns={visibleUserColumns}
          data={users}
          getRowId={(item) => item.id}
          getRowClassName={(item) => cn(highlightedUserIds?.has(item.id) && "realtime-row-enter")}
          tableVariant="clean"
          tableClassName="min-w-[1080px] table-fixed"
          bodyClassName={cn(refreshing && "opacity-70")}
          initialSorting={[{ id: "createdAt", desc: true }]}
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
