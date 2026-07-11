import { motion } from "framer-motion"
import {
  CalendarIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  PlusIcon,
  SearchIcon,
  UserRoundIcon,
} from "lucide-react"
import { useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox"
import {
  Drawer,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, selectTriggerVariants } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { LoanFormState } from "@/features/loans/loan-form"
import { formatPreciseCurrencyWithSymbol, personName, publicUserCode, toNumber } from "@/features/loans/loan-utils"
import { useIsMobile } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import type { RelatedUser } from "@/types/loans"
import { SectionBlock } from "@/features/loans/components/SectionBlock"

const frequencyItems = [
  { value: "monthly", label: "Mensual" },
  { value: "biweekly", label: "Quincenal" },
  { value: "weekly", label: "Semanal" },
  { value: "daily", label: "Diario" },
]

const installmentPeriodLabels: Record<string, { singular: string; plural: string }> = {
  daily: { singular: "día", plural: "días" },
  weekly: { singular: "semana", plural: "semanas" },
  biweekly: { singular: "quincena", plural: "quincenas" },
  monthly: { singular: "mes", plural: "meses" },
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  client: "Cliente",
  investor: "Inversionista",
}

type SchedulePreviewRow = {
  amortizedPrincipal: number
  installmentNumber: number
  interestAmount: number
  dueDate: Date
  amount: number
  remainingPrincipal: number
}

export function CreateLoanDialog({
  open,
  form,
  clients,
  investors,
  creating,
  loadingUsers = false,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean
  form: LoanFormState
  clients: RelatedUser[]
  investors: RelatedUser[]
  creating: boolean
  loadingUsers?: boolean
  onOpenChange: (open: boolean) => void
  onFormChange: Dispatch<SetStateAction<LoanFormState>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const schedulePreview = useMemo(() => createSchedulePreview(form), [form])
  const update = (key: keyof LoanFormState, value: string) => {
    onFormChange((current) => ({ ...current, [key]: value }))
  }
  const isMobile = useIsMobile()
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setPreviewOpen(false)
    onOpenChange(nextOpen)
  }

  const isFormValid = useMemo(() => {
    const principal = toNumber(form.principal)
    const interestRate = toNumber(form.interestRate)
    const installmentsCount = Number.parseInt(form.installmentsCount, 10)
    return Boolean(
      form.clientId &&
      form.startDate &&
      Number.isFinite(principal) && principal > 0 &&
      Number.isFinite(interestRate) && interestRate > 0 &&
      Number.isInteger(installmentsCount) && installmentsCount > 0
    )
  }, [form])

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 860, minWidth: 620 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>Nuevo préstamo</DrawerTitle>
          <p className="text-sm text-muted-foreground">Completa los datos para registrar un nuevo préstamo</p>
        </DrawerHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="min-h-0 flex-1">
            <DrawerPanel className="flex flex-col gap-4">
              <motion.div
                variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
                initial="initial"
                animate="animate"
                className="flex flex-col gap-4"
              >
                <SectionBlock animate>
                  <SectionTitle>Cliente e inversionista</SectionTitle>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="loan-client">Cliente</FieldLabel>
                      {loadingUsers ? (
                        <UserFieldSkeleton />
                      ) : clients.length > 0 ? (
                        <UserSearchSelect
                          id="loan-client"
                          placeholder="Selecciona cliente"
                          users={clients}
                          value={form.clientId}
                          onValueChange={(value) => update("clientId", value)}
                          emptyDetail="Sin cliente asignado."
                        />
                      ) : (
                        <Input id="loan-client" value={form.clientId} onChange={(event) => update("clientId", event.target.value)} placeholder="Selecciona cliente" />
                      )}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="loan-investor">Inversionista</FieldLabel>
                      {loadingUsers ? (
                        <UserFieldSkeleton />
                      ) : investors.length > 0 ? (
                        <UserSearchSelect
                          id="loan-investor"
                          placeholder="Opcional"
                          users={investors}
                          value={form.investorId}
                          onValueChange={(value) => update("investorId", value)}
                          allowClear
                          emptyDetail="Sin inversionista asignado."
                        />
                      ) : (
                        <Input id="loan-investor" value={form.investorId} onChange={(event) => update("investorId", event.target.value)} placeholder="Selecciona inversionista" />
                      )}
                    </Field>
                  </div>
                </SectionBlock>

                <SectionBlock animate>
                  <SectionTitle>Nombre del préstamo</SectionTitle>
                  <Input id="loan-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Opcional — ej: Préstamo para capital de trabajo" />
                </SectionBlock>

                <SectionBlock animate>
                  <SectionTitle>Condiciones financieras</SectionTitle>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="loan-principal">Principal (S/)</FieldLabel>
                      <LoanNumberField
                        id="loan-principal"
                        min={1}
                        step={1}
                        value={form.principal}
                        onValueChange={(value) => update("principal", value)}
                        decrementLabel="Reducir principal"
                        incrementLabel="Aumentar principal"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="loan-rate">Tasa (%)</FieldLabel>
                      <LoanNumberField
                        id="loan-rate"
                        min={0.01}
                        step={0.01}
                        value={form.interestRate}
                        onValueChange={(value) => update("interestRate", value)}
                        decrementLabel="Reducir tasa"
                        incrementLabel="Aumentar tasa"
                      />
                    </Field>
                  </div>
                </SectionBlock>

                <SectionBlock animate>
                  <SectionTitle>Cronograma</SectionTitle>
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
                      <FieldLabel htmlFor="loan-installments">Plazo ({installmentPeriodLabels[form.frequency]?.plural ?? "cuotas"})</FieldLabel>
                      <LoanNumberField
                        id="loan-installments"
                        min={1}
                        max={120}
                        step={1}
                        value={form.installmentsCount}
                        onValueChange={(value) => update("installmentsCount", value)}
                        decrementLabel="Reducir plazo"
                        incrementLabel="Aumentar plazo"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="loan-start-date">Fecha de inicio</FieldLabel>
                      <DatePicker value={form.startDate} onChange={(value) => update("startDate", value)} />
                    </Field>
                  </div>
                </SectionBlock>

                <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
                  <SectionBlock animate className="min-w-0 overflow-hidden">
                    <SectionHeader
                      open={previewOpen}
                    />
                    <CollapsiblePanel>
                      <SchedulePreview preview={schedulePreview} />
                    </CollapsiblePanel>
                  </SectionBlock>
                </Collapsible>

                <SectionBlock animate>
                  <SectionTitle>Observación</SectionTitle>
                  <Textarea id="loan-observation" value={form.observation} onChange={(event) => update("observation", event.target.value)} placeholder="Notas internas para revisión..." />
                </SectionBlock>
              </motion.div>
            </DrawerPanel>
          </div>
          <DrawerFooter variant="bare" className="shrink-0">
            <div className="flex w-full items-center justify-between">
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || !isFormValid}>
                {creating ? <Spinner /> : <PlusIcon data-icon="inline-start" />}
                Crear préstamo
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  )
}

