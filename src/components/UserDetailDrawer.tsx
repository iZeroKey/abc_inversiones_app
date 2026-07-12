import {
  AtSignIcon,
  BadgeCheckIcon,
  BanknoteIcon,
  BuildingIcon,
  CalendarIcon,
  IdCardIcon,
  LinkIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  UserCogIcon,
  UserIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { getRoleLabel, normalizeRole } from "@/pages/users/utils"

import iconAbc from "@/assets/icon-abc.png"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
import { InfoRow } from "@/components/ui/info-row"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-media-query"
import { resolveAvatarUrl } from "@/lib/avatar-image"

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
  avatar?: string | null
  isCompany?: boolean
  maritalStatus?: string | null
  address?: string | null
  bank?: string | null
  bankAccounts?: (string | null)[] | null
  authUserId?: string | null
  createdAt?: string | null
}

function getSheetTitle(user?: UserDetailProfile | null) {
  if (!user) return "Usuario"
  if (user.isCompany) return "ABC Inversiones"
  if (user.role) return getRoleLabel(normalizeRole(user.role)) || "Usuario"
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

function formatDate(isoString?: string | null) {
  if (!isoString) return "-"
  try {
    return new Date(isoString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return "-"
  }
}

/** A user is "partial" if it lacks email, phone, and DNI — meaning we only have name/id from the loan listing */
function isPartialUser(user: UserDetailProfile) {
  if (user.isCompany) return false
  if (user.avatarUrl?.startsWith("storage://")) return true
  return !user.email && !user.phone && !user.dni && Boolean(user.id)
}



function ProfileSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex flex-col items-center gap-2 w-full">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-xl bg-muted/30 p-4">
        <Skeleton className="h-4 w-40 mb-2" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full max-w-30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function UserDetailDrawer({
  user,
  onOpenChange,
  fetchUserById,
  editable,
  linkable,
  onEdit,
  onLinkAuth,
  children,
}: {
  user: UserDetailProfile | null
  onOpenChange: (open: boolean) => void
  fetchUserById?: (id: string) => Promise<UserDetailProfile | null>
  editable?: boolean
  linkable?: boolean
  onEdit?: () => void
  onLinkAuth?: () => void
  children?: ReactNode
}) {
  const [loadedUser, setLoadedUser] = useState<UserDetailProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchedIdRef = useRef<string | null>(null)
  const [prevUserId, setPrevUserId] = useState<string | null>(null)
  const isMobile = useIsMobile()

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
      }).catch(() => {
        setLoading(false)
      })
    }
  }, [user, fetchUserById])

  const displayUser = loadedUser ?? user
  
  const maritalStatusLabel = displayUser?.maritalStatus === "single" ? "Soltero(a)" 
    : displayUser?.maritalStatus === "married" ? "Casado(a)" 
    : displayUser?.maritalStatus === "unspecified" ? "No especificado" 
    : (displayUser?.maritalStatus || "-")

  return (
    <Drawer open={Boolean(user)} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 620, maxWidth: "min(840px, calc(100vw - 2rem))", minWidth: 460 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{getSheetTitle(user)}</DrawerTitle>
          <DrawerDescription>Detalles de contacto y perfil del usuario.</DrawerDescription>
        </DrawerHeader>
        <DrawerPanel className="flex flex-col gap-6">
          {loading ? (
            <ProfileSkeleton />
          ) : displayUser ? (
            <div className="flex flex-col gap-6 fade-in animate-in slide-in-from-bottom-2 duration-300 pb-8">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="size-20 border-4 border-background shadow-xs">
                  {displayUser.isCompany ? (
                    <AvatarImage src={iconAbc} alt="ABC Inversiones" />
                  ) : resolveAvatarUrl(displayUser.avatarUrl ?? displayUser.avatar) ? (
                    <AvatarImage src={resolveAvatarUrl(displayUser.avatarUrl ?? displayUser.avatar)} alt="" />
                  ) : null}
                  <AvatarFallback className="text-xl bg-primary/5 text-primary font-medium">{getUserInitials(displayUser)}</AvatarFallback>
                </Avatar>
                <div className="text-center min-w-0 px-4">
                  <p className="truncate text-xl font-bold tracking-tight">{getUserName(displayUser)}</p>
                  {!displayUser.isCompany && (
                    <p className="truncate text-sm font-medium text-muted-foreground font-mono">
                      {displayUser.publicCode || shortId(displayUser.id)}
                    </p>
                  )}
                </div>
              </div>
              {displayUser.isCompany ? (
                <div className="flex items-center justify-center gap-3 rounded-xl bg-primary/5 p-4 text-sm font-medium text-primary">
                  <BuildingIcon className="size-5 shrink-0" />
                  Préstamo financiado directamente por ABC Inversiones
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Datos personales */}
                  <div className="rounded-xl bg-muted/30 p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Datos personales</h3>
                    <div className="flex flex-col gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <InfoRow icon={<AtSignIcon className="size-4" />} label="Correo" value={displayUser.email || "Sin correo"} truncate />
                        <InfoRow icon={<PhoneIcon className="size-4" />} label="Teléfono" value={displayUser.phone || "Sin teléfono"} />
                        <InfoRow icon={<IdCardIcon className="size-4" />} label="DNI" value={displayUser.dni || "Sin documento"} />
                        <InfoRow icon={<UserIcon className="size-4" />} label="Estado civil" value={maritalStatusLabel || "No especificado"} />
                      </div>
                      <InfoRow icon={<MapPinIcon className="size-4" />} label="Dirección" value={displayUser.address || "Sin dirección"} truncate />
                    </div>
                  </div>

                  {/* Información bancaria */}
                  <div className="rounded-xl bg-muted/30 p-5">
                    <h3 className="mb-4 text-sm font-semibold text-foreground">Información bancaria</h3>
                    <div className="flex flex-col gap-4">
                      <InfoRow icon={<BanknoteIcon className="size-4" />} label="Banco" value={displayUser.bank || "Sin banco"} />
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Cuentas bancarias</p>
                        {displayUser.bankAccounts && displayUser.bankAccounts.filter(Boolean).length > 0 ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {displayUser.bankAccounts.filter(Boolean).map((account, index) => (
                              <span key={`${account}-${index}`} className="rounded-lg bg-muted/50 px-3 py-1.5 font-mono text-sm font-medium tabular-nums">
                                {account}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sin cuentas registradas</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cuenta de acceso */}
                  <div className="rounded-xl bg-muted/30 p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Cuenta de acceso</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow 
                        icon={displayUser.authUserId ? <BadgeCheckIcon className="size-4" /> : <UserCogIcon className="size-4" />} 
                        label="Estado" 
                        value={displayUser.authUserId ? "Con acceso" : "Sin acceso"} 
                      />
                      <InfoRow icon={<CalendarIcon className="size-4" />} label="Registro" value={formatDate(displayUser.createdAt) !== "-" ? formatDate(displayUser.createdAt) : "Sin fecha"} />
                    </div>
                  </div>

                  {/* Rol y estado */}
                  <div className="rounded-xl bg-muted/30 p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Rol y estado</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow icon={<ShieldIcon className="size-4" />} label="Rol" value={getRoleLabel(normalizeRole(displayUser.role)) || "Sin rol"} />
                      <InfoRow 
                        icon={displayUser.active !== false ? <BadgeCheckIcon className="size-4" /> : <UserCogIcon className="size-4" />} 
                        label="Estado" 
                        value={displayUser.active === false ? "Inactivo" : "Activo"} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DrawerPanel>
        
        {user && (
          <DrawerFooter variant="bare">
            <DrawerClose render={<Button variant="secondary" className="w-full sm:flex-1" />}>
              Cerrar
            </DrawerClose>
            {linkable && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onLinkAuth}
                className="w-full sm:flex-1"
              >
                <LinkIcon data-icon="inline-start" />
                Vincular acceso
              </Button>
            )}
            {editable && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onEdit}
                className="w-full sm:flex-1"
              >
                <UserCogIcon data-icon="inline-start" />
                Editar
              </Button>
            )}
          </DrawerFooter>
        )}
      </DrawerPopup>
      
      {children}
    </Drawer>
  )
}
