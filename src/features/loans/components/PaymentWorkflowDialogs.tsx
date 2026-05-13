import { useEffect, useRef, useState, type Dispatch, type DragEvent, type FormEvent, type SetStateAction } from "react"
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

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  Payment,
  PaymentMethod,
  PaymentVoucher,
} from "@/types/loans"

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
}

const idleScanState: FileUploadState = { mode: "scan", progress: 0, phase: "idle" }

export function PaymentDialog({
  open,
  payment,
  submitting,
  onOpenChange,
  onAnalyze,
  onSubmit,
}: {
  open: boolean
  payment?: Payment | null
  submitting: boolean
  analyzing: boolean
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
  const editing = Boolean(payment)

  const imageBusy = uploadState.phase === "uploading" || uploadState.phase === "processing"
  const scanBusy = imageBusy && uploadState.mode === "scan"
  const valid = Number(form.amount) > 0
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar pago" : "Registrar pago"}</DialogTitle>
          <DialogDescription>
            El backend aplicará el monto al cronograma y recalculará el préstamo.
          </DialogDescription>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogPanel className="flex flex-col gap-4">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="payment-amount">Monto</FieldLabel>
                <MoneyNumberField
                  id="payment-amount"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onValueChange={(amount) => setForm((current) => ({ ...current, amount }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="payment-reference">Referencia</FieldLabel>
                <Input
                  id="payment-reference"
                  value={form.reference}
                  onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                  placeholder="Nro. operación"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Fecha de pago</FieldLabel>
                <DatePicker
                  value={form.paymentDate}
                  onChange={(paymentDate) => setForm((current) => ({ ...current, paymentDate }))}
                />
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
                  <SelectTrigger>
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
                placeholder="Detalle administrativo opcional"
              />
            </Field>
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <Spinner /> : <ReceiptTextIcon data-icon="inline-start" />}
              {editing ? "Guardar pago" : "Registrar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar voucher" : "Subir voucher"}</DialogTitle>
          <DialogDescription>
            Confirma los datos del comprobante antes de enviarlo a revisión.
          </DialogDescription>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogPanel className="flex flex-col gap-4">
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

            <div className="grid gap-3 sm:grid-cols-2">
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
                  value={form.operationId}
                  onChange={(event) => setForm((current) => ({ ...current, operationId: event.target.value }))}
                  placeholder="Código bancario"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <Spinner /> : <UploadIcon data-icon="inline-start" />}
              {editing ? "Guardar voucher" : "Enviar voucher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({ action: mode, observation })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "approve" ? "Aprobar voucher" : "Rechazar voucher"}</DialogTitle>
          <DialogDescription>
            {voucher?.operationId ? `Operación ${voucher.operationId}` : "La decisión quedará registrada en auditoría."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogPanel>
            <Field>
              <FieldLabel htmlFor="process-observation">Observación</FieldLabel>
              <Textarea
                id="process-observation"
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                placeholder={mode === "approve" ? "Comentario opcional" : "Motivo del rechazo"}
              />
            </Field>
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant={mode === "reject" ? "destructive" : "default"} disabled={submitting}>
              {submitting ? <Spinner /> : mode === "approve" ? <CheckIcon data-icon="inline-start" /> : <XIcon data-icon="inline-start" />}
              {mode === "approve" ? "Aprobar" : "Rechazar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={submitting} onClick={onConfirm}>
            {submitting ? <Spinner /> : <Trash2Icon data-icon="inline-start" />}
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function EvidenceButton({ url }: { url?: string | null }) {
  if (!url) return <span className="text-muted-foreground">-</span>

  return (
    <Button variant="link" size="sm" render={<a href={url} target="_blank" rel="noreferrer" />}>
      <EyeIcon data-icon="inline-start" />
      Abrir
    </Button>
  )
}

function getPaymentDefaults(payment?: Payment | null): PaymentFormState {
  return {
    amount: payment?.amount ? String(payment.amount) : "",
    paymentDate: toInputDate(payment?.paymentDate),
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
      size="sm"
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
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={selectToday}>
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

  const pickFile = (selectedFile?: File | null) => {
    if (!selectedFile) return
    if (!selectedFile.type.startsWith("image/")) return
    onFileSelected(selectedFile)
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    pickFile(event.dataTransfer.files?.[0])
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
          "rounded-lg border border-dashed bg-muted/16 p-3 transition-colors",
          !file && "hover:bg-muted/28",
          dragging && "border-primary bg-primary/5",
        )}
      >
        {file ? (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
            <ImagePreview key={`${file.name}-${file.size}-${file.lastModified}`} file={file} />
            <div className="flex min-w-0 flex-col justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                  <UploadIcon data-icon="inline-start" />
                  Cambiar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
                  <Trash2Icon data-icon="inline-start" />
                  Quitar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="block w-full text-left"
            onClick={() => inputRef.current?.click()}
          >
            <Empty className="min-h-32 flex-none px-3 py-4 md:py-4">
              <EmptyMedia className="mb-0" variant="icon">
                <FileImageIcon />
              </EmptyMedia>
              <div className="min-w-0">
                <EmptyTitle className="text-base">Sube una imagen</EmptyTitle>
                <EmptyDescription>Haz clic o arrastra un voucher en JPG, PNG o WebP.</EmptyDescription>
              </div>
            </Empty>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        type="file"
        onChange={(event) => pickFile(event.target.files?.[0])}
      />
      {uploadState.phase !== "idle" && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
          {uploadState.phase === "processing" && <Spinner />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className={cn("truncate font-medium", uploadState.phase === "error" && "text-destructive")}>
                {getUploadStatusLabel(uploadState)}
              </span>
              {uploadState.phase === "uploading" && (
                <span className="shrink-0 text-muted-foreground tabular-nums">{uploadState.progress}%</span>
              )}
            </div>
            {(uploadState.phase === "uploading" || uploadState.phase === "processing") && (
              <Progress className="mt-1 gap-1" value={uploadState.progress} />
            )}
          </div>
          {uploadState.mode === "scan" && (uploadState.phase === "uploading" || uploadState.phase === "processing") && (
            <Button type="button" variant="ghost" size="xs" onClick={onCancelScan}>
              Cancelar
            </Button>
          )}
        </div>
      )}
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
    <Fieldset className="flex flex-col gap-3">
      <FieldsetLegend>{title}</FieldsetLegend>
      <ImageDropzone
        file={file}
        uploadState={uploadState}
        onFileSelected={onFileSelected}
        onRemove={onRemove}
        onCancelScan={onCancelScan}
      />
    </Fieldset>
  )
}

function ImagePreview({ file }: { file: File }) {
  const [previewUrl] = useState(() => URL.createObjectURL(file))

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  return (
    <div className="flex aspect-[4/3] min-h-32 items-center justify-center overflow-hidden rounded-md border bg-background">
      <img src={previewUrl} alt="Vista previa del voucher" className="h-full w-full object-contain" />
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
