import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog"
import { ImageCropperModal } from "@/components/profile/ImageCropperModal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { cn } from "@/lib/utils"
import { BanknoteIcon, CalendarIcon, CameraIcon, Edit2Icon, IdCardIcon, MailIcon, MapPinIcon, PhoneIcon, PlusIcon, SaveIcon, ShieldCheckIcon, Trash2Icon, UserIcon, XIcon } from "lucide-react"
import { type ElementType, useEffect, useRef, useState } from "react"
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

export default function ProfilePage() {
  const { user, session, updateProfile, fetchWithAuth } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [removingAvatar, setRemovingAvatar] = useState(false)

  // Form states
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [dni, setDni] = useState("")
  const [address, setAddress] = useState("")
  const [bank, setBank] = useState("")
  const [bankAccounts, setBankAccounts] = useState<string[]>([""])
  const [maritalStatus, setMaritalStatus] = useState("none")

  // Image states
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    try {
      const optimizedImage = await optimizeAvatarImage(croppedImage)
      const formData = new FormData()
      formData.append("avatar", optimizedImage, "avatar.webp")

      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/me/avatar`, {
        method: "PATCH",
        body: formData
      })

      const json = (await res.json()) as ApiResponse<{ avatarUrl: string }>
      if (json.success) {
        toastManager.add({
          type: "success",
          title: "Imagen actualizada",
          description: "Tu foto de perfil ha sido cambiada."
        })
        setProfileData((prev) => (prev ? { ...prev, avatarUrl: json.data.avatarUrl } : prev))
        updateProfile({ avatarUrl: json.data.avatarUrl })
      } else {
        throw new Error(json.message)
      }
    } catch (error: unknown) {
      toastManager.add({
        type: "error",
        title: "Error al subir imagen",
        description: getErrorMessage(error, `No se pudo actualizar la foto. Formatos permitidos: ${ACCEPTED_AVATAR_FORMATS_LABEL}.`)
      })
    } finally {
      setSaving(false)
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
    owner: "Dueño"
  }
  const roleKey = profileData?.role?.toLowerCase() ?? ""
  const memberSinceYear = profileData?.createdAt ? new Date(profileData.createdAt).getFullYear() : "-"
  const avatarSrc = resolveProfileAvatarUrl(profileData?.avatarUrl)

  return (
    <>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 duration-500 animate-in fade-in md:p-8">
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="border-b bg-muted/20 px-6 py-6 md:px-8 md:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col items-center gap-5 md:flex-row md:items-center">
                <div className="relative w-fit">
                  <PhotoProvider>
                    {avatarSrc ? (
                      <PhotoView src={avatarSrc}>
                        <button
                          type="button"
                          className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label="Ver avatar en tamaño completo"
                        >
                          <Avatar className="size-32 md:size-28 border border-border/70 shadow-md ring-4 ring-background mx-auto md:mx-0">
                            <AvatarImage key={avatarSrc} src={avatarSrc} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-4xl md:text-3xl font-bold">
                              {firstName?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </PhotoView>
                    ) : (
                      <Avatar className="size-32 md:size-28 border border-border/70 shadow-md ring-4 ring-background mx-auto md:mx-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-4xl md:text-3xl font-bold">
                          {firstName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </PhotoProvider>

                  {isEditing && (
                    <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border bg-background/95 p-1 shadow-lg backdrop-blur">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="size-9 rounded-full"
                        onClick={openAvatarPicker}
                        disabled={saving}
                        title="Agregar foto"
                      >
                        <CameraIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-9 rounded-full text-destructive hover:text-destructive"
                        onClick={handleRemoveAvatar}
                        disabled={saving || removingAvatar || !profileData?.avatarUrl}
                        title="Eliminar foto"
                      >
                        {removingAvatar ? <Spinner className="size-4" /> : <Trash2Icon className="size-4" />}
                      </Button>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={ACCEPTED_AVATAR_FILE_EXTENSIONS}
                    onChange={handleImageSelect}
                    disabled={saving || !isEditing}
                  />
                </div>

                <div className="space-y-3 text-center md:text-left flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-2 md:flex-row md:items-center">
                    <h1 className="text-3xl font-semibold tracking-tight break-words text-balance leading-tight">{firstName} {lastName}</h1>
                    <Badge variant="secondary" className="w-fit font-semibold shrink-0">{roleMap[roleKey] || profileData?.role}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground md:justify-start">
                    <span className="flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1">
                      <CalendarIcon className="size-3.5" />
                      Miembro desde {memberSinceYear}
                    </span>
                    <span className="rounded-full border bg-background/80 px-3 py-1">{profileData?.email || "Sin correo"}</span>
                    {profileData?.publicCode && (
                      <span className="rounded-full border bg-background/80 px-3 py-1">{profileData.publicCode}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-[320px] lg:shrink-0 lg:justify-end mt-4 lg:mt-0">
                {!isEditing ? (
                  <Button key="edit-btn" onClick={handleStartEditing} className="gap-2 shadow-sm w-full sm:w-auto">
                    <Edit2Icon className="size-4" />
                    Editar información
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button key="cancel-btn" onClick={handleCancelEditing} variant="ghost" className="gap-2 text-muted-foreground w-full sm:w-auto">
                      <XIcon className="size-4" />
                      Cancelar
                    </Button>
                    <Button key="save-btn" type="submit" form="profile-form" disabled={saving} className="gap-2 w-full sm:w-auto">
                      {saving ? <Spinner className="size-4" /> : <SaveIcon className="size-4" />}
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <Card className={cn("transition-all duration-300", isEditing ? "ring-2 ring-primary/20 shadow-lg" : "")}>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  {isEditing ? "Edita tus datos de contacto básicos." : "Vista general de tus datos de perfil."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                          <InputGroup key={index}>
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
                            variant="outline"
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
              </CardContent>
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cuenta y Seguridad</CardTitle>
                <CardDescription>Acceso y controles sensibles de tu cuenta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <ShieldCheckIcon className="size-5 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Cuenta Verificada</p>
                    <p className="text-xs text-muted-foreground">Tu identidad está confirmada</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setIsPasswordDialogOpen(true)}>
                  Cambiar Contraseña
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen rápido</CardTitle>
                <CardDescription>Datos principales usados en operaciones.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ProfileInfoTile icon={PhoneIcon} label="Teléfono" value={phone || "Sin teléfono"} />
                <ProfileInfoTile icon={IdCardIcon} label="DNI" value={dni || "Sin DNI"} />
                <ProfileInfoTile icon={MapPinIcon} label="Dirección" value={address || "Sin dirección"} />
                <ProfileInfoTile icon={BanknoteIcon} label="Banco" value={bank || "Sin banco"} />
                <ProfileInfoTile
                  icon={BanknoteIcon}
                  label="Cuentas"
                  value={normalizeBankAccounts(bankAccounts).length ? `${normalizeBankAccounts(bankAccounts).length} registradas` : "Sin cuentas"}
                />
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
      <Card className="overflow-hidden border-border/60 shadow-sm">
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

function ProfileInfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
