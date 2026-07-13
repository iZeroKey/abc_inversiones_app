import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog"
import { ProfileEditDrawer } from "@/components/ProfileEditDrawer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoRow } from "@/components/ui/info-row"
import { Skeleton } from "@/components/ui/skeleton"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import { realtimeDomainEvent, type RealtimeDomainDetail } from "@/lib/realtime"
import {
  AtSignIcon,
  BanknoteIcon,
  CalendarIcon,
  Edit2Icon,
  IdCardIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  UserIcon
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

type ProfileData = {
  id: string
  authUserId?: string | null
  publicCode?: string | null
  email?: string | null
  firstName?: string
  lastName?: string
  phone?: string | null
  dni?: string | null
  address?: string | null
  bank?: string | null
  bankAccounts?: string[]
  maritalStatus?: "single" | "married" | "unspecified" | null
  avatarUrl?: string | null
  role?: string
  isOwner?: boolean
  createdAt?: string
}

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

const maritalStatusMap: Record<string, string> = {
  none: "Sin registrar",
  single: "Soltero/a",
  married: "Casado/a",
  unspecified: "No especificado",
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function resolveProfileAvatarUrl(url?: string | null) {
  if (!url) return undefined
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url
  if (url.startsWith("/") && API_BASE_URL) return `${API_BASE_URL}${url}`
  return url
}

function hasProfileDetails(data: ProfileData | null | undefined) {
  return Boolean(
    data &&
      ("bankAccounts" in data || "dni" in data || "address" in data || "avatarUrl" in data),
  )
}

function getName(profile?: ProfileData | null) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || profile?.email || "Mi perfil"
}

function getInitials(profile?: ProfileData | null) {
  const name = getName(profile)
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  )
}

