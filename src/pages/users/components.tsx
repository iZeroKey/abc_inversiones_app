import { BadgeCheckIcon, CircleAlertIcon, MailIcon, PhoneIcon, ShieldIcon, UserIcon } from "lucide-react"
import { useState } from "react"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { DataTableSkeleton } from "@/components/data-table-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import type { ManagedUser, RequestStatus } from "./utils"
import { displayPersonName, getRoleLabel, initials, normalizeRequestStatus, normalizeRole } from "./utils"

export function UserIdentity({ user }: { user: ManagedUser }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-10">
        <AvatarImage src={user.avatarUrl ?? user.avatar ?? undefined} />
        <AvatarFallback>{initials(user)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">{displayPersonName(user)}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {user.publicCode || user.id}
        </p>
      </div>
    </div>
  )
}

export function ContactStack({ email, phone, disableExpand }: { email?: string | null; phone?: string | null; disableExpand?: boolean }) {
  const [emailExpanded, setEmailExpanded] = useState(false)
  
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <MailIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span 
          onClick={(e) => {
            if (disableExpand) return
            e.stopPropagation()
            setEmailExpanded(!emailExpanded)
          }}
          className={cn(
            !disableExpand && "transition-colors cursor-pointer hover:text-foreground/80",
            emailExpanded && !disableExpand ? "break-all" : "truncate"
          )} 
          title={disableExpand ? undefined : (!emailExpanded ? "Toca para expandir" : "Toca para ocultar")}
        >
          {email || "Sin correo"}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <PhoneIcon className="size-3.5 shrink-0" />
        <span className="truncate">{phone || "Sin teléfono"}</span>
      </span>
    </div>
  )
}

export function BankAccountsStack({ accounts }: { accounts?: string[] }) {
  const visibleAccounts = (accounts ?? []).filter(Boolean)
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      {visibleAccounts.length ? (
        visibleAccounts.map((account, index) => (
          <span key={`${account}-${index}`} className="truncate font-mono text-xs">
            {account}
          </span>
        ))
      ) : (
        <span className="text-muted-foreground">Sin cuentas</span>
      )}
    </div>
  )
}

export function RoleBadge({ role, isOwner }: { role?: string; isOwner?: boolean }) {
  const normalizedRole = normalizeRole(role)
  const Icon = normalizedRole === "admin" ? ShieldIcon : UserIcon

  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        variant={
          normalizedRole === "admin"
            ? "default"
            : normalizedRole === "investor"
              ? "secondary"
              : "outline"
        }
      >
        <Icon data-icon="inline-start" />
        {getRoleLabel(normalizedRole)}
      </Badge>
      {isOwner && <Badge variant="secondary">Owner</Badge>}
    </div>
  )
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "default" : "outline"}>
      {active ? "Activo" : "Inactivo"}
    </Badge>
  )
}

export function AccessBadge({ user }: { user: ManagedUser }) {
  if (user.authUserId) {
    return (
      <Badge variant="secondary">
        <BadgeCheckIcon data-icon="inline-start" />
        Con acceso
      </Badge>
    )
  }

  return (
    <Badge variant="outline">
      Operativo
    </Badge>
  )
}

export function RequestStatusBadge({ status }: { status?: RequestStatus }) {
  const normalized = normalizeRequestStatus(status)

  if (normalized === "approved") return <Badge>Aprobada</Badge>
  if (normalized === "rejected") return <Badge variant="destructive">Rechazada</Badge>
  if (normalized === "in_review") return <Badge variant="secondary">En revisión</Badge>
  return <Badge variant="outline">Pendiente</Badge>
}

export function UsersSkeleton() {
  return (
    <DataTableSkeleton
      rows={8}
      tableClassName="min-w-[1080px] table-fixed"
      columns={[
        { className: "w-[260px]", headerWidth: "w-20", cellWidth: "w-44" },
        { className: "w-[250px]", headerWidth: "w-24", cellWidth: "w-52" },
        { className: "w-[120px]", headerWidth: "w-12", cellWidth: "w-20" },
        { className: "w-[150px]", headerWidth: "w-16", cellWidth: "w-24" },
        { className: "w-[220px]", headerWidth: "w-20", cellWidth: "w-32" },
        { className: "w-[150px]", headerWidth: "w-24", cellWidth: "w-28" },
        { className: "w-[150px]", headerWidth: "w-10", cellWidth: "w-24" },
        { className: "w-[160px]", headerWidth: "w-16", cellWidth: "w-28" },
        { className: "w-[120px]", headerWidth: "w-20", cellWidth: "w-24" },
      ]}
    />
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty className="min-h-80 rounded-lg border bg-card shadow-xs/5">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>No se pudo cargar la información</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function UserSummaryCard({
  totalUsers,
  pendingRequests,
  clients,
  investors,
  admins,
  loadingUsers,
  loadingRequests,
}: {
  totalUsers: number
  pendingRequests: number
  clients: number
  investors: number
  admins: number
  loadingUsers: boolean
  loadingRequests: boolean
}) {
  if (loadingUsers) return <UserSummarySkeleton />

  return (
    <div className="rounded-2xl bg-card shadow-xs/5">
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Usuarios</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">
            <AnimatedNumber value={totalUsers} />
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Solicitudes</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">
            {loadingRequests ? (
              <Skeleton className="inline-block h-6 w-12" />
            ) : (
              <span className={cn(pendingRequests > 0 && "text-primary")}>
                <AnimatedNumber value={pendingRequests} />
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="px-4">
        <Separator className="w-full" />
      </div>

      <div className="grid grid-cols-3 gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground" title="Clientes">
            Clientes
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">
            <AnimatedNumber value={clients} />
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground" title="Inversionistas">
            Inversionistas
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">
            <AnimatedNumber value={investors} />
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground" title="Administradores">
            Administradores
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">
            <AnimatedNumber value={admins} />
          </p>
        </div>
      </div>
    </div>
  )
}

function UserSummarySkeleton() {
  return (
    <div className="rounded-2xl bg-card shadow-xs/5">
      <div className="grid grid-cols-2 gap-4 p-4">
        <div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-1.5 h-8 w-24" />
        </div>
        <div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-1.5 h-8 w-24" />
        </div>
      </div>
      <div className="px-4">
        <Separator className="w-full" />
      </div>
      <div className="grid grid-cols-3 gap-4 p-4">
        <div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-1.5 h-5 w-12" />
        </div>
        <div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-1.5 h-5 w-12" />
        </div>
        <div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-1.5 h-5 w-12" />
        </div>
      </div>
    </div>
  )
}
