import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react"
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTableCard, DataTableColumnHeader } from "@/components/data-table-card"
import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
} from "@/components/ui/autocomplete"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatPreciseCurrencyWithSymbol, personName, publicUserCode, toNumber } from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { LoanFormState } from "@/features/loans/loan-form"
import type { RelatedUser } from "@/types/loans"

const frequencyItems = [
  { value: "monthly", label: "Mensual" },
  { value: "biweekly", label: "Quincenal" },
  { value: "weekly", label: "Semanal" },
  { value: "daily", label: "Diario" },
]

const installmentUnitLabels: Record<string, string> = {
  daily: "días",
  weekly: "semanas",
  biweekly: "quincenas",
  monthly: "meses",
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  client: "Cliente",
  investor: "Inversionista",
}

type SchedulePreviewRow = {
  installmentNumber: number
  dueDate: Date
  amount: number
}

const schedulePreviewColumns: ColumnDef<SchedulePreviewRow>[] = [
  {
    id: "installmentNumber",
    accessorFn: (row) => row.installmentNumber,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cuota" />,
    cell: ({ row }) => row.original.installmentNumber,
  },
  {
    id: "dueDate",
    accessorFn: (row) => row.dueDate.getTime(),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimiento" />,
    cell: ({ row }) => formatScheduleDate(row.original.dueDate),
  },
  {
    id: "amount",
    accessorFn: (row) => row.amount,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Importe" align="right" />
    ),
    cell: ({ row }) => formatPreciseCurrencyWithSymbol(row.original.amount),
    meta: {
      headerClassName: "text-right",
      cellClassName: "text-right font-medium",
    },
  },
]

