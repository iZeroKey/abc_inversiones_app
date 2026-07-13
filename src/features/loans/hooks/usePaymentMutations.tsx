import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react"

import { toastManager } from "@/components/ui/toast"
import {
  compactPayload,
  DeleteWorkflowDialog,
  PaymentDialog,
  ProcessVoucherDialog,
  toIsoOrUndefined,
  VoucherDialog,
} from "@/features/loans/components/PaymentWorkflowDialogs"
import type { FetchWithAuth } from "@/lib/api-client"
import {
  analyzeVoucherEvidence,
  checkOperationIdExists,
  createPayment,
  deletePayment,
  deleteVoucher,
  processVoucher,
  submitVoucher,
  updatePayment,
  updateVoucher,
  type PaymentMutationPayload,
  type VoucherSubmitPayload,
} from "@/lib/loans-api"
import { formatDate } from "@/features/loans/loan-utils"
import type { Loan, Payment, PaymentMethod, PaymentVoucher } from "@/types/loans"

type UsePaymentMutationsProps = {
  loan: Loan
  fetchWithAuth: FetchWithAuth
  session: { access_token?: string } | null
  onDataChanged?: () => Promise<void> | void
  drawerWidth?: number
}

export function DelayedOpenGate({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: (open: boolean, onOpenChange: (open: boolean) => void) => ReactElement | null
}) {
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setOpening(true))
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  const delayedOpen = open && opening

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      setOpening(false)
    }
    onOpenChange(next)
  }, [onOpenChange])

  return children(delayedOpen, handleOpenChange)
}

