import { CheckIcon, CopyIcon, Dice5Icon, KeyRoundIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field, FieldLabel } from "@/components/ui/field"
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
}: {
  request: AccessRequest | null
  onOpenChange: (open: boolean) => void
  onReview: (request: AccessRequest, action: "approved" | "rejected") => void
}) {
  const isMobile = useIsMobile()
  if (!request) return null

  const pending = Boolean(request && isPendingRequest(request.status))

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
            {request
              ? `${displayPersonName(request)} solicitó acceso como ${getRoleLabel(request.roleRequested).toLowerCase()}.`
              : "Selecciona una solicitud para revisar su información."}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel className="p-4 sm:p-6">
          {request && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold tracking-normal">
                    {displayPersonName(request)}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {request.id}
                  </p>
                </div>
                <RequestStatusBadge status={request.status} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <RequestDetailItem label="Rol solicitado" value={getRoleLabel(request.roleRequested)} />
                <RequestDetailItem label="Estado" value={getRequestStatusLabel(request.status)} />
                <RequestDetailItem label="Creada" value={formatDate(request.createdAt)} />
                <RequestDetailItem label="Actualizada" value={formatDate(request.updatedAt)} />
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">Contacto</p>
                <div className="mt-3">
                  <ContactStack email={request.email} phone={request.phone} />
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">Observación</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {request.observation || "Sin observación registrada."}
                </p>
              </div>

              {pending && (
                <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => onReview(request, "rejected")}
                  >
                    <XIcon data-icon="inline-start" />
                    Rechazar
                  </Button>
                  <Button onClick={() => onReview(request, "approved")}>
                    <CheckIcon data-icon="inline-start" />
                    Aprobar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  )
}

function RequestDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 wrap-break-word text-sm font-medium">{value}</p>
    </div>
  )
}

export function ReviewRequestDialog({
  request,
  action,
  observation,
  initialPassword,
  submitting,
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
  onObservationChange: (value: string) => void
  onInitialPasswordChange: (value: string) => void
  onRegeneratePassword: () => void
  onCopyPassword: () => Promise<void>
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const isMobile = useIsMobile()
  if (!request || !action) return null

  const approving = action === "approved"

  return (
    <Drawer open={Boolean(request && action)} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 520, maxWidth: "min(720px, calc(100vw - 2rem))", minWidth: 420 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{approving ? "Aprobar solicitud" : "Rechazar solicitud"}</DrawerTitle>
          <DrawerDescription>
            {request
              ? `${displayPersonName(request)} solicitó acceso como ${getRoleLabel(request.roleRequested).toLowerCase()}.`
              : "Revisa la solicitud seleccionada."}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerPanel className="pt-4 max-sm:pt-4">
          <div className="flex flex-col gap-4">
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
        </DrawerPanel>

        <DrawerFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={approving ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={submitting || (approving && initialPassword.trim().length < 6)}
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
