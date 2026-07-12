import { ActivityIcon, CalendarIcon, CheckIcon, CopyIcon, Dice5Icon, KeyRoundIcon, ShieldIcon, XIcon } from "lucide-react"
import { useState } from "react"

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
import { InfoRow } from "@/components/ui/info-row"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-media-query"

import { ContactStack, RequestStatusBadge } from "./components"
import type { AccessRequest } from "./utils"
import {
  displayPersonName,
  formatDate,
  getRequestStatusLabel,
  getRoleLabel,
  isPendingRequest,
} from "./utils"

export function RequestDetailSheet({
  request,
  onOpenChange,
  onReview,
  children,
}: {
  request: AccessRequest | null
  onOpenChange: (open: boolean) => void
  onReview: (request: AccessRequest, action: "approved" | "rejected") => void
  children?: React.ReactNode
}) {
  const isMobile = useIsMobile()
  const [prevRequest, setPrevRequest] = useState<AccessRequest | null>(null)
  if (request !== prevRequest && request !== null) {
    setPrevRequest(request)
  }
  const displayRequest = request || prevRequest

  const pending = Boolean(displayRequest && isPendingRequest(displayRequest.status))

  return (
    <Drawer open={Boolean(request)} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 620, maxWidth: "min(840px, calc(100vw - 2rem))", minWidth: 460 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>Detalle de solicitud</DrawerTitle>
          <DrawerDescription>
            {displayRequest
              ? `${displayPersonName(displayRequest)} solicitó acceso como ${getRoleLabel(displayRequest.roleRequested).toLowerCase()}.`
              : "Selecciona una solicitud para revisar su información."}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel>
          {displayRequest && (
            <div className="flex flex-col gap-6 fade-in animate-in slide-in-from-bottom-2 duration-300 pb-8">
              <div className="flex items-start justify-between gap-3 pb-2">
                <div className="min-w-0">
                  <p className="truncate text-xl font-bold tracking-tight">
                    {displayPersonName(displayRequest)}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {displayRequest.id}
                  </p>
                </div>
                <RequestStatusBadge status={displayRequest.status} />
              </div>

              <div className="rounded-xl bg-muted/30 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Detalles de la solicitud</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={<ShieldIcon className="size-4" />} label="Rol solicitado" value={getRoleLabel(displayRequest.roleRequested)} />
                  <InfoRow icon={<ActivityIcon className="size-4" />} label="Estado" value={getRequestStatusLabel(displayRequest.status)} />
                  <InfoRow icon={<CalendarIcon className="size-4" />} label="Creada" value={formatDate(displayRequest.createdAt)} />
                  <InfoRow icon={<CalendarIcon className="size-4" />} label="Actualizada" value={formatDate(displayRequest.updatedAt)} />
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Contacto</h3>
                <div className="mt-2">
                  <ContactStack email={displayRequest.email} phone={displayRequest.phone} />
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Observación</h3>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {displayRequest.observation || "Sin observación registrada."}
                </p>
              </div>
            </div>
          )}
        </DrawerPanel>
        
        {displayRequest && (
          <DrawerFooter variant="bare">
            <DrawerClose render={<Button variant="secondary" className="w-full sm:flex-1" />}>
              Cerrar
            </DrawerClose>
            {pending && (
              <>
                <Button
                  variant="destructive"
                  className="w-full sm:flex-1"
                  onClick={() => onReview(displayRequest, "rejected")}
                >
                  <XIcon data-icon="inline-start" />
                  Rechazar
                </Button>
                <Button 
                  className="w-full sm:flex-1"
                  onClick={() => onReview(displayRequest, "approved")}
                >
                  <CheckIcon data-icon="inline-start" />
                  Aprobar
                </Button>
              </>
            )}
          </DrawerFooter>
        )}
      </DrawerPopup>

      {children}
    </Drawer>
  )
}

export function ReviewRequestDialog({
  request,
  action,
  observation,
  initialPassword,
  submitting,
  nested,
  onObservationChange,
  onInitialPasswordChange,
  onRegeneratePassword,
  onCopyPassword,
  onOpenChange,
  onConfirm,
}: {
  request: AccessRequest | null
  action: "approved" | "rejected" | null
  observation: string
  initialPassword: string
  submitting: boolean
  nested?: boolean
  onObservationChange: (value: string) => void
  onInitialPasswordChange: (value: string) => void
  onRegeneratePassword: () => void
  onCopyPassword: () => Promise<void>
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const isMobile = useIsMobile()
  const [prevRequest, setPrevRequest] = useState<AccessRequest | null>(null)
  const [prevAction, setPrevAction] = useState<"approved" | "rejected" | null>(null)
  
  if (request !== prevRequest && request !== null) {
    setPrevRequest(request)
  }
  if (action !== prevAction && action !== null) {
    setPrevAction(action)
  }
  
  const displayRequest = request || prevRequest
  const displayAction = action || prevAction

  const approving = displayAction === "approved"

  return (
    <Drawer nested={nested} open={Boolean(request && action)} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 520, maxWidth: "min(720px, calc(100vw - 2rem))", minWidth: 420 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{approving ? "Aprobar solicitud" : "Rechazar solicitud"}</DrawerTitle>
          <DrawerDescription>
            {displayRequest
              ? `${displayPersonName(displayRequest)} solicitó acceso como ${getRoleLabel(displayRequest.roleRequested).toLowerCase()}.`
              : "Revisa la solicitud seleccionada."}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerPanel>
          {displayRequest && (
            <div className="flex flex-col gap-4 fade-in animate-in pb-4">
              {approving && (
                <Field>
                  <FieldLabel htmlFor="request-initial-password">Contraseña temporal</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <KeyRoundIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="request-initial-password"
                      type="text"
                      value={initialPassword}
                      required
                      minLength={6}
                      onChange={(event) => onInitialPasswordChange(event.target.value)}
                    />
                    <InputGroupAddon align="inline-end">
                      <Button type="button" variant="ghost" size="sm" onClick={onRegeneratePassword}>
                        <Dice5Icon data-icon="inline-start" />
                        Generar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!initialPassword}
                        onClick={() => void onCopyPassword()}
                      >
                        <CopyIcon data-icon="inline-start" />
                        Copiar
                      </Button>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="request-observation">Observación</FieldLabel>
                <Textarea
                  id="request-observation"
                  value={observation}
                  placeholder={approving ? "Usuario validado para acceso." : "Motivo del rechazo."}
                  onChange={(event) => onObservationChange(event.target.value)}
                />
              </Field>
            </div>
          )}
        </DrawerPanel>

        <DrawerFooter variant="bare">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting} className="w-full sm:flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            variant={approving ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={submitting || (approving && initialPassword.trim().length < 6)}
            className="w-full sm:flex-1"
          >
            {submitting ? (
              <Spinner data-icon="inline-start" />
            ) : approving ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <XIcon data-icon="inline-start" />
            )}
            {submitting ? "Procesando..." : approving ? "Aprobar" : "Rechazar"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