function getRoleLabel(role?: string | null, isOwner?: boolean) {
  if (isOwner) return "Propietario"
  const roleKey = role?.toLowerCase() ?? ""
  if (roleKey === "admin") return "Administrador"
  if (roleKey === "investor") return "Inversionista"
  if (roleKey === "client") return "Cliente"
  return "Usuario"
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatPhoneDisplay(value?: string | null) {
  if (!value) return null
  const digits = value.replace(/\D/g, "")
  if (!digits) return null

  const hasCountryCode = digits.startsWith("51") && digits.length >= 11
  const localDigits = hasCountryCode ? digits.slice(2) : digits.slice(-9)
  const trimmed = localDigits.slice(0, 9)
  if (!trimmed) return null
  
  let formatted = trimmed
  if (trimmed.length > 6) {
    formatted = `${trimmed.slice(0, 3)} ${trimmed.slice(3, 6)} ${trimmed.slice(6)}`
  } else if (trimmed.length > 3) {
    formatted = `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`
  }

  return hasCountryCode || value.includes("+51") ? `+51 ${formatted}` : formatted
}

function getPublicCodeLabel(role?: string | null, isOwner?: boolean) {
  if (isOwner || role?.toLowerCase() === "admin") return "Código de administrador"
  if (role?.toLowerCase() === "investor") return "Código de inversionista"
  if (role?.toLowerCase() === "client") return "Código de cliente"
  return "Código de usuario"
}

export default function ProfilePage() {
  const { user, session, updateProfile, fetchWithAuth } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)

  useEffect(() => {
    if (!session?.access_token) return

    if (user?.id && hasProfileDetails(user)) {
      const timeoutId = window.setTimeout(() => {
        setProfileData(user)
        setLoading(false)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    async function fetchProfile() {
      try {
        if (!API_BASE_URL) throw new Error("No se pudo conectar con el servidor.")
        const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/me`)
        const json = (await res.json()) as ApiResponse<ProfileData>
        if (json.success) {
          setProfileData(json.data)
        }
      } catch (error) {
        toastManager.add({
          type: "error",
          title: "Error al cargar perfil",
          description: getErrorMessage(error, "No se pudieron cargar tus datos."),
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [fetchWithAuth, session?.access_token, user])

  useEffect(() => {
    const refreshFromRealtime = (event: Event) => {
      const detail = (event as CustomEvent<RealtimeDomainDetail>).detail
      if (!detail?.type?.startsWith("user.") || !session?.access_token || !user?.id) return

      const payload = detail.data as { userId?: string } | undefined
      if (payload?.userId && payload.userId !== user.id) return

      void (async () => {
        try {
          if (!API_BASE_URL) return
          const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/me`)
          const json = (await res.json()) as ApiResponse<ProfileData>
          if (json.success) {
            setProfileData((prev) => {
              const newData = { ...json.data }
              if (newData.avatarUrl && prev?.avatarUrl?.includes("?t=")) {
                const oldResolved = resolveProfileAvatarUrl(prev.avatarUrl.split("?t=")[0])
                const newResolved = resolveProfileAvatarUrl(newData.avatarUrl.split("?t=")[0])
                if (oldResolved === newResolved) {
                  newData.avatarUrl = prev.avatarUrl
                }
              }
              queueMicrotask(() => updateProfile(newData))
              return newData
            })
          }
        } catch {
          // Keep the current profile visible until the user retries.
        }
      })()
    }

    window.addEventListener(realtimeDomainEvent, refreshFromRealtime)
    return () => window.removeEventListener(realtimeDomainEvent, refreshFromRealtime)
  }, [fetchWithAuth, session?.access_token, updateProfile, user?.id])

  const handleUpdateSuccess = (updatedProfile: ProfileData) => {
    setProfileData(updatedProfile)
    updateProfile(updatedProfile)
    setIsEditing(false)
  }

  const summary = useMemo(() => {
    const roleLabel = getRoleLabel(profileData?.role, profileData?.isOwner)
    return {
      roleLabel,
      codeLabel: getPublicCodeLabel(profileData?.role, profileData?.isOwner),
      avatarSrc: resolveProfileAvatarUrl(profileData?.avatarUrl),
      memberSince: formatDate(profileData?.createdAt),
      maritalStatus: profileData?.maritalStatus ? maritalStatusMap[profileData.maritalStatus] : "Sin registrar",
    }
  }, [profileData])

  if (loading) {
    return <ProfileSkeleton />
  }

  const hasBankAccounts = Boolean(profileData?.bankAccounts?.filter(Boolean).length)

  return (
    <>
      <div id="profile-container" className="mx-auto flex max-w-6xl flex-col gap-6 duration-500 animate-in fade-in">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">Mi perfil</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Vista general de tu información personal y cuenta.
            </p>
          </div>

          <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
            <Button type="button" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
              <Edit2Icon data-icon="inline-start" />
              Editar perfil
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden border-border/60">
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <PhotoProvider>
                    {summary.avatarSrc ? (
                      <PhotoView src={summary.avatarSrc}>
                        <button
                          type="button"
                          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label="Ver avatar en tamaño completo"
                        >
                          <Avatar className="size-28 border-4 border-background shadow-lg bg-background">
                            <AvatarImage key={summary.avatarSrc} src={summary.avatarSrc} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                              {getInitials(profileData)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </PhotoView>
                    ) : (
                      <Avatar className="size-28 border-4 border-background shadow-lg bg-background">
                        <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                          {getInitials(profileData)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </PhotoProvider>

                  <div className="space-y-1">
                    <h2 className="text-xl font-bold tracking-tight">{getName(profileData)}</h2>
                    <p className="truncate text-sm font-medium text-muted-foreground">
                      {profileData?.email || "Sin correo"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge>{summary.roleLabel}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="flex flex-col gap-4 p-5 text-sm">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="size-4 shrink-0 text-muted-foreground/80" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Miembro desde
                    </p>
                    <p className="mt-0.5 font-semibold text-foreground">{summary.memberSince}</p>
                  </div>
                </div>

                {profileData?.publicCode && (
                  <div className="flex items-center gap-3 border-t border-border/40 pt-3">
                    <IdCardIcon className="size-4 shrink-0 text-muted-foreground/80" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        {summary.codeLabel}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs font-bold text-foreground">
                        {profileData.publicCode}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-foreground">Seguridad</span>
                  <span className="text-xs text-muted-foreground">Actualiza tu contraseña periódicamente.</span>
                </div>
                <Button type="button" variant="secondary" className="w-full" onClick={() => setIsPasswordDialogOpen(true)}>
                  <ShieldIcon data-icon="inline-start" />
                  Cambiar contraseña
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0">
            <Card className="border-border/60">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-lg font-bold">Información personal</CardTitle>
                <CardDescription className="text-xs">
                  Tus datos personales, de contacto y facturación.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-6 p-6">
                <section className="rounded-xl bg-muted/30 p-5">
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Datos personales</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoRow icon={<UserIcon className="size-4" />} label="Nombres" value={profileData?.firstName || "Sin registrar"} />
                    <InfoRow icon={<UserIcon className="size-4" />} label="Apellidos" value={profileData?.lastName || "Sin registrar"} />
                    <InfoRow icon={<IdCardIcon className="size-4" />} label="DNI" value={profileData?.dni || "Sin documento"} />
                    <InfoRow icon={<UserIcon className="size-4" />} label="Estado civil" value={summary.maritalStatus} />
                  </div>
                </section>

                <section className="rounded-xl bg-muted/30 p-5">
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Contacto</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoRow icon={<AtSignIcon className="size-4" />} label="Correo electrónico" value={profileData?.email || "Sin correo"} truncate />
                    <InfoRow icon={<PhoneIcon className="size-4" />} label="Teléfono" value={formatPhoneDisplay(profileData?.phone) || "Sin teléfono"} />
                    <InfoRow icon={<MapPinIcon className="size-4" />} label="Dirección" value={profileData?.address || "Sin dirección"} truncate />
                  </div>
                </section>

                <section className="rounded-xl bg-muted/30 p-5">
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Información bancaria</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoRow icon={<BanknoteIcon className="size-4" />} label="Banco" value={profileData?.bank || "Sin banco"} />
                    <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Cuentas bancarias</p>
                      {hasBankAccounts ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {profileData?.bankAccounts?.filter(Boolean).map((account, index) => (
                            <span
                              key={`${account}-${index}`}
                              className="rounded-lg bg-muted/50 px-3 py-1.5 font-mono text-sm font-medium"
                            >
                              {account}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin cuentas registradas</p>
                      )}
                    </div>
                  </div>
                </section>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ProfileEditDrawer
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        profileData={profileData}
        onSuccess={handleUpdateSuccess}
      />

      <ChangePasswordDialog isOpen={isPasswordDialogOpen} onClose={() => setIsPasswordDialogOpen(false)} />
    </>
  )
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-in fade-in">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
          <Skeleton className="h-9 w-full sm:w-32 rounded-md" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="border-border/60">
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <Skeleton className="size-28 rounded-full border-4 border-background" />
                <div className="space-y-1 text-center w-full flex flex-col items-center">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-5 w-52" />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-4 shrink-0" />
                <div className="space-y-1 min-w-0 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-border/40 pt-3">
                <Skeleton className="size-4 shrink-0" />
                <div className="space-y-1 min-w-0 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
              <Skeleton className="h-9 w-full rounded-md mt-1" />
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="border-border/60">
            <CardHeader className="border-b border-border/50 pb-4">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72 mt-1 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-6 p-6">
              <ProfileSectionSkeleton />
              <ProfileSectionSkeleton />
              <ProfileSectionSkeleton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ProfileSectionSkeleton() {
  return (
    <div className="rounded-xl bg-muted/30 p-5">
      <Skeleton className="mb-4 h-5 w-36" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-[52px] w-full rounded-lg" />
        <Skeleton className="h-[52px] w-full rounded-lg" />
        <Skeleton className="h-[52px] w-full rounded-lg" />
        <Skeleton className="h-[52px] w-full rounded-lg" />
      </div>
    </div>
  )
}