export function CreateLoanDialog({
  open,
  form,
  clients,
  investors,
  creating,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean
  form: LoanFormState
  clients: RelatedUser[]
  investors: RelatedUser[]
  creating: boolean
  onOpenChange: (open: boolean) => void
  onFormChange: Dispatch<SetStateAction<LoanFormState>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const [previewOpen, setPreviewOpen] = useState(true)
  const schedulePreview = useMemo(() => createSchedulePreview(form), [form])
  const update = (key: keyof LoanFormState, value: string) => {
    onFormChange((current) => ({ ...current, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Nuevo préstamo</DialogTitle>
          <DialogDescription>
            Registra las condiciones financieras y deja la solicitud lista para revisión.
          </DialogDescription>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="min-h-0 flex-1">
          <DialogPanel className="flex flex-col gap-5">
            <Fieldset className="flex flex-col gap-3">
              <FieldsetLegend>Cliente e inversionista</FieldsetLegend>
              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="loan-client">Cliente</FieldLabel>
                  {clients.length > 0 ? (
                    <UserSearchSelect
                      id="loan-client"
                      placeholder="Selecciona cliente"
                      users={clients}
                      value={form.clientId}
                      onValueChange={(value) => update("clientId", value)}
                    />
                  ) : (
                    <Input id="loan-client" value={form.clientId} onChange={(event) => update("clientId", event.target.value)} placeholder="Selecciona cliente" />
                  )}
                  <FieldDescription>Requerido por el contrato del préstamo.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="loan-investor">Inversionista</FieldLabel>
                  {investors.length > 0 ? (
                    <UserSearchSelect
                      id="loan-investor"
                      placeholder="Opcional"
                      users={investors}
                      value={form.investorId}
                      onValueChange={(value) => update("investorId", value)}
                      allowClear
                    />
                  ) : (
                    <Input id="loan-investor" value={form.investorId} onChange={(event) => update("investorId", event.target.value)} placeholder="Selecciona inversionista" />
                  )}
                </Field>
              </div>
            </Fieldset>

            <Separator />

            <Fieldset className="flex flex-col gap-3">
              <FieldsetLegend>Condiciones financieras</FieldsetLegend>
              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="loan-principal">Principal</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>S/</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput id="loan-principal" type="number" min="1" step="0.01" value={form.principal} onChange={(event) => update("principal", event.target.value)} />
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="loan-rate">Tasa</FieldLabel>
                  <InputGroup>
                    <InputGroupInput id="loan-rate" type="number" min="0" step="0.01" value={form.interestRate} onChange={(event) => update("interestRate", event.target.value)} />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>Se usa una tasa única para calcular la cuota fija.</FieldDescription>
                </Field>
              </div>
            </Fieldset>

            <Fieldset className="flex flex-col gap-3">
              <FieldsetLegend>Cronograma</FieldsetLegend>
              <div className="grid gap-3 md:grid-cols-3">
                <Field>
                  <FieldLabel>Frecuencia</FieldLabel>
                  <Select items={frequencyItems} value={form.frequency} onValueChange={(value) => update("frequency", value ?? "monthly")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {frequencyItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="loan-installments">Plazo</FieldLabel>
                  <InputGroup>
                    <InputGroupInput id="loan-installments" type="number" min="1" max="120" value={form.installmentsCount} onChange={(event) => update("installmentsCount", event.target.value)} />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>{installmentUnitLabels[form.frequency] ?? "cuotas"}</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="loan-start-date">Fecha de inicio</FieldLabel>
                  <DatePicker value={form.startDate} onChange={(value) => update("startDate", value)} />
                  <FieldDescription>El día base del cronograma se toma de esta fecha.</FieldDescription>
                </Field>
              </div>
            </Fieldset>

            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
              <Fieldset className="flex flex-col gap-3">
                <SectionHeader
                  open={previewOpen}
                  title="Preview de cuotas"
                  summary={`${formatPreciseCurrencyWithSymbol(schedulePreview.totalDebt)} total`}
                />
                <CollapsiblePanel>
                  <SchedulePreview preview={schedulePreview} />
                </CollapsiblePanel>
              </Fieldset>
            </Collapsible>

            <Field>
              <FieldLabel htmlFor="loan-observation">Observación</FieldLabel>
              <Textarea id="loan-observation" value={form.observation} onChange={(event) => update("observation", event.target.value)} placeholder="Notas internas para revisión..." />
            </Field>
          </DialogPanel>
          </div>
          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? <Spinner /> : <PlusIcon data-icon="inline-start" />}
              Crear préstamo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SectionHeader({
  open,
  title,
  summary,
}: {
  open: boolean
  title: string
  summary: string
}) {
  return (
    <FieldsetLegend className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="block">{title}</span>
        <p className="truncate text-sm text-muted-foreground">{summary}</p>
      </div>
      <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        {open ? "Ocultar" : "Mostrar"}
        <ChevronDownIcon data-icon="inline-end" className={cn("transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
    </FieldsetLegend>
  )
}

function SchedulePreview({
  preview,
}: {
  preview: ReturnType<typeof createSchedulePreview>
}) {
  if (!preview.rows.length) {
    return (
      <div className="mt-3 rounded-md border bg-muted/32 p-4 text-sm text-muted-foreground">
        Completa monto, plazo y fecha de inicio para ver las cuotas.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <PreviewMetric label="Deuda total" value={formatPreciseCurrencyWithSymbol(preview.totalDebt)} />
        <PreviewMetric label="Cuota" value={formatPreciseCurrencyWithSymbol(preview.amountPerInstallment)} />
        <PreviewMetric label="Vencimientos" value={`${preview.rows.length} cuotas`} />
      </div>
      <DataTableCard
        columns={schedulePreviewColumns}
        data={preview.rows}
        getRowId={(row) => String(row.installmentNumber)}
        tableClassName="min-w-[420px]"
        className="max-h-72 overflow-auto"
      />
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/32 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  )
}

function UserSearchSelect({
  id,
  users,
  value,
  placeholder,
  allowClear = false,
  onValueChange,
}: {
  id: string
  users: RelatedUser[]
  value: string
  placeholder: string
  allowClear?: boolean
  onValueChange: (value: string) => void
}) {
  const [query, setQuery] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const selectedUser = users.find((user) => user.id === value)
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return users

    return users.filter((user) =>
      [personName(user), user.email, user.publicCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [query, users])

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <Autocomplete>
        <AutocompleteInput
          className="w-full"
          id={id}
          value={query || (selectedUser ? personName(selectedUser) : "")}
          onChange={(event) => {
            const nextQuery = event.target.value
            setQuery(nextQuery)
            if (selectedUser && nextQuery !== personName(selectedUser)) {
              onValueChange("")
              setDetailsOpen(false)
            }
          }}
          placeholder={placeholder}
          showClear={allowClear && Boolean(value)}
          startAddon={<SearchIcon />}
          clearProps={{
            onClick: () => {
              onValueChange("")
              setQuery("")
              setDetailsOpen(false)
            },
          }}
        />
        <AutocompletePopup className="w-[var(--anchor-width)]">
          <AutocompleteList>
            {allowClear && value && (
              <AutocompleteItem
                onClick={() => {
                  onValueChange("")
                  setQuery("")
                  setDetailsOpen(false)
                }}
              >
                Sin inversionista
              </AutocompleteItem>
            )}
            {filteredUsers.map((user) => (
              <AutocompleteItem
                className="w-full min-w-0"
                key={user.id}
                onClick={() => {
                  onValueChange(user.id)
                  setQuery(personName(user))
                  setDetailsOpen(false)
                }}
              >
                <CheckIcon className={cn("mr-2 opacity-0", user.id === value && "opacity-100")} />
                <UserOption user={user} />
              </AutocompleteItem>
            ))}
            {filteredUsers.length === 0 && <AutocompleteEmpty>No hay coincidencias.</AutocompleteEmpty>}
          </AutocompleteList>
        </AutocompletePopup>
      </Autocomplete>
      {selectedUser && (
        <SelectedUserDetails
          open={detailsOpen}
          user={selectedUser}
          onOpenChange={setDetailsOpen}
        />
      )}
    </div>
  )
}

function UserOption({ user }: { user: RelatedUser }) {
  return (
    <span className="flex w-full min-w-0 items-center gap-2">
      <UserAvatar user={user} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{personName(user)}</span>
        <span className="block truncate text-xs text-muted-foreground">{publicUserCode(user)}</span>
      </span>
    </span>
  )
}

function SelectedUserDetails({
  open,
  user,
  onOpenChange,
}: {
  open: boolean
  user: RelatedUser
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-md border bg-muted/24">
      <div className="flex min-w-0 items-center gap-3 p-3">
        <UserAvatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate font-medium">{personName(user)}</p>
            {user.role && <Badge variant="outline">{roleLabels[user.role] ?? user.role}</Badge>}
          </div>
          <p className="truncate text-xs text-muted-foreground">{publicUserCode(user)}</p>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <CollapsibleTrigger
                render={
                  <Button
                    aria-label={open ? "Ocultar datos del usuario" : "Mostrar datos del usuario"}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  />
                }
              />
            }
          >
            <ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} />
          </TooltipTrigger>
          <TooltipContent>{open ? "Ocultar datos" : "Ver datos"}</TooltipContent>
        </Tooltip>
      </div>
      <CollapsiblePanel>
        <div className="grid gap-2 border-t p-3 text-sm sm:grid-cols-2">
          <UserDetailItem label="Correo" value={user.email ?? "Sin correo"} />
          <UserDetailItem label="Teléfono" value={user.phone ?? "Sin teléfono"} />
          <UserDetailItem className="sm:col-span-2" label="Código" value={publicUserCode(user)} />
        </div>
      </CollapsiblePanel>
    </Collapsible>
  )
}

function UserDetailItem({
  className,
  label,
  value,
}: {
  className?: string
  label: string
  value: string
}) {
  return (
    <div className={cn("min-w-0 rounded-md bg-background px-3 py-2", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  )
}

function UserAvatar({
  user,
  size = "default",
}: {
  user: RelatedUser
  size?: "default" | "lg"
}) {
  const avatarUrl = user.avatarUrl ?? user.avatar

  return (
    <Avatar className={cn(size === "lg" && "size-10")}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={personName(user)} />}
      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
    </Avatar>
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" className="w-full justify-start font-normal" />}>
        <CalendarIcon data-icon="inline-start" />
        {selectedDate
          ? new Intl.DateTimeFormat("es-PE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(selectedDate)
          : "Selecciona fecha"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return
            onChange(formatInputDate(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function createSchedulePreview(form: LoanFormState) {
  const principal = toNumber(form.principal)
  const interestRate = toNumber(form.interestRate)
  const installmentsCount = Number.parseInt(form.installmentsCount, 10)
  const startDate = parseInputDate(form.startDate)

  if (!startDate || principal <= 0 || !Number.isInteger(installmentsCount) || installmentsCount < 1) {
    return {
      amountPerInstallment: 0,
      rows: [] as SchedulePreviewRow[],
      totalDebt: 0,
    }
  }

  const safeInstallmentsCount = Math.min(installmentsCount, 120)
  const amountPerInstallment = calculateFixedInstallment(
    principal,
    interestRate,
    safeInstallmentsCount,
  )
  const roundedAmountPerInstallment = roundMoney(amountPerInstallment)
  const roundedTotalDebt = roundMoney(amountPerInstallment * safeInstallmentsCount)
  let accumulatedAmount = 0

  return {
    amountPerInstallment: roundedAmountPerInstallment,
    rows: Array.from({ length: safeInstallmentsCount }, (_, index) => {
      const installmentNumber = index + 1
      const isLastInstallment = installmentNumber === safeInstallmentsCount
      const amount = isLastInstallment
        ? roundMoney(roundedTotalDebt - accumulatedAmount)
        : roundedAmountPerInstallment

      accumulatedAmount = roundMoney(accumulatedAmount + amount)

      return {
        installmentNumber,
        dueDate: calculateDueDate(startDate, installmentNumber, form.frequency),
        amount,
      }
    }),
    totalDebt: roundedTotalDebt,
  }
}

function calculateFixedInstallment(
  principal: number,
  rate: number,
  count: number,
) {
  if (count <= 0) {
    return 0
  }

  const decimalRate = rate / 100

  if (decimalRate === 0) {
    return principal / count
  }

  return (principal * decimalRate) / (1 - Math.pow(1 + decimalRate, -count))
}

function calculateDueDate(startDate: Date, installmentNumber: number, frequency: string) {
  const normalizedStartDate = startOfLocalDay(startDate)

  switch (frequency) {
    case "monthly":
      return calculateMonthlyDueDate(normalizedStartDate, installmentNumber)
    case "biweekly":
      return addDays(normalizedStartDate, 15 * installmentNumber)
    case "weekly":
      return addDays(normalizedStartDate, 7 * installmentNumber)
    case "daily":
      return addDays(normalizedStartDate, installmentNumber + 1)
    default:
      return calculateMonthlyDueDate(normalizedStartDate, installmentNumber)
  }
}

function calculateMonthlyDueDate(startDate: Date, installmentNumber: number) {
  const originalDay = startDate.getDate()
  const targetMonth = new Date(startDate)
  targetMonth.setDate(1)
  targetMonth.setMonth(startDate.getMonth() + installmentNumber)

  const maxDayOfTargetMonth = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
  ).getDate()

  targetMonth.setDate(Math.min(originalDay, maxDayOfTargetMonth))
  return startOfLocalDay(targetMonth)
}

function parseInputDate(value: string) {
  if (!value) return null

  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null

  return startOfLocalDay(date)
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return startOfLocalDay(nextDate)
}

function startOfLocalDay(date: Date) {
  const normalizedDate = new Date(date)
  normalizedDate.setHours(0, 0, 0, 0)
  return normalizedDate
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function formatScheduleDate(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getUserInitials(user: RelatedUser) {
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((name) => name?.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return initials || personName(user).charAt(0).toUpperCase()
}
