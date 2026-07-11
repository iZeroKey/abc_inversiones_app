import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import { useIsMobile } from "@/hooks/use-media-query"
import { CheckIcon, EyeIcon, EyeOffIcon, LockIcon, XIcon } from "lucide-react"
import { useState } from "react"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

interface ChangePasswordDialogProps {
  isOpen: boolean
  onClose: () => void
}

type ChangePasswordResponse = {
  success: boolean
  message?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

export function ChangePasswordDialog({ isOpen, onClose }: ChangePasswordDialogProps) {
  const { fetchWithAuth } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const isMobile = useIsMobile()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toastManager.add({
        type: "error",
        title: "Error",
        description: "Las contraseñas nuevas no coinciden."
      })
      return
    }

    if (newPassword.length < 6) {
      toastManager.add({
        type: "error",
        title: "Error",
        description: "La nueva contraseña debe tener al menos 6 caracteres."
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const json = (await res.json()) as ChangePasswordResponse

      if (json.success) {
        toastManager.add({
          type: "success",
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido cambiada exitosamente."
        })
        handleClose()
      } else {
        throw new Error(json.message)
      }
    } catch (error: unknown) {
      toastManager.add({
        type: "error",
        title: "Error al cambiar contraseña",
        description: getErrorMessage(error, "No se pudo actualizar la contraseña.")
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    onClose()
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose()
    }} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 460, maxWidth: "min(640px, calc(100vw - 2rem))", minWidth: 380 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>Cambiar Contraseña</DrawerTitle>
          <DrawerDescription>
            Ingresa tu contraseña actual y la nueva contraseña que deseas utilizar.
          </DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contraseña Actual</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <LockIcon className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <InputGroupAddon align="inline-end">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="size-8"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <LockIcon className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <InputGroupAddon align="inline-end">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="size-8"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <LockIcon className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                id="confirmPassword"
                type={showNew ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </InputGroup>
          </div>
        </div>

          <DrawerFooter variant="bare">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={saving} className="w-full sm:w-auto">
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !currentPassword || !newPassword || !confirmPassword} className="w-full sm:w-auto">
              {saving ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
              Guardar Contraseña
            </Button>
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  )
}
