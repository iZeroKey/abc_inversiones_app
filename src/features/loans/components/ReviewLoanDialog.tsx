import {
CheckCircleIcon,
  XCircleIcon,
} from "lucide-react"
import { useRef } from "react"
import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

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
  const lastValidModeRef = useRef(mode)
  if (mode) {
    lastValidModeRef.current = mode
  }

  const displayMode = mode || lastValidModeRef.current || "approve"
  const approving = displayMode === "approve"
  const isMobile = useIsMobile()

  return (
    <Drawer open={mode !== null} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"} nested>
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
          <DrawerPanel className="flex flex-col gap-5">
            <div className="bg-muted/30 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl",
                        approving ? "bg-primary/10 text-primary" : "bg-destructive/15 text-destructive"
                      )}
                    >
                      {approving ? <CheckCircleIcon className="size-6" /> : <XCircleIcon className="size-6" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-base truncate">
                        {loan ? loanClientName(loan) : "Préstamo seleccionado"}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground truncate mt-0.5">
                        {loanPublicCode(loan)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/60" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1 font-medium uppercase tracking-wider">Monto Solicitado</p>
                    <p className="font-bold text-base text-foreground">
                      {loan ? <AnimatedNumber value={loan.amount} isCurrency /> : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1 font-medium uppercase tracking-wider">Condiciones</p>
                    <p className="font-medium text-foreground">
                      {loan ? `${loan.term} meses • ${loan.interestRate}% TEA` : "—"}
                    </p>
                  </div>
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
