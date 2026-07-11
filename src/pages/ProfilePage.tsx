import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog"
import { ImageCropperModal } from "@/components/profile/ImageCropperModal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSidebar } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import {
    ACCEPTED_AVATAR_FILE_EXTENSIONS,
    ACCEPTED_AVATAR_FORMATS_LABEL,
    optimizeAvatarImage,
    validateAvatarFile,
} from "@/lib/avatar-image"
import { realtimeDomainEvent, type RealtimeDomainDetail } from "@/lib/realtime"
import { cn } from "@/lib/utils"
import { BanknoteIcon, CalendarIcon, CameraIcon, Edit2Icon, IdCardIcon, MailIcon, MapPinIcon, PhoneIcon, PlusIcon, SaveIcon, ShieldCheckIcon, Trash2Icon, UserIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
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

const maritalStatusItems = [
  { label: "Sin registrar", value: "none" },
  { label: "Soltero/a", value: "single" },
  { label: "Casado/a", value: "married" },
  { label: "No especificado", value: "unspecified" },
] as const

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

function normalizeBankAccounts(value: string[]) {
  return value
    .map((item) => item.trim())
    .filter(Boolean)
}

function resolveProfileAvatarUrl(url?: string | null) {
  if (!url) return undefined
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url
  if (url.startsWith("/") && API_BASE_URL) return `${API_BASE_URL}${url}`
  return url
}

function normalizeMaritalStatus(value: string) {
  return value === "none" ? null : value
}

function hasProfileDetails(data: ProfileData | null | undefined) {
  return Boolean(
    data &&
      (
        "bankAccounts" in data ||
        "dni" in data ||
        "address" in data ||
        "avatarUrl" in data
      ),
  )
}

function formatPhoneNumber(value: string) {
  const digits = value.trim().replace(/\D/g, "")
  if (!digits) return ""
  const localDigits = digits.startsWith("51") && digits.length === 11 ? digits.slice(2) : digits
  if (localDigits.length === 9) {
    return `+51 ${localDigits.slice(0, 3)} ${localDigits.slice(3, 6)} ${localDigits.slice(6)}`
  }
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

function uploadAvatarWithProgress(
  url: string,
  formData: FormData,
  accessToken: string,
  onUploadProgress: (progress: number) => void
): Promise<ApiResponse<{ avatarUrl: string }>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PATCH", url)

    if (accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onUploadProgress(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      onUploadProgress(100)
      try {
        const payload = JSON.parse(xhr.responseText) as ApiResponse<{ avatarUrl: string }>
        if (xhr.status < 200 || xhr.status >= 300 || !payload?.success) {
          reject(new Error(payload?.message || "No se pudo completar la solicitud."))
          return
        }
        resolve(payload)
      } catch {
        reject(new Error("Error al procesar la respuesta del servidor."))
      }
    }

    xhr.onerror = () => reject(new Error("No se pudo conectar con el servidor."))
    xhr.send(formData)
  })
}

