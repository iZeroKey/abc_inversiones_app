import {
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Drawer,
  DrawerPopup,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-media-query"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { loanClientName, loanPublicCode } from "@/features/loans/loan-utils"
import type { Loan } from "@/types/loans"

export function ReviewLoanDialog({
  mode,
  loan,
  observation,
  submitting,
  onObservationChange,
  onOpenChange,
  onConfirm,
}: {
  mode: "approve" | "reject" | null
  loan: Loan | null
  observation: string
  submitting: boolean
  onObservationChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  if (!mode) return null

  const approving = mode === "approve"
  const isMobile = useIsMobile()

  return (
    <Drawer open={mode !== null} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 520, maxWidth: "min(720px, calc(100vw - 2rem))", minWidth: 420 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{approving ? "Aprobar préstamo" : "Rechazar préstamo"}</DrawerTitle>
          <DrawerDescription>
            {approving
              ? "Confirma que el préstamo puede avanzar al siguiente estado operativo."
              : "Puedes añadir una observación para dejar el motivo de rechazo."}
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1">
          <DrawerPanel className="flex flex-col gap-4">
            <div className="flex gap-3 rounded-xl border bg-muted/35 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {approving ? <CheckCircleIcon /> : <XCircleIcon />}
              </div>
              <div className="min-w-0">
                <p className="font-medium">{loan ? loanClientName(loan) : "Préstamo seleccionado"}</p>
                <p className="font-mono text-xs text-muted-foreground">{loanPublicCode(loan)}</p>
              </div>
            </div>
            {!approving && (
              <Field>
                <FieldLabel htmlFor="reject-observation">Observación</FieldLabel>
                <Textarea id="reject-observation" value={observation} onChange={(event) => onObservationChange(event.target.value)} placeholder="Motivo del rechazo..." />
              </Field>
            )}
          </DrawerPanel>
        </div>
        <DrawerFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant={approving ? "default" : "destructive"} onClick={onConfirm} disabled={submitting}>
            {submitting ? <Spinner /> : approving ? <CheckCircleIcon data-icon="inline-start" /> : <XCircleIcon data-icon="inline-start" />}
            {approving ? "Aprobar" : "Rechazar"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}
