import {
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ResponsiveSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetTitle,
} from "@/components/ui/responsive-sheet"
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

  return (
    <Sheet open={mode !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent contentKey={mode} defaultDesktopWidth={520} minDesktopWidth={420} maxDesktopWidth={720}>
        <SheetHeader>
          <SheetTitle>{approving ? "Aprobar préstamo" : "Rechazar préstamo"}</SheetTitle>
          <SheetDescription>
            {approving
              ? "Confirma que el préstamo puede avanzar al siguiente estado operativo."
              : "Puedes añadir una observación para dejar el motivo de rechazo."}
          </SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
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
        </SheetPanel>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant={approving ? "default" : "destructive"} onClick={onConfirm} disabled={submitting}>
            {submitting ? <Spinner /> : approving ? <CheckCircleIcon data-icon="inline-start" /> : <XCircleIcon data-icon="inline-start" />}
            {approving ? "Aprobar" : "Rechazar"}
          </Button>
        </SheetFooter>
      </ResponsiveSheetContent>
    </Sheet>
  )
}