function getErrorText(error: unknown) {
  return error instanceof Error ? error.message : "Inténtalo nuevamente."
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function toInputDate(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

export function usePaymentMutations({ loan, fetchWithAuth, session, onDataChanged, drawerWidth }: UsePaymentMutationsProps) {
  const [paymentDialogPayment, setPaymentDialogPayment] = useState<Payment | null | undefined>()
  const [voucherDialogVoucher, setVoucherDialogVoucher] = useState<PaymentVoucher | null | undefined>()
  const [processDialog, setProcessDialog] = useState<{
    voucher: PaymentVoucher
    mode: "approve" | "reject"
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "payment" | "voucher"
    item: Payment | PaymentVoucher
    source?: "list" | "gallery"
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [lastMutatedItem, setLastMutatedItem] = useState<{
    id: string
    type: "voucher" | "payment"
    status: string
    updatedAt: string
  } | null>(null)

  const queryClient = useQueryClient()

  const refreshAfterMutation = async (title: string, description: string) => {
    toastManager.add({ type: "success", title, description })
    await onDataChanged?.()
  }

  const handlePaymentSubmit = async (
    form: {
      amount: string
      paymentDate: string
      method: PaymentMethod
      reference: string
      observation: string
      evidence: File | null
    },
    onUploadProgress: (progress: number) => void,
  ) => {
    const payload = compactPayload<PaymentMutationPayload>({
      amount: form.amount,
      paymentDate: toIsoOrUndefined(form.paymentDate),
      method: form.method,
      reference: form.reference.trim() || undefined,
      observation: form.observation.trim() || undefined,
      evidence: form.evidence,
    })

    setSubmitting(true)
    try {
      if (paymentDialogPayment) {
        await updatePayment(fetchWithAuth, paymentDialogPayment.id, payload as PaymentMutationPayload)
        clearStateWithDelay("payment", () => {})
        setPaymentDialogPayment(undefined)
        await refreshAfterMutation("Pago actualizado", "El cronograma se recalculó correctamente.")
      } else {
        await createPayment(
          fetchWithAuth,
          { loanId: loan.id, ...(payload as PaymentMutationPayload) },
          { accessToken: session?.access_token, onUploadProgress },
        )
        clearStateWithDelay("payment", () => {})
        setPaymentDialogPayment(undefined)
        await refreshAfterMutation("Pago registrado", "El pago fue aplicado al préstamo.")
      }
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo guardar el pago",
        description: getErrorText(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleVoucherAnalyze = async (
    file: File,
    onUploadProgress: (progress: number) => void,
    signal?: AbortSignal,
  ) => {
    setAnalyzing(true)
    try {
      const result = await analyzeVoucherEvidence(
        fetchWithAuth,
        file,
        { accessToken: session?.access_token, onUploadProgress, signal },
      )
      return {
        amount: result.extracted?.amount ?? undefined,
        operationId: result.extracted?.operationId ?? undefined,
        operationDate: result.extracted?.operationDate ? toInputDate(result.extracted.operationDate) : undefined,
      }
    } catch (error) {
      if (isAbortError(error)) throw error
      toastManager.add({
        type: "error",
        title: "No se pudo analizar el voucher",
        description: getErrorText(error),
      })
      throw error
    } finally {
      setAnalyzing(false)
    }
  }

  const handleVoucherSubmit = async (
    form: {
      amount: string
      operationId: string
      operationDate: string
      observation: string
      evidence: File | null
    },
    onUploadProgress: (progress: number) => void,
  ) => {
    setSubmitting(true)
    try {
      const operationId = form.operationId.trim()
      if (!voucherDialogVoucher) {
        const exists = await checkOperationIdExists(fetchWithAuth, operationId)
        if (exists) {
          toastManager.add({
            type: "warning",
            title: "Operación duplicada",
            description: "Ese ID de operación ya fue registrado.",
          })
          return
        }
        const payload: VoucherSubmitPayload = {
          loanId: loan.id,
          amount: form.amount,
          operationId,
          operationDate: toIsoOrUndefined(form.operationDate),
          observation: form.observation.trim() || undefined,
          evidence: form.evidence,
        }
        await submitVoucher(
          fetchWithAuth,
          payload,
          { accessToken: session?.access_token, onUploadProgress },
        )
        clearStateWithDelay("voucher", () => {})
        setVoucherDialogVoucher(undefined)
        await refreshAfterMutation("Voucher enviado", "Quedó pendiente de revisión.")
      } else {
        await updateVoucher(fetchWithAuth, voucherDialogVoucher.id, compactPayload({
          amount: form.amount,
          operationId,
          operationDate: toIsoOrUndefined(form.operationDate),
          observation: form.observation.trim() || undefined,
        }))
        clearStateWithDelay("voucher", () => {})
        setVoucherDialogVoucher(undefined)
        await refreshAfterMutation("Voucher actualizado", "Los datos quedaron sincronizados.")
      }
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo guardar el voucher",
        description: getErrorText(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleProcessVoucher = async (form: { action: "approve" | "reject"; observation: string }) => {
    if (!processDialog) return

    setSubmitting(true)
    try {
      const result = await processVoucher(fetchWithAuth, processDialog.voucher.id, {
        action: form.action,
        observation: form.observation.trim() || undefined,
      })

      const updatedVoucher = result.data
      if (updatedVoucher) {
        queryClient.setQueriesData<{ pages?: { vouchers: PaymentVoucher[] }[] }>(
          { queryKey: ["abc", "vouchers"] },
          (old) => {
            if (!old?.pages) return old
            
            const nextPages = old.pages.map(page => {
              const idx = page.vouchers.findIndex((v) => v.id === updatedVoucher.id)
              if (idx === -1) return page
              const nextVouchers = [...page.vouchers]
              nextVouchers[idx] = updatedVoucher
              return { ...page, vouchers: nextVouchers }
            })
            
            return { ...old, pages: nextPages }
          },
        )

        queryClient.setQueriesData<{ pages?: { data: { type: "payment" | "voucher"; id: string; status: string; observation?: string | null; updatedAt?: string }[] }[] }>(
          { queryKey: ["abc", "transactions"] },
          (old) => {
            if (!old?.pages) return old
            
            const nextPages = old.pages.map(page => {
              const idx = page.data.findIndex((t) => t.id === updatedVoucher.id && t.type === "voucher")
              if (idx === -1) return page
              const nextTransactions = [...page.data]
              nextTransactions[idx] = { 
                ...nextTransactions[idx], 
                status: updatedVoucher.status ?? nextTransactions[idx].status, 
                observation: updatedVoucher.observation ?? nextTransactions[idx].observation,
                updatedAt: updatedVoucher.updatedAt ?? new Date().toISOString()
              }
              return { ...page, data: nextTransactions }
            })
            
            return { ...old, pages: nextPages }
          },
        )

        setLastMutatedItem({
          id: updatedVoucher.id,
          type: "voucher",
          status: updatedVoucher.status ?? "unknown",
          updatedAt: updatedVoucher.updatedAt ?? new Date().toISOString(),
        })
      }
      clearStateWithDelay("process", () => {})
      setProcessDialog(null)
      await refreshAfterMutation(
        form.action === "approve" ? "Voucher aprobado" : "Voucher rechazado",
        "El estado se actualizó correctamente.",
      )
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo procesar el voucher",
        description: getErrorText(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTarget = async () => {
    if (!deleteTarget) return

    setSubmitting(true)
    try {
      if (deleteTarget.type === "payment") {
        await deletePayment(fetchWithAuth, deleteTarget.item.id)
        queryClient.setQueriesData<{ pages?: { data: { id: string, type: string }[] }[] }>(
          { queryKey: ["abc", "transactions"] },
          (old) => {
            if (!old?.pages) return old
            return {
              ...old,
              pages: old.pages.map(p => ({
                ...p,
                data: p.data.map(t => t.id === deleteTarget.item.id && t.type === "payment" ? { ...t, status: "reversed", updatedAt: new Date().toISOString() } : t)
              }))
            }
          }
        )
        setLastMutatedItem({
          id: deleteTarget.item.id,
          type: "payment",
          status: "reversed",
          updatedAt: new Date().toISOString(),
        })
      } else {
        await deleteVoucher(fetchWithAuth, deleteTarget.item.id)

        queryClient.setQueriesData<{ pages?: { vouchers: PaymentVoucher[] }[] }>(
          { queryKey: ["abc", "vouchers"] },
          (old) => {
            if (!old?.pages) return old
            return {
              ...old,
              pages: old.pages.map(p => ({
                ...p,
                vouchers: p.vouchers.map(v => v.id === deleteTarget.item.id ? { ...v, status: "deleted", updatedAt: new Date().toISOString() } : v)
              }))
            }
          }
        )

        queryClient.setQueriesData<{ pages?: { data: { id: string, type: string }[] }[] }>(
          { queryKey: ["abc", "transactions"] },
          (old) => {
            if (!old?.pages) return old
            return {
              ...old,
              pages: old.pages.map(p => ({
                ...p,
                data: p.data.map(t => t.id === deleteTarget.item.id && t.type === "voucher" ? { ...t, status: "deleted", updatedAt: new Date().toISOString() } : t)
              }))
            }
          }
        )
        setLastMutatedItem({
          id: deleteTarget.item.id,
          type: "voucher",
          status: "deleted",
          updatedAt: new Date().toISOString(),
        })
      }

      const isPayment = deleteTarget.type === "payment"
      
      clearStateWithDelay("delete", () => {})
      setDeleteTarget(null)

      if (isPayment) {
        await refreshAfterMutation("Pago eliminado", "El préstamo fue recalculado.")
      } else {
        await refreshAfterMutation("Voucher eliminado", "El flujo quedó actualizado.")
      }
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo eliminar",
        description: getErrorText(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const closingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [closingType, setClosingType] = useState<string | null>(null)

  const clearStateWithDelay = useCallback((type: string, clear: () => void) => {
    clearTimeout(closingTimeoutRef.current)
    setClosingType(type)
    closingTimeoutRef.current = setTimeout(() => {
      setClosingType(null)
      clear()
    }, 500)
  }, [])

  useEffect(() => () => clearTimeout(closingTimeoutRef.current), [])

  const paymentOpen = paymentDialogPayment !== undefined
  const voucherOpen = voucherDialogVoucher !== undefined
  const processOpen = processDialog !== null
  const deleteOpen = deleteTarget !== null && deleteTarget.source !== "gallery"

  const showPayment = paymentOpen || closingType === "payment"
  const showVoucher = voucherOpen || closingType === "voucher"
  const showProcess = processOpen || closingType === "process"
  const showDelete = deleteOpen || closingType === "delete"

  const anyDialog = showPayment || showVoucher || showProcess || showDelete

  const dialogElements: ReactElement | null = anyDialog ? (
    <>
      {showPayment && (
        <DelayedOpenGate open={paymentOpen} onOpenChange={(open) => { if (!open) clearStateWithDelay("payment", () => setPaymentDialogPayment(undefined)) }}>
          {(gateOpen, gateOnOpenChange) => (
            <PaymentDialog
              open={gateOpen}
              payment={paymentDialogPayment}
              submitting={submitting}
              analyzing={analyzing}
              drawerWidth={drawerWidth}
              onOpenChange={gateOnOpenChange}
              onAnalyze={async (file, onUploadProgress, signal) => {
                const analyzed = await handleVoucherAnalyze(file, onUploadProgress, signal)
                return {
                  amount: analyzed.amount,
                  reference: analyzed.operationId,
                  paymentDate: analyzed.operationDate,
                }
              }}
              onSubmit={(form, onUploadProgress) => handlePaymentSubmit(form, onUploadProgress)}
            />
          )}
        </DelayedOpenGate>
      )}
      {showVoucher && (
        <DelayedOpenGate open={voucherOpen} onOpenChange={(open) => { if (!open) clearStateWithDelay("voucher", () => setVoucherDialogVoucher(undefined)) }}>
          {(gateOpen, gateOnOpenChange) => (
            <VoucherDialog
              open={gateOpen}
              voucher={voucherDialogVoucher}
              submitting={submitting}
              analyzing={analyzing}
              onOpenChange={gateOnOpenChange}
              onAnalyze={handleVoucherAnalyze}
              onSubmit={(form, onUploadProgress) => handleVoucherSubmit(form, onUploadProgress)}
            />
          )}
        </DelayedOpenGate>
      )}
      {showProcess && (
        <DelayedOpenGate open={processOpen} onOpenChange={(open) => { if (!open) clearStateWithDelay("process", () => setProcessDialog(null)) }}>
          {(gateOpen, gateOnOpenChange) => (
            <ProcessVoucherDialog
              open={gateOpen}
              voucher={processDialog?.voucher ?? null}
              mode={processDialog?.mode ?? "approve"}
              submitting={submitting}
              onOpenChange={gateOnOpenChange}
              onSubmit={(form) => void handleProcessVoucher(form)}
            />
          )}
        </DelayedOpenGate>
      )}
      {showDelete && (
        <DelayedOpenGate open={deleteOpen} onOpenChange={(open) => { if (!open) clearStateWithDelay("delete", () => setDeleteTarget(null)) }}>
          {(gateOpen, gateOnOpenChange) => (
            <DeleteWorkflowDialog
              open={gateOpen}
              title={deleteTarget?.type === "payment" ? "Eliminar pago" : "Eliminar voucher"}
              description={
                deleteTarget?.type === "payment"
                  ? `¿Estás seguro de eliminar el pago de S/ ${deleteTarget.item.amount} del ${formatDate((deleteTarget.item as Payment).paymentDate || deleteTarget.item.createdAt)}? El pago se eliminará lógicamente y el préstamo se recalculará.`
                  : deleteTarget
                    ? `¿Estás seguro de eliminar el voucher de S/ ${deleteTarget.item.amount} del ${formatDate((deleteTarget.item as PaymentVoucher).operationDate || deleteTarget.item.createdAt)}? El voucher se eliminará lógicamente. Si ya generó un pago, el sistema lo revertirá.`
                    : ""
              }
              submitting={submitting}
              onOpenChange={gateOnOpenChange}
              onConfirm={() => void handleDeleteTarget()}
            />
          )}
        </DelayedOpenGate>
      )}
    </>
  ) : null

  return {
    paymentDialogPayment,
    voucherDialogVoucher,
    processDialog,
    deleteTarget,
    submitting,
    analyzing,
    setPaymentDialogPayment,
    setVoucherDialogVoucher,
    setProcessDialog,
    setDeleteTarget,
    handleDeleteTarget,
    dialogElements,
    lastMutatedItem,
  }
}
