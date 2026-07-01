import { useEffect, useRef } from "react"
import {
  BadgeCheckIcon,
  BanknoteIcon,
  CheckIcon,
  CircleAlertIcon,
  CopyIcon,
  Dice5Icon,
  IdCardIcon,
  KeyRoundIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  ShieldIcon,
  UserCogIcon,
  UserIcon,
  XIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { toastManager } from "@/components/ui/toast"
import { useIsMobile } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

import type {
  CurrentUser,
  LinkAuthFormState,
  ManagedUser,
  UserEditPermissions,
  UserFormState,
  UserRole,
} from "./utils"
import {
  displayPersonName,
  editableRoleItems,
  formatPhoneNumber,
  generateTemporaryPassword,
  getRoleLabel,
  maritalStatusItems,
  normalizeRole,
} from "./utils"

import { StatusBadge } from "./components"

export function UserDialog({
  open,
  editingUser,
  currentUser,
  permissions,
  form,
  saving,
  onFormChange,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  editingUser: ManagedUser | null
  currentUser: CurrentUser
  permissions: UserEditPermissions
  form: UserFormState
  saving: boolean
  onFormChange: React.Dispatch<React.SetStateAction<UserFormState>>
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const isEditing = Boolean(editingUser)
  const roleItemsForUser = currentUser?.isOwner
    ? editableRoleItems
    : editableRoleItems.filter((item) => item.value !== "admin")
  const authRequired = !isEditing && (form.role === "admin" || form.createAuthAccount)
  const missingAuthEmail = authRequired && form.email.trim().length === 0
  const showInactiveWarning = Boolean(editingUser && permissions.canUpdateActive && !form.active)
  const title = isEditing ? "Editar usuario" : "Nuevo usuario"
  const bankAccountRefs = useRef<Array<HTMLInputElement | null>>([])
  const pendingBankAccountFocusIndex = useRef<number | null>(null)
  const canAddBankAccount = form.bankAccounts.every((account) => account.trim().length > 0)
  const canSubmit = !saving && !missingAuthEmail

  useEffect(() => {
    const focusIndex = pendingBankAccountFocusIndex.current
    if (focusIndex === null) return

    bankAccountRefs.current[focusIndex]?.focus()
    pendingBankAccountFocusIndex.current = null
  }, [form.bankAccounts.length])

  const handleBankAccountChange = (index: number, value: string) => {
    onFormChange((current) => ({
      ...current,
      bankAccounts: current.bankAccounts.map((account, accountIndex) =>
        accountIndex === index ? value : account,
      ),
    }))
  }
  const addBankAccount = () => {
    if (!canAddBankAccount) return
    pendingBankAccountFocusIndex.current = form.bankAccounts.length
    onFormChange((current) => ({
      ...current,
      bankAccounts: [...current.bankAccounts, ""],
    }))
  }
  const removeBankAccount = (index: number) => {
    onFormChange((current) => {
      const nextAccounts = current.bankAccounts.filter((_, accountIndex) => accountIndex !== index)
      return {
        ...current,
        bankAccounts: nextAccounts.length ? nextAccounts : [""],
      }
    })
  }
  const setGeneratedPassword = () => {
    onFormChange((current) => ({ ...current, password: generateTemporaryPassword() }))
  }
  const copyPassword = async () => {
    if (!form.password) return
    await navigator.clipboard.writeText(form.password)
    toastManager.add({
      type: "success",
      title: "Contraseña copiada",
      description: "La contraseña temporal quedó en el portapapeles.",
    })
  }

  const isMobile = useIsMobile()

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={cn(
          isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : "",
          "overflow-hidden",
        )}
        style={!isMobile ? { width: 860, minWidth: 620 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            {isEditing
              ? "Actualiza datos operativos y campos administrativos permitidos. El rol no se puede modificar."
              : "Crea clientes, inversionistas o administradores según las reglas de acceso actuales."}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerPanel className="pt-4 max-sm:pt-4">
          <form
            id="user-form"
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              if (!canSubmit) {
                event.preventDefault()
                return
              }
              onSubmit(event)
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="firstName">Nombres</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <UserIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="firstName"
                    value={form.firstName}
                    required
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, firstName: event.target.value }))
                    }
                  />
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Apellidos</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <UserIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="lastName"
                    value={form.lastName}
                    required
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, lastName: event.target.value }))
                    }
                  />
                </InputGroup>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="email"
                  type="email"
                  value={form.email}
                  required={authRequired}
                  disabled={isEditing && !permissions.canUpdateAdministrativeFields}
                  placeholder="correo@ejemplo.com"
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </InputGroup>
              {isEditing && !permissions.canUpdateAdministrativeFields && (
                <FieldDescription>Tu correo no se cambia desde esta pantalla.</FieldDescription>
              )}
              {!isEditing && (
                <FieldDescription>
                  Clientes e inversionistas pueden quedar sin correo si no tendrán cuenta de acceso.
                </FieldDescription>
              )}
              {missingAuthEmail && (
                <FieldDescription className="text-destructive">
                  Agrega un correo para crear la cuenta de acceso.
                </FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <PhoneIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="phone"
                  value={form.phone}
                  placeholder="+51 999 999 999"
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, phone: event.target.value }))
                  }
                  onBlur={() =>
                    onFormChange((current) => ({ ...current, phone: formatPhoneNumber(current.phone) }))
                  }
                />
              </InputGroup>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="dni">DNI</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <IdCardIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="dni"
                    value={form.dni}
                    placeholder="12345678"
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, dni: event.target.value }))
                    }
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="maritalStatus">Estado civil</FieldLabel>
                <Select
                  items={maritalStatusItems}
                  value={form.maritalStatus}
                  onValueChange={(value) =>
                    onFormChange((current) => ({
                      ...current,
                      maritalStatus: value ?? "none",
                    }))
                  }
                >
                  <SelectTrigger id="maritalStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {maritalStatusItems.map((item) => (
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
              <FieldLabel htmlFor="address">Dirección</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MapPinIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="address"
                  value={form.address}
                  placeholder="Av. Principal 123"
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, address: event.target.value }))
                  }
                />
              </InputGroup>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bank">Banco</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <BanknoteIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="bank"
                    value={form.bank}
                    placeholder="BCP, Interbank..."
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, bank: event.target.value }))
                    }
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel>Cuentas bancarias</FieldLabel>
                <div className="flex w-full flex-col gap-2">
                  {form.bankAccounts.map((account, index) => (
                    <InputGroup key={index}>
                      <InputGroupAddon align="inline-start">
                        <BanknoteIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-label={`Cuenta bancaria ${index + 1}`}
                        value={account}
                        placeholder="CCI o número de cuenta"
                        ref={(node) => {
                          bankAccountRefs.current[index] = node
                        }}
                        onChange={(event) => handleBankAccountChange(index, event.target.value)}
                      />
                      <InputGroupAddon align="inline-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar cuenta bancaria ${index + 1}`}
                          disabled={form.bankAccounts.length === 1 && !account}
                          onClick={() => removeBankAccount(index)}
                        >
                          <XIcon />
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  ))}
                  {canAddBankAccount && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8.5 w-full justify-center border-dashed text-muted-foreground animate-in fade-in-0 slide-in-from-top-1 sm:h-7.5"
                      onClick={addBankAccount}
                    >
                      <PlusIcon data-icon="inline-start" />
                      Agregar cuenta bancaria
                    </Button>
                  )}
                </div>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <RoleAccessPanel
                editingUser={editingUser}
                form={form}
                isEditing={isEditing}
                roleItemsForUser={roleItemsForUser}
                onFormChange={onFormChange}
              />

              <AccessStatusField
                authRequired={authRequired}
                editingUser={editingUser}
                form={form}
                isEditing={isEditing}
                permissions={permissions}
                onFormChange={onFormChange}
              />
            </div>

            {!isEditing && (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={form.role === "admin" || form.createAuthAccount}
                    disabled={form.role === "admin"}
                    onCheckedChange={(checked) =>
                      onFormChange((current) => ({
                        ...current,
                        createAuthAccount: current.role === "admin" ? true : Boolean(checked),
                      }))
                    }
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium">Crear cuenta de acceso</span>
                    <span className="block text-muted-foreground">
                      Requiere correo y contraseña temporal. Para usuarios operativos puedes dejarlo desactivado.
                    </span>
                  </span>
                </label>

                {authRequired && (
                  <Field>
                    <FieldLabel htmlFor="password">Contraseña temporal</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <KeyRoundIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="password"
                        type="password"
                        value={form.password}
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        onChange={(event) =>
                          onFormChange((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                      <InputGroupAddon align="inline-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={setGeneratedPassword}
                        >
                          <Dice5Icon data-icon="inline-start" />
                          Generar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!form.password}
                          onClick={() => void copyPassword()}
                        >
                          <CopyIcon data-icon="inline-start" />
                          Copiar
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                )}
              </div>
            )}

            {showInactiveWarning && (
              <div className="flex flex-col gap-3">
                <Alert variant="warning">
                  <CircleAlertIcon />
                  <AlertTitle>
                    {editingUser?.authUserId ? "El usuario quedará sin acceso" : "El usuario quedará inactivo"}
                  </AlertTitle>
                  <AlertDescription>
                    {editingUser?.authUserId
                      ? "Al desactivarlo no podrá iniciar sesión hasta que vuelva a estar activo."
                      : "Al desactivarlo no estará disponible para operaciones en el sistema hasta que vuelva a estar activo."}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </form>
        </DrawerPanel>

        <DrawerFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" disabled={!canSubmit}>
            {saving ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

export function LinkAuthDialog({
  open,
  user,
  form,
  saving,
  onFormChange,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  user: ManagedUser | null
  form: LinkAuthFormState
  saving: boolean
  onFormChange: React.Dispatch<React.SetStateAction<LinkAuthFormState>>
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const isMobile = useIsMobile()
  if (!user) return null

  const setGeneratedPassword = () => {
    onFormChange((current) => ({ ...current, password: generateTemporaryPassword() }))
  }
  const copyPassword = async () => {
    if (!form.password) return
    await navigator.clipboard.writeText(form.password)
    toastManager.add({
      type: "success",
      title: "Contraseña copiada",
      description: "La contraseña temporal quedó en el portapapeles.",
    })
  }


  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 520, maxWidth: "min(720px, calc(100vw - 2rem))", minWidth: 420 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>Vincular cuenta de acceso</DrawerTitle>
          <DrawerDescription>
            {displayPersonName(user)} podrá iniciar sesión con el correo y contraseña temporal.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerPanel className="pt-4 max-sm:pt-4">
          <form id="link-auth-form" className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Field>
              <FieldLabel htmlFor="link-email">Correo electrónico</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="link-email"
                  type="email"
                  value={form.email}
                  required
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="link-password">Contraseña temporal</FieldLabel>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <KeyRoundIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="link-password"
                  type="password"
                  value={form.password}
                  required
                  minLength={6}
                  onChange={(event) =>
                    onFormChange((current) => ({ ...current, password: event.target.value }))
                  }
                />
                <InputGroupAddon align="inline-end">
                  <Button type="button" variant="ghost" size="sm" onClick={setGeneratedPassword}>
                    <Dice5Icon data-icon="inline-start" />
                    Generar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!form.password}
                    onClick={() => void copyPassword()}
                  >
                    <CopyIcon data-icon="inline-start" />
                    Copiar
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </form>
        </DrawerPanel>

        <DrawerFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="link-auth-form" disabled={saving}>
            {saving ? <Spinner data-icon="inline-start" /> : <LinkIcon data-icon="inline-start" />}
            {saving ? "Vinculando..." : "Vincular acceso"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}

function RoleAccessPanel({
  editingUser,
  form,
  isEditing,
  roleItemsForUser,
  onFormChange,
}: {
  editingUser: ManagedUser | null
  form: UserFormState
  isEditing: boolean
  roleItemsForUser: { label: string; value: UserRole }[]
  onFormChange: React.Dispatch<React.SetStateAction<UserFormState>>
}) {
  const normalizedRole = normalizeRole(form.role)
  const RoleIcon = normalizedRole === "admin" ? ShieldIcon : UserIcon

  return (
    <Field>
      <FieldLabel htmlFor={isEditing ? undefined : "role"}>Rol</FieldLabel>
      {isEditing ? (
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <RoleIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Rol"
            value={getRoleLabel(normalizedRole)}
            readOnly
            size="lg"
            className="font-medium"
          />
          {editingUser?.isOwner && (
            <InputGroupAddon align="inline-end">
              <Badge variant="secondary">Owner</Badge>
            </InputGroupAddon>
          )}
        </InputGroup>
      ) : (
        <Select
          items={roleItemsForUser}
          value={form.role}
          onValueChange={(value) =>
            onFormChange((current) => ({
              ...current,
              role: value ?? "client",
              createAuthAccount: value === "admin" ? true : current.createAuthAccount,
            }))
          }
        >
          <SelectTrigger id="role" size="lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {roleItemsForUser.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </Field>
  )
}

function AccessStatusField({
  authRequired,
  editingUser,
  form,
  isEditing,
  permissions,
  onFormChange,
}: {
  authRequired: boolean
  editingUser: ManagedUser | null
  form: UserFormState
  isEditing: boolean
  permissions: UserEditPermissions
  onFormChange: React.Dispatch<React.SetStateAction<UserFormState>>
}) {
  const accessUser: ManagedUser = isEditing && editingUser
    ? editingUser
    : { id: "draft", authUserId: authRequired ? "draft" : null }
  const hasAuthAccess = Boolean(accessUser.authUserId)
  const AccessIcon = hasAuthAccess ? BadgeCheckIcon : UserCogIcon

  return (
    <Field>
      <FieldLabel htmlFor="active">Acceso</FieldLabel>
      <div className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-3 text-base shadow-xs/5 sm:min-h-9 sm:text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <AccessIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">
            {hasAuthAccess ? "Con acceso" : "Operativo"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge active={form.active} />
          <Switch
            id="active"
            checked={form.active}
            disabled={!permissions.canUpdateActive}
            onCheckedChange={(checked) =>
              onFormChange((current) => ({ ...current, active: checked }))
            }
          />
        </div>
      </div>
    </Field>
  )
}
