import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog"
import { ImageCropperModal } from "@/components/profile/ImageCropperModal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
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
import { CalendarIcon, CameraIcon, Edit2Icon, MailIcon, PhoneIcon, SaveIcon, ShieldCheckIcon, Trash2Icon, UserIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

type ProfileData = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string | null
  role?: string
  createdAt?: string
}

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

  // Image states
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        if (!API_BASE_URL) throw new Error("No se pudo conectar con el servidor.")
        const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/me`)
        const json = (await res.json()) as ApiResponse<ProfileData>
        if (json.success) {
          setProfileData(json.data)
          setFirstName(json.data.firstName || "")
          setLastName(json.data.lastName || "")
          setPhone(json.data.phone || "")
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
    if (session?.access_token) {
      fetchProfile()
    }
  }, [fetchWithAuth, session?.access_token])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/${user?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName, phone })
      })
      const json = (await res.json()) as ApiResponse<ProfileData>
      if (json.success) {
        toastManager.add({
          type: "success",
          title: "Perfil actualizado",
          description: "Tus datos se han guardado correctamente."
        })
        setProfileData(json.data)
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
    return (
      <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-8">
        <Skeleton className="h-[220px] md:h-[240px] w-full rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="h-[400px] md:col-span-2 rounded-2xl" />
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
      </div>
    )
  }

  const roleMap: Record<string, string> = {
    client: "Cliente",
    investor: "Inversionista",
    admin: "Administrador",
    owner: "Dueño"
  }
  const roleKey = profileData?.role?.toLowerCase() ?? ""
  const memberSinceYear = profileData?.createdAt ? new Date(profileData.createdAt).getFullYear() : "-"

  return (
    <>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(120,119,198,0.16),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.02),rgba(15,23,42,0.06))] px-6 py-6 md:px-8 md:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col items-center gap-5 md:flex-row md:items-center">
                <div className="relative w-fit">
                  <PhotoProvider>
                    {profileData?.avatarUrl ? (
                      <PhotoView src={profileData.avatarUrl}>
                        <button
                          type="button"
                          className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label="Ver avatar en tamaño completo"
                        >
                          <Avatar className="size-32 md:size-28 border border-border/70 shadow-md ring-4 ring-background mx-auto md:mx-0">
                            <AvatarImage src={profileData.avatarUrl} />
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
                    <span className="rounded-full border bg-background/80 px-3 py-1">{profileData?.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-[320px] lg:shrink-0 lg:justify-end mt-4 lg:mt-0">
                {!isEditing ? (
                  <Button key="edit-btn" onClick={() => setIsEditing(true)} className="gap-2 shadow-sm w-full sm:w-auto">
                    <Edit2Icon className="size-4" />
                    Editar información
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button key="cancel-btn" onClick={() => setIsEditing(false)} variant="ghost" className="gap-2 text-muted-foreground w-full sm:w-auto">
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

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
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
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombres</Label>
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellidos</Label>
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
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <MailIcon className="size-4" />
                      </InputGroupAddon>
                      <InputGroupInput 
                        id="email" 
                        value={profileData?.email} 
                        disabled 
                        className="bg-muted/50" 
                      />
                    </InputGroup>
                    <p className="text-[10px] text-muted-foreground">El correo electrónico no puede ser modificado por seguridad.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <PhoneIcon className="size-4" />
                      </InputGroupAddon>
                      <InputGroupInput 
                        id="phone" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+51 999 999 999"
                        disabled={!isEditing}
                      />
                    </InputGroup>
                  </div>

                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cuenta y Seguridad</CardTitle>
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
