import {
  CalendarIcon,
  CheckIcon,
  EyeIcon,
  FileImageIcon,
  ReceiptTextIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { useEffect, useRef, useState, type Dispatch, type DragEvent, type FormEvent, type SetStateAction } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import {
  Drawer,
  DrawerClose,
  DrawerPopup,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-media-query"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  Payment,
  PaymentMethod,
  PaymentVoucher,
} from "@/types/loans"
import { PhotoProvider, PhotoView } from "react-photo-view"

const methodItems: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "deposit", label: "Depósito" },
  { value: "other", label: "Otro" },
]

type PaymentFormState = {
  amount: string
  paymentDate: string
  method: PaymentMethod
  reference: string
  observation: string
  evidence: File | null
}

type VoucherFormState = {
  amount: string
  operationId: string
  operationDate: string
  observation: string
  evidence: File | null
}

type ProcessFormState = {
  action: "approve" | "reject"
  observation: string
}

type FileUploadState = {
  mode: "scan" | "submit"
  progress: number
  phase: "idle" | "uploading" | "processing" | "done" | "error"
  message?: string
}

const idleScanState: FileUploadState = { mode: "scan", progress: 0, phase: "idle" }
const maxEvidenceFileSize = 1.5 * 1024 * 1024
const evidenceCompressionMimeType = "image/webp"

export function PaymentDialog({
  open,
  payment,
  submitting,
  presentation = "dialog",
  drawerWidth,
  onOpenChange,
  onAnalyze,
  onSubmit,
}: {
  open: boolean
  payment?: Payment | null
  submitting: boolean
  analyzing: boolean
  presentation?: "dialog" | "panel"
  drawerWidth?: number
  onOpenChange: (open: boolean) => void
  onAnalyze: (
    file: File,
    onUploadProgress: (progress: number) => void,
    signal?: AbortSignal,
  ) => Promise<Partial<PaymentFormState>>
  onSubmit: (form: PaymentFormState, onUploadProgress: (progress: number) => void) => Promise<void> | void
}) {
  const [form, setForm] = useState<PaymentFormState>(getPaymentDefaults(payment))
  const [uploadState, setUploadState] = useState<FileUploadState>(idleScanState)
  const scanAbortRef = useRef<AbortController | null>(null)
  const isMobile = useIsMobile()
  const editing = Boolean(payment)

  const imageBusy = uploadState.phase === "uploading" || uploadState.phase === "processing"
  const scanBusy = imageBusy && uploadState.mode === "scan"
  const fieldsLoading = scanBusy
  const valid = Number(form.amount) > 0
  const canSubmit = valid && !submitting && !scanBusy

  useEffect(() => () => scanAbortRef.current?.abort(), [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    void Promise.resolve(
      onSubmit(form, () => undefined),
    )
  }

  const cancelScan = () => {
    scanAbortRef.current?.abort()
    scanAbortRef.current = null
    setUploadState(idleScanState)
  }

  const isPanel = presentation === "panel"
  const content = (
    <>
        {!isPanel && (
          <DrawerHeader className={cn(isPanel && "p-0 pb-4")}>
            <DrawerTitle>{editing ? "Editar pago" : "Registrar pago"}</DrawerTitle>
            <DrawerDescription>
              El sistema aplicará el monto al cronograma y recalculará el préstamo.
            </DrawerDescription>
          </DrawerHeader>
        )}
        <form className="contents" onSubmit={handleSubmit}>
            <DrawerPanel className={cn("flex flex-col gap-4", isPanel && "p-0")}>
              {!editing && (
                <EvidenceSection
                  file={form.evidence}
                  title="Evidencia opcional"
                  uploadState={uploadState}
                  onFileSelected={(file) => {
                    scanAbortRef.current?.abort()
                    const abortController = new AbortController()
                    scanAbortRef.current = abortController
                    setForm((current) => ({ ...current, evidence: file }))
                    runAutomaticOcr({
                      file,
                      setUploadState,
                      analyze: onAnalyze,
                      signal: abortController.signal,
                      apply: (analyzed) =>
                        setForm((current) => ({
                          ...current,
                          ...removeEmptyValues(analyzed),
                          evidence: file,
                        })),
                      onFinish: () => {
                        if (scanAbortRef.current === abortController) scanAbortRef.current = null
                      },
                    })
                  }}
                  onRemove={() => {
                    scanAbortRef.current?.abort()
                    scanAbortRef.current = null
                    setForm((current) => ({ ...current, evidence: null }))
                    setUploadState(idleScanState)
                  }}
                  onCancelScan={cancelScan}
                />
              )}
              <div className="flex flex-col gap-4 rounded-xl bg-muted/30 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="payment-amount">Monto</FieldLabel>
                    {fieldsLoading ? (
                      <LoadingInputShell />
                    ) : (
                      <MoneyNumberField
                        id="payment-amount"
                        min="0.01"
                        step="0.01"
                        value={form.amount}
                        onValueChange={(amount) => setForm((current) => ({ ...current, amount }))}
                      />
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="payment-reference">Referencia</FieldLabel>
                    {fieldsLoading ? (
                      <LoadingInputShell />
                    ) : (
                      <Input
                        id="payment-reference"
                        size="lg"
                        value={form.reference}
                        onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                        placeholder="Nro. operación"
                      />
                    )}
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Fecha de pago</FieldLabel>
                    {fieldsLoading ? (
                      <LoadingInputShell />
                    ) : (
                      <DatePicker
                        value={form.paymentDate}
                        onChange={(paymentDate) => setForm((current) => ({ ...current, paymentDate }))}
                      />
                    )}
                  </Field>
                  <Field>
                    <FieldLabel>Método</FieldLabel>
                    <Select
                      items={methodItems}
                      value={form.method}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, method: (value ?? "cash") as PaymentMethod }))
                      }
                    >
                      <SelectTrigger size="lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {methodItems.map((item) => (
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
                  <FieldLabel htmlFor="payment-observation">Observación</FieldLabel>
                  <Textarea
                    id="payment-observation"
                    value={form.observation}
                    onChange={(event) => setForm((current) => ({ ...current, observation: event.target.value }))}
                    placeholder="Comentario opcional..."
                  />
                </Field>
              </div>
            </DrawerPanel>
          <DrawerFooter
            variant="bare"
            className={cn("shrink-0", isPanel && "mt-4 border-t bg-transparent px-0 pb-0 pt-4")}
          >
            <DrawerClose render={<Button variant="outline" />}>
              Cancelar
            </DrawerClose>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <Spinner /> : <ReceiptTextIcon data-icon="inline-start" />}
              {editing ? "Guardar pago" : "Registrar pago"}
            </Button>
          </DrawerFooter>
        </form>
    </>
  )

  if (presentation === "panel") {
    return <div className="flex min-h-0 flex-1 flex-col">{content}</div>
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"} nested>
      <DrawerPopup
        showBar
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: drawerWidth ?? 620, maxWidth: "min(1080px, calc(100vw - 2rem))", minWidth: 560 } : undefined}
      >
        {content}
      </DrawerPopup>
    </Drawer>
  )
}

