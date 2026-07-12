import { BanknoteIcon, CameraIcon, IdCardIcon, MapPinIcon, PhoneIcon, PlusIcon, SaveIcon, Trash2Icon, UserIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toastManager } from "@/components/ui/toast"
import { useIsMobile } from "@/hooks/use-media-query"

import { ImageCropperModal } from "@/components/profile/ImageCropperModal"
import { useAuth } from "@/contexts/auth-context"
import {
  ACCEPTED_AVATAR_FILE_EXTENSIONS,
  ACCEPTED_AVATAR_FORMATS_LABEL,
  optimizeAvatarImage,
  validateAvatarFile,
} from "@/lib/avatar-image"

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

const maritalStatusItems = [
  { label: "Sin registrar", value: "none" },
  { label: "Soltero/a", value: "single" },
  { label: "Casado/a", value: "married" },
  { label: "No especificado", value: "unspecified" },
] as const

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

function normalizeBankAccounts(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean)
}

function normalizeMaritalStatus(value: string) {
  return value === "none" ? null : value
}

function parsePhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return ""
  return phone.replace(/\D/g, "").replace(/^51/, "").slice(0, 9)
}

function resolveProfileAvatarUrl(url?: string | null) {
  if (!url) return undefined
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url
  if (url.startsWith("/") && API_BASE_URL) return `${API_BASE_URL}${url}`
  return url
}

