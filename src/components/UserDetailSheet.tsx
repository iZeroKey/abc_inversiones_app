import {
  ActivityIcon,
  AtSignIcon,
  BadgeCheckIcon,
  BuildingIcon,
  FingerprintIcon,
  IdCardIcon,
  PhoneIcon,
} from "lucide-react"
import type { ElementType } from "react"
import { useEffect, useRef, useState } from "react"

import iconAbc from "@/assets/icon-abc.png"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ResponsiveSheetContent,
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetTitle,
} from "@/components/ui/responsive-sheet"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export type UserDetailProfile = {
  id: string
  publicCode?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  dni?: string | null
  role?: string | null
  active?: boolean | null
  avatarUrl?: string | null
  isCompany?: boolean
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  client: "Cliente",
  investor: "Inversionista",
}

function getSheetTitle(user?: UserDetailProfile | null) {
  if (!user) return "Usuario"
  if (user.isCompany) return "ABC Inversiones"
  if (user.role) return roleLabels[user.role] ?? "Usuario"
  return "Usuario"
}

function getUserName(user?: UserDetailProfile | null) {
  if (!user) return "Sistema"
  if (user.isCompany) return "ABC Inversiones"
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return fullName || user.email || user.publicCode || "Usuario"
}

function getUserInitials(user?: UserDetailProfile | null) {
  const name = getUserName(user)
  const parts = name.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U"
}

function shortId(value?: string | null) {
  if (!value) return "-"
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}

/** A user is "partial" if it lacks email, phone, and DNI — meaning we only have name/id from the loan listing */
function isPartialUser(user: UserDetailProfile) {
  return !user.isCompany && !user.email && !user.phone && !user.dni && Boolean(user.id)
}

function InfoList({
  items,
}: {
  items: Array<{ icon: ElementType; label: string; value: string }>
}) {
  return (
    <div className="divide-y rounded-lg border">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="grid gap-2 p-3 sm:grid-cols-[150px_1fr]">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="size-4" />
            {label}
          </dt>
          <dd className="min-w-0 wrap-break-word text-sm font-medium">{value}</dd>
        </div>
      ))}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
      </div>
      <Separator />
      <div className="divide-y rounded-lg border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid gap-2 p-3 sm:grid-cols-[150px_1fr]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </>
  )
}

export function UserDetailSheet({
  user,
  onOpenChange,
  fetchUserById,
}: {
  user: UserDetailProfile | null
  onOpenChange: (open: boolean) => void
  fetchUserById?: (id: string) => Promise<UserDetailProfile | null>
}) {
  const [loadedUser, setLoadedUser] = useState<UserDetailProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchedIdRef = useRef<string | null>(null)
  const [prevUserId, setPrevUserId] = useState<string | null>(null)

  // Sync state with props during render
  const currentUserId = user?.id ?? null
  if (currentUserId !== prevUserId) {
    setPrevUserId(currentUserId)
    const shouldShowDirectly = !user || user.isCompany || !isPartialUser(user)
    setLoadedUser(shouldShowDirectly ? user : null)
  }

  useEffect(() => {
    if (!user) {
      fetchedIdRef.current = null
      return
    }

    if (user.isCompany || !isPartialUser(user)) {
      return
    }

    // Has partial data and a fetchUserById fn — fetch the full profile
    if (fetchUserById && user.id && fetchedIdRef.current !== user.id) {
      fetchedIdRef.current = user.id
      Promise.resolve().then(() => setLoading(true))
      fetchUserById(user.id).then((full) => {
        setLoadedUser(full ?? user)
        setLoading(false)
      })
    }
  }, [user, fetchUserById])

  const displayUser = loadedUser ?? user

  return (
    <Sheet open={Boolean(user)} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent
        contentKey={user?.id ?? "user-details"}
        defaultDesktopWidth={520}
        minDesktopWidth={420}
        maxDesktopWidth={720}
      >
        <SheetHeader>
          <SheetTitle>{getSheetTitle(user)}</SheetTitle>
          <SheetDescription>Detalles de contacto y perfil del usuario.</SheetDescription>
        </SheetHeader>
        <SheetPanel className="space-y-5">
          {loading ? (
            <ProfileSkeleton />
          ) : displayUser ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  {displayUser.isCompany ? (
                    <AvatarImage src={iconAbc} alt="ABC Inversiones" />
                  ) : displayUser.avatarUrl ? (
                    <AvatarImage src={displayUser.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-base">{getUserInitials(displayUser)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{getUserName(displayUser)}</p>
                  {!displayUser.isCompany && (
                    <p className="truncate text-sm text-muted-foreground">
                      {displayUser.publicCode || shortId(displayUser.id)}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {displayUser.isCompany ? (
                <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                  <BuildingIcon className="size-4 shrink-0" />
                  Préstamo financiado directamente por ABC Inversiones
                </div>
              ) : (
                <InfoList
                  items={[
                    { icon: AtSignIcon, label: "Correo", value: displayUser.email || "-" },
                    { icon: PhoneIcon, label: "Teléfono", value: displayUser.phone || "-" },
                    { icon: IdCardIcon, label: "DNI", value: displayUser.dni || "-" },
                    { icon: BadgeCheckIcon, label: "Rol", value: displayUser.role ? roleLabels[displayUser.role] ?? displayUser.role : "-" },
                    { icon: ActivityIcon, label: "Estado", value: displayUser.active ? "Activo" : "Inactivo" },
                    { icon: FingerprintIcon, label: "ID interno", value: shortId(displayUser.id) },
                  ]}
                />
              )}
            </>
          ) : null}
        </SheetPanel>
      </ResponsiveSheetContent>
    </Sheet>
  )
}