function SectionHeader({
  open,
}: {
  open: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cronograma de cuotas</p>
      <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        {open ? "Ocultar" : "Mostrar"}
        <ChevronDownIcon data-icon="inline-end" className={cn("transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
    </div>
  )
}

function SchedulePreview({
  preview,
}: {
  preview: ReturnType<typeof createSchedulePreview>
}) {
  if (!preview.rows.length) {
    return (
      <div className="mt-3 flex min-h-28 items-center justify-center rounded-xl border border-dashed bg-muted/24 px-4 py-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <ClipboardListIcon className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{preview.emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ScheduleSummary preview={preview} />
      <div className="h-80">
        <ScrollArea scrollFade className="h-full">
          <div className="flex flex-col gap-1">
            {preview.rows.map((row) => (
              <div key={row.installmentNumber} className="flex items-center gap-3 rounded-lg bg-background px-3 py-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {row.installmentNumber}
                </span>
                <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {formatScheduleDate(row.dueDate)}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatPreciseCurrencyWithSymbol(row.amount)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function ScheduleSummary({
  preview,
}: {
  preview: ReturnType<typeof createSchedulePreview>
}) {
  return (
    <div className="rounded-lg border bg-muted/24 p-3">
      <p className="mb-2 text-sm font-medium">Resumen</p>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
          <span className="text-muted-foreground">Total a pagar</span>
          <span className="font-semibold tabular-nums">{formatPreciseCurrencyWithSymbol(preview.totalDebt)}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
          <span className="text-muted-foreground">Cuota {installmentPeriodLabels[preview.frequency]?.singular ?? "cuota"}</span>
          <span className="font-semibold tabular-nums">{formatPreciseCurrencyWithSymbol(preview.amountPerInstallment)}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
          <span className="text-muted-foreground">Capital</span>
          <span className="font-semibold tabular-nums">{formatPreciseCurrencyWithSymbol(preview.principal)}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
          <span className="text-muted-foreground">Intereses</span>
          <span className="font-semibold tabular-nums">{formatPreciseCurrencyWithSymbol(preview.totalInterest)}</span>
        </div>
      </div>
    </div>
  )
}

function LoanNumberField({
  id,
  value,
  min,
  max,
  step,
  decrementLabel,
  incrementLabel,
  onValueChange,
}: {
  id: string
  value: string
  min?: number
  max?: number
  step?: number
  decrementLabel: string
  incrementLabel: string
  onValueChange: (value: string) => void
}) {
  return (
    <NumberField
      id={id}
      min={min}
      max={max}
      step={step}
      value={parseNumberFieldValue(value)}
      onValueChange={(nextValue) => onValueChange(formatNumberFieldValue(nextValue))}
    >
      <NumberFieldGroup>
        <NumberFieldDecrement aria-label={decrementLabel} />
        <NumberFieldInput className="w-full px-1 text-center" />
        <NumberFieldIncrement aria-label={incrementLabel} />
      </NumberFieldGroup>
    </NumberField>
  )
}

function UserFieldSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="rounded-xl bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-1.5 h-3 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  )
}

function UserSearchSelect({
  id,
  users,
  value,
  placeholder,
  emptyDetail,
  allowClear = false,
  onValueChange,
}: {
  id: string
  users: RelatedUser[]
  value: string
  placeholder: string
  emptyDetail: string
  allowClear?: boolean
  onValueChange: (value: string) => void
}) {
  const [query, setQuery] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const selectedUser = users.find((user) => user.id === value)
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return users

    return users.filter((user) =>
      [personName(user), user.email, user.publicCode, user.dni, user.bank, ...(user.bankAccounts ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [query, users])

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <Combobox open={open} onOpenChange={setOpen}>
        <ComboboxInput
          className="w-full"
          id={id}
          value={query || (selectedUser ? personName(selectedUser) : "")}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
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
        <ComboboxPopup className="w-(--anchor-width)">
          <ComboboxList>
            {allowClear && value && (
              <ComboboxItem
                value=""
                onClick={() => {
                  onValueChange("")
                  setQuery("")
                  setDetailsOpen(false)
                  setOpen(false)
                }}
              >
                Sin inversionista
              </ComboboxItem>
            )}
            {filteredUsers.map((user) => (
              <ComboboxItem
                className="w-full min-w-0 px-2"
                key={user.id}
                value={user.id}
                onClick={() => {
                  onValueChange(user.id)
                  setQuery(personName(user))
                  setDetailsOpen(false)
                  setOpen(false)
                }}
              >
                <UserOption user={user} />
              </ComboboxItem>
            ))}
            {filteredUsers.length === 0 && <ComboboxEmpty>No hay coincidencias.</ComboboxEmpty>}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
      <div className="min-h-10">
        {selectedUser ? (
          <SelectedUserCard
            open={detailsOpen}
            user={selectedUser}
            onOpenChange={setDetailsOpen}
          />
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
              <UserRoundIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="truncate text-sm text-muted-foreground">{emptyDetail}</p>
            </div>
          </div>
        )}
      </div>
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

function SelectedUserCard({
  open,
  user,
  onOpenChange,
}: {
  open: boolean
  user: RelatedUser
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="rounded-xl bg-muted/30 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{user.role ? (roleLabels[user.role] ?? user.role) : "Usuario"}</p>
            <p className="truncate text-sm font-semibold">{personName(user)}</p>
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
          <div className="mt-2 grid gap-2 border-t border-border/40 pt-2 text-sm sm:grid-cols-2">
            <UserDetailItem label="Correo" value={user.email ?? "Sin correo"} />
            <UserDetailItem label="Teléfono" value={user.phone ?? "Sin teléfono"} />
            <UserDetailItem label="DNI" value={user.dni ?? "Sin DNI"} />
            <UserDetailItem label="Banco" value={user.bank ?? "Sin banco"} />
            <UserDetailItem className="sm:col-span-2" label="Cuentas" value={(user.bankAccounts ?? []).join(", ") || "Sin cuentas"} />
            <UserDetailItem className="sm:col-span-2" label="Código" value={publicUserCode(user)} />
          </div>
        </CollapsiblePanel>
      </div>
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
  const selectToday = () => {
    onChange(formatInputDate(new Date()))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<button type="button" className={cn(selectTriggerVariants({ size: "default" }), "justify-start font-normal h-10 sm:h-9")} />}>
        <CalendarIcon className="mr-2 opacity-80 shrink-0" data-icon="inline-start" />
        <span className="truncate">
          {selectedDate
            ? new Intl.DateTimeFormat("es-PE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(selectedDate)
            : "Selecciona fecha"}
        </span>
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

function createSchedulePreview(form: LoanFormState) {
  const principal = toNumber(form.principal)
  const interestRate = toNumber(form.interestRate)
  const installmentsCount = Number.parseInt(form.installmentsCount, 10)
  const startDate = parseInputDate(form.startDate)

  if (!startDate || principal <= 0 || !Number.isInteger(installmentsCount) || installmentsCount < 1) {
    return {
      amountPerInstallment: 0,
      emptyMessage: "Completa monto, tasa, plazo y fecha de inicio para ver las cuotas.",
      frequency: form.frequency,
      principal: 0,
      rows: [] as SchedulePreviewRow[],
      totalDebt: 0,
      totalInterest: 0,
    }
  }

  if (!Number.isFinite(interestRate) || interestRate <= 0) {
    return {
      amountPerInstallment: 0,
      emptyMessage: "La tasa debe ser mayor que 0 para calcular el cronograma.",
      frequency: form.frequency,
      principal,
      rows: [] as SchedulePreviewRow[],
      totalDebt: 0,
      totalInterest: 0,
    }
  }

  const safeInstallmentsCount = Math.min(installmentsCount, 120)
  const amountPerInstallment = calculateFixedInstallment(
    principal,
    interestRate,
    safeInstallmentsCount,
  )
  const roundedAmountPerInstallment = roundMoney(amountPerInstallment)
  const roundedTotalDebt = roundMoney(roundedAmountPerInstallment * safeInstallmentsCount)
  const totalInterest = roundMoney(Math.max(roundedTotalDebt - principal, 0))
  const decimalRate = interestRate / 100
  let remainingPrincipal = roundMoney(principal)

  return {
    amountPerInstallment: roundedAmountPerInstallment,
    emptyMessage: "",
    frequency: form.frequency,
    principal,
    rows: Array.from({ length: safeInstallmentsCount }, (_, index) => {
      const installmentNumber = index + 1
      const interestAmount = roundMoney(remainingPrincipal * decimalRate)
      const amortizedPrincipal = roundMoney(roundedAmountPerInstallment - interestAmount)
      remainingPrincipal = Math.max(roundMoney(remainingPrincipal - amortizedPrincipal), 0)

      return {
        amortizedPrincipal,
        installmentNumber,
        interestAmount,
        dueDate: calculateDueDate(startDate, installmentNumber, form.frequency),
        amount: roundedAmountPerInstallment,
        remainingPrincipal,
      }
    }),
    totalDebt: roundedTotalDebt,
    totalInterest,
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
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100
  return Object.is(rounded, -0) ? 0 : rounded
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