export default function ProfilePage() {
  const { user, session, updateProfile, fetchWithAuth } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [removingAvatar, setRemovingAvatar] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [dni, setDni] = useState("")
  const [address, setAddress] = useState("")
  const [bank, setBank] = useState("")
  const [bankAccounts, setBankAccounts] = useState<string[]>([""])
  const [maritalStatus, setMaritalStatus] = useState("none")

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showStickyHeader, setShowStickyHeader] = useState(false)
  const sidebarActionsRef = useRef<HTMLDivElement>(null)
  const { isMobile } = useSidebar()

  const applyProfileToForm = (data: ProfileData) => {
    setFirstName(data.firstName || "")
    setLastName(data.lastName || "")
    setPhone(data.phone || "")
    setDni(data.dni || "")
    setAddress(data.address || "")
    setBank(data.bank || "")
    setBankAccounts(data.bankAccounts?.length ? data.bankAccounts : [""])
    setMaritalStatus(data.maritalStatus || "none")
  }

  useEffect(() => {
    if (!session?.access_token) return

    if (user?.id && hasProfileDetails(user)) {
      const timeoutId = window.setTimeout(() => {
        setProfileData(user)
        applyProfileToForm(user)
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
          applyProfileToForm(json.data)
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
      if (!detail?.type?.startsWith("user.") || !session?.access_token || !user?.id || isEditing) return

      const payload = detail.data as { userId?: string } | undefined
      if (payload?.userId && payload.userId !== user.id) return

      void (async () => {
        try {
          if (!API_BASE_URL) return
          const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/me`)
          const json = (await res.json()) as ApiResponse<ProfileData>
          if (json.success) {
            setProfileData(json.data)
            applyProfileToForm(json.data)
            updateProfile(json.data)
          }
        } catch {
          // El perfil queda con la última versión visible; el usuario puede refrescar manualmente.
        }
      })()
    }

    window.addEventListener(realtimeDomainEvent, refreshFromRealtime)
    return () => window.removeEventListener(realtimeDomainEvent, refreshFromRealtime)
  }, [fetchWithAuth, isEditing, session?.access_token, updateProfile, user?.id])

  useEffect(() => {
    if (!isEditing || !isMobile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowStickyHeader(false)
      return
    }

    const element = sidebarActionsRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isBelowHeader = entry.isIntersecting || entry.boundingClientRect.top >= 56
        setShowStickyHeader(!isBelowHeader)
      },
      {
        rootMargin: "-56px 0px 0px 0px",
        threshold: 0,
      }
    )

    observer.observe(element)
    return () => {
      observer.unobserve(element)
    }
  }, [isEditing, isMobile])

  const handleStartEditing = () => {
    if (profileData) applyProfileToForm(profileData)
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    if (profileData) applyProfileToForm(profileData)
    setIsEditing(false)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/${user?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          dni,
          address,
          bank,
          bankAccounts: normalizeBankAccounts(bankAccounts),
          maritalStatus: normalizeMaritalStatus(maritalStatus),
        })
      })
      const json = (await res.json()) as ApiResponse<ProfileData>
      if (json.success) {
        toastManager.add({
          type: "success",
          title: "Perfil actualizado",
          description: "Tus datos se han guardado correctamente."
        })
        setProfileData(json.data)
        applyProfileToForm(json.data)
        if (updateProfile) updateProfile(json.data)
        setIsEditing(false)
      } else {
        throw new Error(json.message)
      }
    } catch (error: unknown) {
      toastManager.add({
        type: "error",
        title: "Error al actualizar",
        description: getErrorMessage(error, "No se pudieron guardar los cambios.")
      })
    } finally {
      setSaving(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const validationMessage = validateAvatarFile(file)

      if (validationMessage) {
        toastManager.add({
          type: "error",
          title: "Formato no permitido",
          description: validationMessage,
        })
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }

      const reader = new FileReader()
      reader.addEventListener("load", () => {
        setSelectedImage(reader.result as string)
        setIsCropperOpen(true)
        if (fileInputRef.current) fileInputRef.current.value = ""
      })
      reader.readAsDataURL(file)
    }
  }

  const openAvatarPicker = () => {
    if (!isEditing || saving) return
    fileInputRef.current?.click()
  }

  const updateBankAccount = (index: number, value: string) => {
    setBankAccounts((current) => current.map((account, accountIndex) => accountIndex === index ? value : account))
  }

  const addBankAccount = () => {
    setBankAccounts((current) => [...current, ""])
  }

  const removeBankAccount = (index: number) => {
    setBankAccounts((current) => {
      const nextAccounts = current.filter((_, accountIndex) => accountIndex !== index)
      return nextAccounts.length ? nextAccounts : [""]
    })
  }

  const handleRemoveAvatar = async () => {
    if (!isEditing || removingAvatar || saving || !profileData?.avatarUrl) return

    setRemovingAvatar(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/me/avatar`, {
        method: "DELETE",
      })
      const json = (await res.json()) as ApiResponse<ProfileData>

      if (json.success) {
        setProfileData(json.data)
        updateProfile(json.data)
        toastManager.add({
          type: "success",
          title: "Foto eliminada",
          description: "Tu avatar volvió a la versión por defecto."
        })
      } else {
        throw new Error(json.message)
      }
    } catch (error: unknown) {
      toastManager.add({
        type: "error",
        title: "Error al eliminar",
        description: getErrorMessage(error, "No se pudo quitar la foto.")
      })
    } finally {
      setRemovingAvatar(false)
    }
  }

  const handleCropComplete = async (croppedImage: Blob) => {
    setSaving(true)
    setUploadProgress(0)
    try {
      const optimizedImage = await optimizeAvatarImage(croppedImage)
      const formData = new FormData()
      formData.append("avatar", optimizedImage, "avatar.webp")

      const payload = await uploadAvatarWithProgress(
        `${API_BASE_URL}/api/v1/users/me/avatar`,
        formData,
        session?.access_token || "",
        (progress) => {
          setUploadProgress(progress)
        }
      )

      if (payload.success) {
        toastManager.add({
          type: "success",
          title: "Imagen actualizada",
          description: "Tu foto de perfil ha sido cambiada."
        })
        setProfileData((prev) => (prev ? { ...prev, avatarUrl: payload.data.avatarUrl } : prev))
        updateProfile({ avatarUrl: payload.data.avatarUrl })
      } else {
        throw new Error(payload.message)
      }
    } catch (error: unknown) {
      toastManager.add({
        type: "error",
        title: "Error al subir imagen",
        description: getErrorMessage(error, `No se pudo actualizar la foto. Formatos permitidos: ${ACCEPTED_AVATAR_FORMATS_LABEL}.`)
      })
    } finally {
      setSaving(false)
      setUploadProgress(null)
      setSelectedImage(null)
    }
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  const roleMap: Record<string, string> = {
    client: "Cliente",
    investor: "Inversionista",
    admin: "Administrador",
  }
  const roleKey = profileData?.role?.toLowerCase() ?? ""
  const isOwner = Boolean(profileData?.isOwner) || roleKey === "owner"
  const isAdmin = roleKey === "admin" || isOwner
  const isInvestor = roleKey === "investor"
  const isClient = roleKey === "client"

  let publicCodeLabel = "Código de usuario"
  if (isAdmin) {
    publicCodeLabel = "Código de administrador"
  } else if (isInvestor) {
    publicCodeLabel = "Código de inversionista"
  } else if (isClient) {
    publicCodeLabel = "Código de cliente"
  }

  const memberSinceYear = profileData?.createdAt ? new Date(profileData.createdAt).getFullYear() : "-"
  const avatarSrc = resolveProfileAvatarUrl(profileData?.avatarUrl)
  return (
    <>
      {typeof document !== "undefined" && createPortal(
        <div 
          className={cn(
            "fixed inset-x-4 z-50 lg:hidden transition-all duration-500 ease-out transform-gpu",
            isEditing && showStickyHeader
              ? "top-18 opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "top-4 opacity-0 scale-95 -translate-y-4 pointer-events-none"
          )}
        >
          <div className="flex items-center justify-between rounded-4xl bg-background/95 px-5 py-2.5 shadow-lg border border-border/60 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-foreground">
                Editando perfil
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleCancelEditing}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs h-8 px-3"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="profile-form"
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-xs h-8 px-3 font-semibold gap-1.5"
              >
                {saving ? <Spinner className="size-3 text-primary-foreground" /> : <SaveIcon className="size-3" />}
                Guardar
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div id="profile-container" className="mx-auto flex max-w-6xl flex-col gap-6 p-4 duration-500 animate-in fade-in md:p-8">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden border-border/60 relative transition-all duration-300">
              <div className="bg-linear-to-br from-amber-500/10 via-primary/10 to-indigo-500/10 h-24 w-full" />
              <CardContent className="flex flex-col items-center p-6 -mt-12">
                <div className="relative group select-none">
                  <PhotoProvider>
                    {avatarSrc ? (
                      <PhotoView src={avatarSrc}>
                        <button
                          type="button"
                          className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-transform hover:scale-[1.02] cursor-zoom-in"
                          aria-label="Ver avatar en tamaño completo"
                        >
                          <Avatar className="size-28 border-4 border-background shadow-lg bg-background">
                            <AvatarImage key={avatarSrc} src={avatarSrc} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                              {firstName?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </PhotoView>
                    ) : (
                      <Avatar className="size-28 border-4 border-background shadow-lg bg-background">
                        <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                          {firstName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </PhotoProvider>

                  {(saving || removingAvatar) && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xs select-none pointer-events-none">
                      <Spinner className="size-8 text-white" />
                    </div>
                  )}
                </div>

                {uploadProgress !== null && (
                  <div className="w-full mt-4 px-2 animate-in fade-in-0 duration-300">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mb-1">
                      <span>Subiendo imagen...</span>
                      <span className="tabular-nums">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1" />
                  </div>
                )}

                <div className="text-center mt-4 w-full">
                  <h2 className="text-xl font-bold tracking-tight text-foreground truncate px-1">
                    {firstName} {lastName}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate px-1">
                    {profileData?.email}
                  </p>
                  <div className="flex flex-wrap justify-center items-center gap-1.5 mt-2.5">
                    <Badge variant="secondary" className="font-semibold text-xs py-0.5 px-2.5">
                      {isAdmin ? "Administrador" : (roleMap[roleKey] || profileData?.role || "Usuario")}
                    </Badge>
                    {isOwner && (
                      <Badge variant="outline" className="font-semibold text-xs py-0.5 px-2.5 border-primary/20 bg-primary/5 text-primary">
                        Propietario
                      </Badge>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "grid w-full transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out",
                  !isEditing ? "grid-rows-[1fr] opacity-100 mt-5" : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
                )}>
                  <div className="overflow-hidden">
                    <Button
                      type="button"
                      onClick={handleStartEditing}
                      className="w-full gap-2 cursor-pointer"
                    >
                      <Edit2Icon className="size-3.5" />
                      Editar perfil
                    </Button>
                  </div>
                </div>

                <div 
                  ref={sidebarActionsRef}
                  className={cn(
                    "grid w-full transition-[grid-template-rows,opacity,margin,padding] duration-300 ease-in-out",
                    isEditing ? "grid-rows-[1fr] opacity-100 mt-5 pt-4 border-t border-border/50" : "grid-rows-[0fr] opacity-0 mt-0 pt-0 border-t-0 pointer-events-none"
                  )}
                >
                  <div className="overflow-hidden flex flex-col gap-4">
                    <div className="flex flex-col gap-2 w-full">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full gap-2 cursor-pointer"
                        onClick={openAvatarPicker}
                        disabled={saving || removingAvatar}
                      >
                        <CameraIcon className="size-3.5 text-muted-foreground" />
                        Cambiar foto
                      </Button>
                      
                      {profileData?.avatarUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive cursor-pointer"
                          onClick={handleRemoveAvatar}
                          disabled={saving || removingAvatar}
                        >
                          <Trash2Icon className="size-3.5" />
                          Eliminar foto
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2 w-full border-t border-border/50 pt-4">
                      <Button
                        type="button"
                        onClick={handleCancelEditing}
                        variant="ghost"
                        className="flex-1 text-muted-foreground cursor-pointer"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        form="profile-form"
                        disabled={saving}
                        className="flex-1 gap-2 cursor-pointer"
                      >
                        {saving ? <Spinner className="size-3.5" /> : <SaveIcon className="size-3.5" />}
                        Guardar
                      </Button>
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept={ACCEPTED_AVATAR_FILE_EXTENSIONS}
                  onChange={handleImageSelect}
                  disabled={saving || !isEditing}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-5 flex flex-col gap-4 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CalendarIcon className="size-4 shrink-0 text-muted-foreground/80" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Miembro desde</p>
                    <p className="font-semibold text-foreground mt-0.5">{memberSinceYear}</p>
                  </div>
                </div>

                {profileData?.publicCode && (
                  <div className="flex items-center gap-3 text-muted-foreground border-t border-border/40 pt-3">
                    <IdCardIcon className="size-4 shrink-0 text-muted-foreground/80" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">{publicCodeLabel}</p>
                      <p className="font-mono text-xs font-bold text-foreground truncate mt-0.5">{profileData.publicCode}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base font-bold">Seguridad</CardTitle>
                <CardDescription className="text-xs">Gestiona tu contraseña y accesos.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-2 flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/10 bg-primary/5">
                  <ShieldCheckIcon className="size-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">Cuenta Verificada</p>
                    <p className="text-[10px] text-muted-foreground">Identidad confirmada con éxito</p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  className="w-full cursor-pointer" 
                  onClick={() => setIsPasswordDialogOpen(true)}
                >
                  Cambiar Contraseña
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0">
            <Card className={cn("transition-all duration-300 border-border/60", isEditing ? "ring-2 ring-primary/20 shadow-md" : "")}>
              <CardHeader className="border-b border-border/50 pb-4">
                <div>
                  <CardTitle className="text-lg font-bold">Información Personal</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {isEditing ? "Edita tus datos de contacto y cuentas bancarias." : "Tus datos personales y de facturación."}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                <AnimateHeight>
                  <form id="profile-form" onSubmit={handleUpdate} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="firstName">Nombres</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <UserIcon className="size-4" />
                        </InputGroupAddon>
                        <InputGroupInput 
                          id="firstName" 
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          disabled={!isEditing}
                        />
                      </InputGroup>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="lastName">Apellidos</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <UserIcon className="size-4" />
                        </InputGroupAddon>
                        <InputGroupInput 
                          id="lastName" 
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          disabled={!isEditing}
                        />
                      </InputGroup>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="email">Correo Electrónico</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <MailIcon className="size-4" />
                      </InputGroupAddon>
                      <InputGroupInput 
                        id="email" 
                        value={profileData?.email || "Sin correo"} 
                        disabled 
                        className="bg-muted/50" 
                      />
                    </InputGroup>
                    <FieldDescription>El correo electrónico no puede ser modificado por seguridad.</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <PhoneIcon className="size-4" />
                      </InputGroupAddon>
                      <InputGroupInput 
                        id="phone" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={() => setPhone((current) => formatPhoneNumber(current))}
                        placeholder="+51 999 999 999"
                        disabled={!isEditing}
                      />
                    </InputGroup>
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="dni">DNI</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <IdCardIcon className="size-4" />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="dni"
                          value={dni}
                          onChange={(e) => setDni(e.target.value)}
                          placeholder="12345678"
                          disabled={!isEditing}
                        />
                      </InputGroup>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="maritalStatus">Estado civil</FieldLabel>
                      <Select
                        items={maritalStatusItems}
                        value={maritalStatus}
                        onValueChange={(value) => setMaritalStatus(value ?? "none")}
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="maritalStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {maritalStatusItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="address">Dirección</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <MapPinIcon className="size-4" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Av. Principal 123"
                        disabled={!isEditing}
                      />
                    </InputGroup>
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="bank">Banco</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <BanknoteIcon className="size-4" />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="bank"
                          value={bank}
                          onChange={(e) => setBank(e.target.value)}
                          placeholder="BCP, Interbank..."
                          disabled={!isEditing}
                        />
                      </InputGroup>
                    </Field>

                    <Field>
                      <FieldLabel>Cuentas bancarias</FieldLabel>
                      <div className="flex w-full flex-col gap-2">
                        {bankAccounts.map((account, index) => (
                          <InputGroup key={index} className="transition-all duration-300 ease-in-out animate-in fade-in-0 slide-in-from-top-2">
                            <InputGroupAddon align="inline-start">
                              <BanknoteIcon className="size-4" />
                            </InputGroupAddon>
                            <InputGroupInput
                              aria-label={`Cuenta bancaria ${index + 1}`}
                              value={account}
                              onChange={(event) => updateBankAccount(index, event.target.value)}
                              placeholder="CCI o número de cuenta"
                              disabled={!isEditing}
                            />
                            {isEditing && bankAccounts.length > 1 && (
                              <InputGroupAddon align="inline-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Eliminar cuenta bancaria"
                                  onClick={() => removeBankAccount(index)}
                                >
                                  <XIcon />
                                </Button>
                              </InputGroupAddon>
                            )}
                          </InputGroup>
                        ))}
                        {isEditing && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8.5 w-full justify-center border-dashed text-muted-foreground animate-in fade-in-0 slide-in-from-top-1 sm:h-7.5"
                            onClick={addBankAccount}
                          >
                            <PlusIcon data-icon="inline-start" />
                            Agregar cuenta
                          </Button>
                        )}
                      </div>
                      <FieldDescription>Una cuenta por campo.</FieldDescription>
                    </Field>
                  </div>
                  </form>
                </AnimateHeight>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ImageCropperModal
        image={selectedImage}
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />

      <ChangePasswordDialog 
        isOpen={isPasswordDialogOpen} 
        onClose={() => setIsPasswordDialogOpen(false)} 
      />
    </>
  )
}

function ProfileSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Card className="overflow-hidden border-border/60">
        <div className="px-6 py-6 md:px-8 md:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col items-center gap-5 md:flex-row md:items-center">
              <Skeleton className="size-32 rounded-full md:size-28" />
              <div className="flex-1 space-y-3 text-center md:text-left">
                <div className="flex flex-col items-center gap-2 md:flex-row md:items-center">
                  <Skeleton className="h-9 w-64 max-w-full" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
                <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                  <Skeleton className="h-7 w-36 rounded-full" />
                  <Skeleton className="h-7 w-56 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-md sm:w-44" />
          </div>
        </div>
      </Card>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />
            </div>
            <ProfileFieldSkeleton wide />
            <ProfileFieldSkeleton wide />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
              <Skeleton className="size-5 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ProfileFieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <div className="flex h-10 items-center gap-3 rounded-md border bg-muted/20 px-3">
        <Skeleton className="size-4 rounded-sm" />
        <Skeleton className={cn("h-4", wide ? "w-64 max-w-[70%]" : "w-36")} />
      </div>
    </div>
  )
}

function AnimateHeight({ children, className }: { children: React.ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const isFirstRender = useRef(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rectHeight = entry.contentRect.height;
        if (isFirstRender.current) {
          setHeight(rectHeight);
          requestAnimationFrame(() => {
            isFirstRender.current = false;
          });
        } else {
          setHeight(rectHeight);
        }
      }
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        height: height === "auto" ? "auto" : `${height}px`,
        // eslint-disable-next-line react-hooks/refs
        transition: isFirstRender.current ? "none" : "height 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      className={cn("overflow-hidden", className)}
    >
      <div ref={containerRef}>{children}</div>
    </div>
  );
}
