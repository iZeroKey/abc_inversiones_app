import { BadgeCheckIcon, CircleAlertIcon, MailIcon, PhoneIcon, RefreshCwIcon, ShieldIcon, UserIcon } from "lucide-react"

import { DataTableSkeleton } from "@/components/data-table-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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

export function ContactStack({ email, phone }: { email?: string | null; phone?: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <MailIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{email || "Sin correo"}</span>
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
      tableClassName="min-w-[1180px] table-fixed"
      columns={[
        { className: "w-[260px]", headerWidth: "w-20", cellWidth: "w-44" },
        { className: "w-[250px]", headerWidth: "w-24", cellWidth: "w-52" },
        { className: "w-[250px]", headerWidth: "w-32", cellWidth: "w-44" },
        { className: "w-[150px]", headerWidth: "w-12", cellWidth: "w-24" },
        { className: "w-[160px]", headerWidth: "w-16", cellWidth: "w-28" },
        { className: "w-[120px]", headerWidth: "w-20", cellWidth: "w-24" },
        { className: "w-[220px] text-right", headerWidth: "ml-auto w-16", cellWidth: "ml-auto w-36" },
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
        <Button variant="outline" onClick={onRetry}>
          <RefreshCwIcon data-icon="inline-start" />
          Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function MetricTile({
  label,
  value,
  emphasis = false,
  loading = false,
}: {
  label: string
  value: number
  emphasis?: boolean
  loading?: boolean
}) {
  return (
    <Card className={cn(emphasis && "border-primary/30 bg-primary/3")}>
      <CardContent className="p-4">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold tracking-normal">{value}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