export function VoucherDialog({
  open,
  voucher,
  submitting,
  onOpenChange,
  onAnalyze,
  onSubmit,
}: {
  open: boolean
  voucher?: PaymentVoucher | null
  submitting: boolean
  analyzing: boolean
  onOpenChange: (open: boolean) => void
  onAnalyze: (
    file: File,
    onUploadProgress: (progress: number) => void,
    signal?: AbortSignal,
  ) => Promise<Partial<VoucherFormState>>
  onSubmit: (form: VoucherFormState, onUploadProgress: (progress: number) => void) => Promise<void> | void
}) {
  const [form, setForm] = useState<VoucherFormState>(getVoucherDefaults(voucher))
  const [uploadState, setUploadState] = useState<FileUploadState>(idleScanState)
  const scanAbortRef = useRef<AbortController | null>(null)
  const isMobile = useIsMobile()
  const editing = Boolean(voucher)

  const imageBusy = uploadState.phase === "uploading" || uploadState.phase === "processing"
  const scanBusy = imageBusy && uploadState.mode === "scan"
  const valid = Number(form.amount) > 0 && form.operationId.trim().length > 0
  const canSubmit = valid && !submitting && !scanBusy

  useEffect(() => () => scanAbortRef.current?.abort(), [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    if (form.evidence) setUploadState({ mode: "submit", phase: "uploading", progress: 0 })
    void Promise.resolve(
      onSubmit(form, (progress) =>
        setUploadState({
          mode: "submit",
          phase: progress >= 100 ? "processing" : "uploading",
          progress,
        }),
      ),
    ).finally(() => {
      if (form.evidence) setUploadState({ mode: "submit", phase: "done", progress: 100 })
    })
  }

  const cancelScan = () => {
    scanAbortRef.current?.abort()
    scanAbortRef.current = null
    setUploadState(idleScanState)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"} nested>
      <DrawerPopup
        showCloseButton={!isMobile}
        showBar
        className={cn(
          "[--drawer-swipe-strength:1]",
          isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : "",
        )}
        style={!isMobile ? { width: 720, minWidth: 520, maxWidth: "min(1080px, calc(100vw - 2rem))" } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{editing ? "Editar voucher" : "Subir voucher"}</DrawerTitle>
          <DrawerDescription>
            Confirma los datos del comprobante antes de enviarlo a revisión.
          </DrawerDescription>
        </DrawerHeader>
        <form className="contents" onSubmit={handleSubmit}>
          <DrawerPanel className="flex flex-col gap-4">
            {!editing && (
              <EvidenceSection
                file={form.evidence}
                title="Evidencia"
                uploadState={uploadState}
                onFileSelected={(file) => {
                  scanAbortRef.current?.abort()
                  const abortController = new AbortController()
                  scanAbortRef.current = abortController
                  setForm((current) => ({ ...current, evidence: file }))
                  runAutomaticOcr({
                    file,
                    setUploadState,
                    analyze: onAnalyze,
                    signal: abortController.signal,
                    apply: (analyzed) =>
                      setForm((current) => ({
                        ...current,
                        ...removeEmptyValues(analyzed),
                        evidence: file,
                      })),
                    onFinish: () => {
                      if (scanAbortRef.current === abortController) scanAbortRef.current = null
                    },
                  })
                }}
                onRemove={() => {
                  scanAbortRef.current?.abort()
                  scanAbortRef.current = null
                  setForm((current) => ({ ...current, evidence: null }))
                  setUploadState(idleScanState)
                }}
                onCancelScan={cancelScan}
              />
            )}

            <div className="flex flex-col gap-4 rounded-xl bg-muted/30 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="voucher-amount">Monto</FieldLabel>
                  <MoneyNumberField
                    id="voucher-amount"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onValueChange={(amount) => setForm((current) => ({ ...current, amount }))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="voucher-operation">Operación</FieldLabel>
                  <Input
                    id="voucher-operation"
                    size="lg"
                    value={form.operationId}
                    onChange={(event) => setForm((current) => ({ ...current, operationId: event.target.value }))}
                    placeholder="Código bancario"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Fecha de operación</FieldLabel>
                  <DatePicker
                    value={form.operationDate}
                    onChange={(operationDate) => setForm((current) => ({ ...current, operationDate }))}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="voucher-observation">Observación</FieldLabel>
                <Textarea
                  id="voucher-observation"
                  value={form.observation}
                  onChange={(event) => setForm((current) => ({ ...current, observation: event.target.value }))}
                  placeholder="Comentario opcional para revisión"
                />
              </Field>
            </div>
          </DrawerPanel>
          <DrawerFooter variant="bare">
            <DrawerClose render={<Button variant="outline" />}>
              Cancelar
            </DrawerClose>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <Spinner /> : <UploadIcon data-icon="inline-start" />}
              {editing ? "Guardar voucher" : "Enviar voucher"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  )
}

export function ProcessVoucherDialog({
  open,
  voucher,
  mode,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  voucher: PaymentVoucher | null
  mode: "approve" | "reject"
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (form: ProcessFormState) => void
}) {
  const [observation, setObservation] = useState("")
  const isMobile = useIsMobile()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({ action: mode, observation })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"} nested>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 520, minWidth: 420, maxWidth: 720 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{mode === "approve" ? "Aprobar voucher" : "Rechazar voucher"}</DrawerTitle>
          <DrawerDescription>
            {voucher?.operationId ? `Operación ${voucher.operationId}` : "La decisión quedará registrada en auditoría."}
          </DrawerDescription>
        </DrawerHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1">
            <DrawerPanel>
              <Field>
                <FieldLabel htmlFor="process-observation">Observación</FieldLabel>
                <Textarea
                  id="process-observation"
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                  placeholder={mode === "approve" ? "Comentario opcional" : "Motivo del rechazo"}
                />
              </Field>
            </DrawerPanel>
          </div>
          <DrawerFooter variant="bare" className="shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant={mode === "reject" ? "destructive" : "default"} disabled={submitting}>
              {submitting ? <Spinner /> : mode === "approve" ? <CheckIcon data-icon="inline-start" /> : <XIcon data-icon="inline-start" />}
              {mode === "approve" ? "Aprobar" : "Rechazar"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  )
}

export function DeleteWorkflowDialog({
  open,
  title,
  description,
  submitting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const isMobile = useIsMobile()
  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"} nested>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 480, minWidth: 380, maxWidth: 640 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1" />
        <DrawerFooter variant="bare" className="shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={submitting} onClick={onConfirm}>
            {submitting ? <Spinner /> : <Trash2Icon data-icon="inline-start" />}
            Eliminar
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

export function EvidenceButton({ url }: { url?: string | null }) {
  if (!url) return <span className="text-muted-foreground">-</span>

  return (
    <PhotoProvider>
      <PhotoView src={url}>
        <Button type="button" variant="link" size="sm">
          <EyeIcon data-icon="inline-start" />
          Visualizar
        </Button>
      </PhotoView>
    </PhotoProvider>
  )
}

function getPaymentDefaults(payment?: Payment | null): PaymentFormState {
  return {
    amount: payment?.amount ? String(payment.amount) : "",
    paymentDate: payment ? toInputDate(payment.paymentDate) : formatInputDate(new Date()),
    method: (payment?.method as PaymentMethod) || "cash",
    reference: payment?.reference ?? "",
    observation: payment?.observation ?? "",
    evidence: null,
  }
}

function getVoucherDefaults(voucher?: PaymentVoucher | null): VoucherFormState {
  return {
    amount: voucher?.amount ? String(voucher.amount) : "",
    operationId: voucher?.operationId ?? "",
    operationDate: toInputDate(voucher?.operationDate),
    observation: voucher?.observation ?? "",
    evidence: null,
  }
}

function MoneyNumberField({
  id,
  value,
  min,
  step,
  onValueChange,
}: {
  id: string
  value: string
  min?: string
  step?: string
  onValueChange: (value: string) => void
}) {
  const numericValue = parseNumberFieldValue(value)

  return (
    <NumberField
      id={id}
      min={value.trim() ? (min ? Number(min) : undefined) : undefined}
      size="lg"
      step={step ? Number(step) : undefined}
      value={numericValue}
      onValueChange={(nextValue) => onValueChange(formatNumberFieldValue(nextValue))}
    >
      <NumberFieldGroup>
        <NumberFieldDecrement aria-label="Reducir monto" />
        <NumberFieldInput className="w-full px-1 text-center" placeholder="Monto" />
        <NumberFieldIncrement aria-label="Aumentar monto" />
      </NumberFieldGroup>
    </NumberField>
  )
}

function LoadingInputShell() {
  return (
    <div className="flex h-10 w-full items-center rounded-lg border bg-background px-3 shadow-xs/5 sm:h-9">
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

function DatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedDate = value ? parseInputDate(value) ?? undefined : undefined
  const selectToday = () => {
    onChange(formatInputDate(new Date()))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" size="lg" className="w-full justify-start font-normal" />}>
        <CalendarIcon data-icon="inline-start" />
        {selectedDate
          ? new Intl.DateTimeFormat("es-PE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(selectedDate)
          : "Selecciona fecha"}
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto flex-col gap-2 p-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return
            onChange(formatInputDate(date))
            setOpen(false)
          }}
        />
        <Separator className="my-1" />
        <Button type="button" variant="ghost" size="sm" className="w-full justify-center" onClick={selectToday}>
          <CalendarIcon data-icon="inline-start" />
          Hoy
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function ImageDropzone({
  file,
  uploadState,
  onFileSelected,
  onRemove,
  onCancelScan,
}: {
  file: File | null
  uploadState: FileUploadState
  onFileSelected: (file: File) => void
  onRemove: () => void
  onCancelScan: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [localStatus, setLocalStatus] = useState<FileUploadState | null>(null)
  const visibleUploadState = localStatus ?? uploadState

  const pickFile = async (selectedFile?: File | null) => {
    if (!selectedFile) return
    if (!selectedFile.type.startsWith("image/")) {
      setLocalStatus({
        mode: "scan",
        phase: "error",
        progress: 100,
        message: "Selecciona una imagen en JPG, PNG o WebP.",
      })
      return
    }

    setLocalStatus({ mode: "scan", phase: "processing", progress: 15, message: "Optimizando imagen" })
    try {
      const optimizedFile = await optimizeEvidenceImage(selectedFile)
      setLocalStatus(null)
      onFileSelected(optimizedFile)
      if (inputRef.current) inputRef.current.value = ""
    } catch (error) {
      setLocalStatus({
        mode: "scan",
        phase: "error",
        progress: 100,
        message: error instanceof Error ? error.message : "No se pudo optimizar la imagen.",
      })
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    void pickFile(event.dataTransfer.files?.[0])
  }

  return (
    <div
      className="flex flex-col gap-3"
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "relative overflow-hidden transition-colors duration-200 rounded-xl p-3",
          !file && "hover:bg-background/40",
          dragging && "bg-primary/10",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {file ? (
            <motion.div
              key="image-preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.75fr)]"
            >
              <ImagePreview key={`${file.name}-${file.size}-${file.lastModified}`} file={file} />
              <div className="flex min-w-0 flex-col justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-col sm:flex-nowrap">
                  <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} className="flex-1 sm:flex-none">
                    <UploadIcon data-icon="inline-start" />
                    Cambiar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="flex-1 text-muted-foreground hover:text-destructive sm:flex-none">
                    <Trash2Icon data-icon="inline-start" />
                    Quitar
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="empty-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              type="button"
              className="block w-full text-center outline-none"
              onClick={() => inputRef.current?.click()}
            >
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia>
                    <FileImageIcon />
                  </EmptyMedia>
                  <EmptyTitle>Toca para subir o tomar foto</EmptyTitle>
                  <EmptyDescription>O arrastra un voucher en JPG, PNG o WebP</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </motion.button>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {visibleUploadState.phase !== "idle" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex w-full flex-col gap-2 pt-2">
                <div className="flex min-h-5 items-center justify-between gap-3 px-1 text-xs">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={visibleUploadState.phase + (visibleUploadState.message ?? "")}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className={cn("flex items-center gap-2 truncate font-medium", visibleUploadState.phase === "error" ? "text-destructive" : "text-muted-foreground")}
                    >
                      {visibleUploadState.phase === "processing" && <Spinner className="size-3.5" />}
                      <span className="truncate">{getUploadStatusLabel(visibleUploadState)}</span>
                    </motion.span>
                  </AnimatePresence>
                  <AnimatePresence>
                    {(visibleUploadState.phase === "uploading" || visibleUploadState.phase === "processing") && (
                      <motion.div
                        key="progress-number"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className="shrink-0 tabular-nums text-muted-foreground"
                      >
                        <AnimatedNumber
                          key={`${file?.name}-${file?.lastModified}`}
                          value={visibleUploadState.progress}
                          suffix="%"
                          duration={0.3}
                          animateOnMount={true}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {visibleUploadState.mode === "scan" &&
                      (visibleUploadState.phase === "uploading" || visibleUploadState.phase === "processing") &&
                      !localStatus && (
                      <motion.button
                        key="cancel-button"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        type="button"
                        className="shrink-0 text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); onCancelScan(); }}
                      >
                        Cancelar
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                <Progress className="h-1.5 w-full" value={visibleUploadState.progress} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <input
        ref={inputRef}
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        type="file"
        onChange={(event) => void pickFile(event.target.files?.[0])}
      />
    </div>
  )
}

function EvidenceSection({
  title,
  file,
  uploadState,
  onFileSelected,
  onRemove,
  onCancelScan,
}: {
  title: string
  file: File | null
  uploadState: FileUploadState
  onFileSelected: (file: File) => void
  onRemove: () => void
  onCancelScan: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ImageDropzone
        file={file}
        uploadState={uploadState}
        onFileSelected={onFileSelected}
        onRemove={onRemove}
        onCancelScan={onCancelScan}
      />
    </div>
  )
}

function ImagePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState("")

  useEffect(() => {
    let active = true
    const reader = new FileReader()
    reader.onload = () => {
      if (active && typeof reader.result === "string") setPreviewUrl(reader.result)
    }
    reader.readAsDataURL(file)

    return () => {
      active = false
    }
  }, [file])

  if (!previewUrl) {
    return <LoadingImagePreview />
  }

  return (
    <PhotoProvider>
      <PhotoView src={previewUrl}>
        <button
          type="button"
          className="group relative flex aspect-video min-h-40 w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xl border-4 border-muted/30 bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Ver imagen en pantalla completa"
        >
          <img src={previewUrl} alt="Vista previa del voucher" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </button>
      </PhotoView>
    </PhotoProvider>
  )
}

function LoadingImagePreview() {
  return (
    <div className="flex aspect-video min-h-40 w-full items-center justify-center overflow-hidden rounded-xl border-4 border-muted/30 bg-muted/30">
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  )
}

function runAutomaticOcr<T extends object>({
  file,
  setUploadState,
  analyze,
  signal,
  apply,
  onFinish,
}: {
  file: File
  setUploadState: Dispatch<SetStateAction<FileUploadState>>
  analyze: (file: File, onUploadProgress: (progress: number) => void, signal?: AbortSignal) => Promise<T>
  signal: AbortSignal
  apply: (values: T) => void
  onFinish: () => void
}) {
  void (async () => {
    try {
      setUploadState({ mode: "scan", phase: "uploading", progress: 0 })
      const analyzed = await analyze(file, (progress) => {
        const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)))
        setUploadState({
          mode: "scan",
          phase: normalizedProgress >= 100 ? "processing" : "uploading",
          progress: normalizedProgress,
        })
      }, signal)
      if (signal.aborted) return
      apply(analyzed)
      setUploadState({ mode: "scan", phase: "done", progress: 100 })
    } catch {
      if (!signal.aborted) setUploadState({ mode: "scan", phase: "error", progress: 100 })
    } finally {
      onFinish()
    }
  })()
}

function getUploadStatusLabel(uploadState: FileUploadState) {
  if (uploadState.message) return uploadState.message
  if (uploadState.phase === "idle") return "Esperando comprobante"

  if (uploadState.mode === "submit") {
    if (uploadState.phase === "uploading") return "Subiendo evidencia"
    if (uploadState.phase === "processing") return "Procesando registro"
    if (uploadState.phase === "error") return "No se pudo subir la evidencia"
    return "Evidencia enviada"
  }

  if (uploadState.phase === "uploading") return "Cargando imagen"
  if (uploadState.phase === "processing") return "Procesando imagen"
  if (uploadState.phase === "error") return "Escaneo de imagen erróneo"
  return "Imagen escaneada con éxito"
}

async function optimizeEvidenceImage(file: File) {
  if (file.size <= maxEvidenceFileSize && file.type === evidenceCompressionMimeType) return file

  const bitmap = await createImageBitmap(file)
  try {
    const maxSide = 1800
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) throw new Error("No se pudo preparar la imagen.")
    context.drawImage(bitmap, 0, 0, width, height)

    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      const blob = await canvasToBlob(canvas, evidenceCompressionMimeType, quality)
      if (blob.size <= maxEvidenceFileSize) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "voucher"
        return new File([blob], `${baseName}.webp`, {
          type: evidenceCompressionMimeType,
          lastModified: Date.now(),
        })
      }
    }
  } finally {
    bitmap.close()
  }

  throw new Error("La imagen supera 1.5 MB incluso después de optimizarla.")
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("No se pudo convertir la imagen."))
    }, type, quality)
  })
}

function removeEmptyValues<T extends object>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Partial<T>
}

function parseNumberFieldValue(value: string) {
  if (value.trim() === "") return null

  const numericValue = Number.parseFloat(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function formatNumberFieldValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return ""
  return String(value)
}

function toInputDate(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return formatInputDate(date)
}

export function toIsoOrUndefined(value: string) {
  if (!value) return undefined
  const date = parseInputDate(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value)
  if (Number.isNaN(date.getTime())) return new Date(Number.NaN)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Partial<T>
}