function formatPhoneNumber(value: string) {
  const digits = value.trim().replace(/\D/g, "")
  if (!digits) return ""
  const localDigits = digits.startsWith("51") && digits.length === 11 ? digits.slice(2) : digits
  const trimmed = localDigits.slice(0, 9)
  if (trimmed.length <= 3) return trimmed
  if (trimmed.length <= 6) return `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`
  return `${trimmed.slice(0, 3)} ${trimmed.slice(3, 6)} ${trimmed.slice(6)}`
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

interface ProfileEditDrawerProps {
  isOpen: boolean
  onClose: () => void
  profileData: ProfileData | null
  onSuccess: (updatedProfile: ProfileData) => void
}

export function ProfileEditDrawer({ isOpen, onClose, profileData, onSuccess }: ProfileEditDrawerProps) {
  const { session, fetchWithAuth } = useAuth()
  const isMobile = useIsMobile()
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  
  const [pendingAvatarAction, setPendingAvatarAction] = useState<"upload" | "remove" | null>(null)
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState<Blob | null>(null)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [dni, setDni] = useState("")
  const [address, setAddress] = useState("")
  const [bank, setBank] = useState("")
  const [bankAccounts, setBankAccounts] = useState<string[]>([""])
  const [maritalStatus, setMaritalStatus] = useState("none")
  const canAddBankAccount = bankAccounts.every((account) => account.trim().length > 0)
  const displayName = [profileData?.firstName, profileData?.lastName].filter(Boolean).join(" ").trim() || "Mi perfil"
  const avatarInitials = (
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  )
  const roleLabel = profileData?.isOwner
    ? "Propietario"
    : profileData?.role === "admin"
      ? "Administrador"
      : profileData?.role === "investor"
        ? "Inversionista"
        : profileData?.role === "client"
          ? "Cliente"
          : "Usuario"

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false)
      return
    }

    if (isOpen && profileData && !hasInitialized) {
      setFirstName(profileData.firstName || "")
      setLastName(profileData.lastName || "")
      setPhone(formatPhoneNumber(parsePhoneDisplay(profileData.phone)))
      setDni(profileData.dni || "")
      setAddress(profileData.address || "")
      setBank(profileData.bank || "")
      setBankAccounts(profileData.bankAccounts?.length ? profileData.bankAccounts : [""])
      setMaritalStatus(profileData.maritalStatus || "none")
      
      setPendingAvatarAction(null)
      setPendingAvatarBlob(null)
      if (previewAvatarUrl) {
        setPreviewAvatarUrl(null)
      }

      setHasInitialized(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, profileData, hasInitialized])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileData?.id) return

    setSaving(true)
    setUploadProgress(null)
    try {
      const cleanPhone = phone.trim()
      const formattedPhone = cleanPhone ? `+51 ${cleanPhone}` : null

      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/${profileData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: formattedPhone,
          dni: dni.trim() || null,
          address: address.trim() || null,
          bank: bank.trim() || null,
          bankAccounts: normalizeBankAccounts(bankAccounts),
          maritalStatus: normalizeMaritalStatus(maritalStatus),
        })
      })
      const json = (await res.json()) as ApiResponse<ProfileData>
      if (!json.success) {
        throw new Error(json.message)
      }

      let finalProfileData = json.data

      if (pendingAvatarAction === "upload" && pendingAvatarBlob) {
        const formData = new FormData()
        formData.append("avatar", pendingAvatarBlob, "avatar.webp")

        const payload = await uploadAvatarWithProgress(
          `${API_BASE_URL}/api/v1/users/me/avatar`,
          formData,
          session?.access_token || "",
          (progress) => {
            setUploadProgress(progress)
          }
        )

        if (payload.success) {
          finalProfileData = { ...finalProfileData, avatarUrl: previewAvatarUrl || payload.data.avatarUrl }
        } else {
          toastManager.add({
            type: "error",
            title: "Error al subir imagen",
            description: payload.message || "No se pudo actualizar la foto de perfil.",
          })
        }
      } else if (pendingAvatarAction === "remove") {
        const deleteRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/me/avatar`, {
          method: "DELETE",
        })
        const deleteJson = (await deleteRes.json()) as ApiResponse<ProfileData>
        if (deleteJson.success) {
          finalProfileData = deleteJson.data
        }
      }

      toastManager.add({
        type: "success",
        title: "Perfil actualizado",
        description: "Tus datos se han guardado correctamente."
      })
      
      onSuccess(finalProfileData)
    } catch (error: unknown) {
      toastManager.add({
        type: "error",
        title: "Error al actualizar",
        description: getErrorMessage(error, "No se pudieron guardar los cambios.")
      })
    } finally {
      setSaving(false)
      setUploadProgress(null)
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
    if (saving) return
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

  const handleRemoveAvatar = () => {
    if (saving) return
    setPendingAvatarAction("remove")
    setPendingAvatarBlob(null)
    if (previewAvatarUrl) {
      setPreviewAvatarUrl(null)
    }
  }

  const handleCropComplete = async (croppedImage: Blob) => {
    try {
      const optimizedImage = await optimizeAvatarImage(croppedImage)
      setPendingAvatarBlob(optimizedImage)
      setPendingAvatarAction("upload")
      setPreviewAvatarUrl(URL.createObjectURL(optimizedImage))
    } catch (error: unknown) {
      toastManager.add({
        type: "error",
        title: "Error al procesar imagen",
        description: getErrorMessage(error, `No se pudo optimizar la foto. Formatos permitidos: ${ACCEPTED_AVATAR_FORMATS_LABEL}.`)
      })
    } finally {
      setIsCropperOpen(false)
      setSelectedImage(null)
    }
  }

  const avatarSrc = pendingAvatarAction === "upload" && previewAvatarUrl 
    ? previewAvatarUrl 
    : pendingAvatarAction === "remove" 
      ? undefined 
      : resolveProfileAvatarUrl(profileData?.avatarUrl)

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose} position={isMobile ? "bottom" : "right"}>
        <DrawerPopup
          showCloseButton={!isMobile}
          className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
          style={!isMobile ? { width: 620, maxWidth: "min(840px, calc(100vw - 2rem))", minWidth: 460 } : undefined}
        >
          <DrawerHeader>
            <DrawerTitle>Editar Perfil</DrawerTitle>
            <DrawerDescription>Actualiza tu información personal, bancaria y foto de perfil.</DrawerDescription>
          </DrawerHeader>

          <DrawerPanel>
            <form id="edit-profile-form" onSubmit={handleUpdate} className="flex flex-col gap-6 pb-6">
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative flex flex-col items-center">
                  <div className="relative size-28">
                    <Avatar className="size-full border-4 border-background bg-background shadow-lg">
                      <AvatarImage key={avatarSrc} src={avatarSrc} />
                      <AvatarFallback className="bg-primary text-3xl font-bold text-primary-foreground">
                        {avatarInitials}
                      </AvatarFallback>
                    </Avatar>

                    {saving && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xs select-none">
                        <Spinner className="size-8 text-white" />
                      </div>
                    )}
                  </div>

                  {!saving && (
                    <div className="absolute -bottom-2 inset-x-0 z-10 flex justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={openAvatarPicker}
                        className="rounded-full border-2 border-background bg-primary p-1.5 text-primary-foreground shadow-lg transition-transform hover:scale-110"
                        aria-label="Cambiar foto de perfil"
                      >
                        <CameraIcon className="size-3.5" />
                      </button>
                      {(profileData?.avatarUrl || pendingAvatarAction === "upload") && pendingAvatarAction !== "remove" && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="rounded-full border-2 border-background bg-destructive p-1.5 text-destructive-foreground shadow-lg transition-transform hover:scale-110"
                          aria-label="Eliminar foto de perfil"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-center">
                  <p className="truncate text-xl font-bold tracking-tight">{displayName}</p>
                  <p className="truncate font-mono text-sm text-muted-foreground">
                    {profileData?.publicCode || profileData?.id || "Se asignará al guardar"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant="secondary">{roleLabel}</Badge>
                  {profileData?.isOwner && <Badge variant="outline">Propietario</Badge>}
                </div>
              </div>

              {uploadProgress !== null && (
                <div className="mx-auto w-full max-w-60 animate-in fade-in-0 duration-300">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                    <span>Subiendo imagen...</span>
                    <span className="tabular-nums">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1" />
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={ACCEPTED_AVATAR_FILE_EXTENSIONS}
                onChange={handleImageSelect}
                disabled={saving}
              />

              <div className="rounded-xl bg-muted/30 p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Datos personales</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="firstName">Nombres</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <UserIcon />
                      </InputGroupAddon>
                      <InputGroupInput 
                        id="firstName" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={saving}
                      />
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lastName">Apellidos</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <UserIcon />
                      </InputGroupAddon>
                      <InputGroupInput 
                        id="lastName" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={saving}
                      />
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="dni">DNI</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <IdCardIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="dni"
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        placeholder="12345678"
                        disabled={saving}
                      />
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="maritalStatus">Estado civil</FieldLabel>
                    <Select
                      items={maritalStatusItems}
                      value={maritalStatus}
                      onValueChange={(value) => setMaritalStatus(value ?? "none")}
                      disabled={saving}
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
              </div>

              <div className="rounded-xl bg-muted/30 p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Contacto</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <PhoneIcon />
                        <InputGroupText>+51</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput 
                        id="phone" 
                        value={phone} 
                        onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                        onBlur={() => setPhone((current) => formatPhoneNumber(current))}
                        placeholder="999 999 999"
                        disabled={saving}
                      />
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="address">Dirección</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <MapPinIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Av. Principal 123"
                        disabled={saving}
                      />
                    </InputGroup>
                  </Field>
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Información bancaria</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="bank">Banco</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <BanknoteIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="bank"
                        value={bank}
                        onChange={(e) => setBank(e.target.value)}
                        placeholder="BCP, Interbank..."
                        disabled={saving}
                      />
                    </InputGroup>
                  </Field>

                  <Field>
                    <FieldLabel>Cuentas bancarias</FieldLabel>
                    <div className="flex w-full flex-col gap-2">
                      {bankAccounts.map((account, index) => (
                        <InputGroup key={index}>
                          <InputGroupAddon align="inline-start">
                            <BanknoteIcon />
                          </InputGroupAddon>
                          <InputGroupInput
                            aria-label={`Cuenta bancaria ${index + 1}`}
                            value={account}
                            className="font-mono tabular-nums"
                            onChange={(event) => updateBankAccount(index, event.target.value)}
                            placeholder="CCI o número de cuenta"
                            disabled={saving}
                          />
                          {bankAccounts.length > 1 && (
                            <InputGroupAddon align="inline-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Eliminar cuenta bancaria"
                                onClick={() => removeBankAccount(index)}
                                disabled={saving}
                              >
                                <XIcon />
                              </Button>
                            </InputGroupAddon>
                          )}
                        </InputGroup>
                      ))}
                      {canAddBankAccount && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8.5 w-full justify-center border-dashed text-muted-foreground sm:h-7.5"
                          onClick={addBankAccount}
                          disabled={saving}
                        >
                          <PlusIcon data-icon="inline-start" />
                          Agregar cuenta
                        </Button>
                      )}
                    </div>
                  </Field>
                </div>
              </div>
              
            </form>
          </DrawerPanel>
          
          <DrawerFooter variant="bare">
            <DrawerClose render={<Button type="button" variant="secondary" disabled={saving} className="w-full sm:flex-1" />}>
              Cancelar
            </DrawerClose>
            <Button type="submit" form="edit-profile-form" disabled={saving} className="gap-2 w-full sm:flex-1">
              {saving ? <Spinner className="size-4" /> : <SaveIcon className="size-4" />}
              Guardar Cambios
            </Button>
          </DrawerFooter>
        </DrawerPopup>

        <ImageCropperModal
          image={selectedImage}
          isOpen={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          onCropComplete={handleCropComplete}
        />
      </Drawer>
    </>
  )
}
