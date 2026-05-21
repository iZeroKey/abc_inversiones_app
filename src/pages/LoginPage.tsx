import { zodResolver } from "@hookform/resolvers/zod"
import iconNameAbc from "@/assets/icon-name-abc.png"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  LandmarkIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  SendIcon,
  UserIcon,
} from "lucide-react"
import type { FormEvent } from "react"
import { useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"

interface LoginResponse {
  success: boolean
  message?: string
  data?: {
    user?: {
      id: string
      email: string
      firstName?: string
      lastName?: string
      role?: string
      isOwner?: boolean
      active?: boolean
    }
    session?: {
      access_token: string
      refresh_token: string
      expires_in: number
    }
  }
}

type ApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

type LoginCardMode = "login" | "request"

type AccessRequestForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  roleRequested: "client" | "investor"
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

const defaultAccessForm: AccessRequestForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleRequested: "client",
}

const emailSchema = z
  .string()
  .min(1, { message: "El correo es obligatorio" })
  .email("Ingresa un correo válido")
const passwordSchema = z
  .string()
  .min(1, { message: "La contraseña es obligatoria" })
  .min(6, { message: "Mínimo 6 caracteres" })

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  remember: z.boolean().default(false),
})

type LoginFormInput = z.input<typeof loginSchema>
type LoginFormData = z.output<typeof loginSchema>

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("No se pudo conectar con el servidor.")
  }

  return API_BASE_URL
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [cardMode, setCardMode] = useState<LoginCardMode>("login")
  const [showPassword, setShowPassword] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState("")
  const [isAuthErrorVisible, setIsAuthErrorVisible] = useState(false)
  const [accessForm, setAccessForm] = useState<AccessRequestForm>(defaultAccessForm)
  const [accessSubmitting, setAccessSubmitting] = useState(false)
  const [accessSubmitted, setAccessSubmitted] = useState(false)
  const clearAuthErrorTimer = useRef<number | undefined>(undefined)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput, unknown, LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  })

  const remember = useWatch({ control, name: "remember" })

  const emailErrorId = "login-email-error"
  const passwordErrorId = "login-password-error"

  const updateVisibleAuthError = (nextError: string) => {
    if (clearAuthErrorTimer.current) {
      window.clearTimeout(clearAuthErrorTimer.current)
    }

    if (nextError) {
      setAuthErrorMessage(nextError)
      setIsAuthErrorVisible(true)
      return
    }

    setIsAuthErrorVisible(false)
    clearAuthErrorTimer.current = window.setTimeout(() => {
      setAuthErrorMessage("")
      clearAuthErrorTimer.current = undefined
    }, 200)
  }

  const updateAccessForm = (patch: Partial<AccessRequestForm>) => {
    setAccessForm((current) => ({ ...current, ...patch }))
  }

  const showAccessForm = () => {
    updateVisibleAuthError("")
    setAccessSubmitted(false)
    setCardMode("request")
  }

  const showLoginForm = () => {
    setAccessSubmitted(false)
    setCardMode("login")
  }

  const onSubmit = async (data: LoginFormData) => {
    updateVisibleAuthError("")

    if (!API_BASE_URL) {
      toastManager.add({
        type: "error",
        title: "Error inesperado",
        description: "No se pudo conectar con el servidor.",
      })
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 8000)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | LoginResponse
        | null

      if (!response.ok || !payload?.success || !payload.data?.session) {
        const status = response.status
        const isCredentialError = status === 400 || status === 401
        if (isCredentialError) {
          updateVisibleAuthError("Correo electrónico o contraseña incorrectos.")
          setFocus("email")
        } else {
          toastManager.add({
            type: "error",
            title: "Error del servidor",
            description:
              "Estamos teniendo problemas. Intenta nuevamente en unos minutos.",
          })
        }
        return
      }

      login({
        session: payload.data.session,
        user: payload.data.user,
        remember: data.remember,
      })

      const redirectTo =
        (location.state as { from?: string } | null)?.from || "/home"
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toastManager.add({
          type: "error",
          title: "Error del servidor",
          description: "La solicitud tardo demasiado. Intenta nuevamente.",
        })
      } else {
        toastManager.add({
          type: "error",
          title: "Error del servidor",
          description:
            "Estamos teniendo problemas. Intenta nuevamente en unos minutos.",
        })
      }
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(event)
  }

  const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      ...accessForm,
      firstName: accessForm.firstName.trim(),
      lastName: accessForm.lastName.trim(),
      email: accessForm.email.trim(),
      phone: accessForm.phone.trim(),
    }

    if (
      payload.firstName.length < 2 ||
      payload.lastName.length < 2 ||
      payload.phone.length < 7 ||
      !payload.email.includes("@")
    ) {
      toastManager.add({
        type: "warning",
        title: "Revisa tus datos",
        description: "Nombre, apellido, correo y teléfono son obligatorios.",
      })
      return
    }

    setAccessSubmitting(true)
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = (await response.json().catch(() => null)) as ApiResponse<unknown> | null

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "No se pudo enviar la solicitud.")
      }

      setAccessSubmitted(true)
      setAccessForm(defaultAccessForm)
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "Solicitud no enviada",
        description: getErrorMessage(error, "Inténtalo nuevamente en unos segundos."),
      })
    } finally {
      setAccessSubmitting(false)
    }
  }

  const { onChange: onEmailChange, ...emailRest } = register("email")
  const { onChange: onPasswordChange, ...passwordRest } = register("password")

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-linear-to-b from-[#09152E] via-[#192541] to-[#1F2A44] p-4 md:p-8">
      <div className="mb-10 w-full max-w-xs md:max-w-sm">
        <img
          src={iconNameAbc}
          alt="ABC Inversiones"
          className="mx-auto h-20 w-auto md:h-24"
        />
      </div>

      <Card className="w-full max-w-xs overflow-hidden md:max-w-md">
        <CardContent className="p-0">
          <div
            key={cardMode}
            className="w-full space-y-4 px-6 py-6 duration-300 animate-in fade-in slide-in-from-right-2"
          >
            {cardMode === "login" ? (
              <>
                <div className="space-y-1">
                  <CardTitle className="text-2xl">Bienvenido</CardTitle>
                  <CardDescription>Ingresa tus credenciales</CardDescription>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-4" aria-busy={isSubmitting}>
                  <div
                    className={`overflow-hidden rounded-md text-sm text-destructive transition-all duration-200 ease-out ${
                      isAuthErrorVisible
                        ? "mb-3 max-h-16 bg-destructive/10 px-3 py-2 opacity-100"
                        : "mb-0 max-h-0 bg-transparent px-0 py-0 opacity-0"
                    }`}
                    aria-live="assertive"
                  >
                    {authErrorMessage}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <InputGroup>
                          <InputGroupAddon align="inline-start">
                            <MailIcon className="size-4" />
                          </InputGroupAddon>
                          <InputGroupInput
                            id="email"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            autoComplete="username"
                            disabled={isSubmitting}
                            aria-describedby={errors.email ? emailErrorId : undefined}
                            aria-invalid={errors.email ? true : undefined}
                            {...emailRest}
                            onChange={(event) => {
                              onEmailChange(event)
                              if (authErrorMessage) updateVisibleAuthError("")
                            }}
                          />
                        </InputGroup>
                      </div>
                      <div
                        id={emailErrorId}
                        className={`overflow-hidden text-xs text-destructive transition-all duration-200 ease-out ${
                          errors.email
                            ? "mt-1 max-h-5 opacity-100"
                            : "mt-0 max-h-0 opacity-0"
                        }`}
                        aria-live="polite"
                      >
                        {errors.email?.message}
                      </div>
                    </div>
                    <div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <div className="flex">
                          <InputGroup className="flex-1">
                            <InputGroupAddon align="inline-start">
                              <LockIcon className="size-4" />
                            </InputGroupAddon>
                            <InputGroupInput
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              disabled={isSubmitting}
                              aria-describedby={errors.password ? passwordErrorId : undefined}
                              aria-invalid={errors.password ? true : undefined}
                              {...passwordRest}
                              onChange={(event) => {
                                onPasswordChange(event)
                                if (authErrorMessage) updateVisibleAuthError("")
                              }}
                            />
                            <InputGroupAddon align="inline-end">
                              <button
                                type="button"
                                className="p-2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                aria-pressed={showPassword}
                              >
                                {showPassword ? (
                                  <EyeOffIcon className="size-4" />
                                ) : (
                                  <EyeIcon className="size-4" />
                                )}
                              </button>
                            </InputGroupAddon>
                          </InputGroup>
                        </div>
                      </div>
                      <div
                        id={passwordErrorId}
                        className={`overflow-hidden text-xs text-destructive transition-all duration-200 ease-out ${
                          errors.password
                            ? "mt-1 max-h-5 opacity-100"
                            : "mt-0 max-h-0 opacity-0"
                        }`}
                        aria-live="polite"
                      >
                        {errors.password?.message}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        checked={remember}
                        disabled={isSubmitting}
                        onCheckedChange={(checked) => setValue("remember", !!checked)}
                      />
                      <Label htmlFor="remember" className="text-sm font-normal">
                        Recordarme
                      </Label>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner className="size-4" />
                        Iniciando...
                      </span>
                    ) : (
                      "Iniciar sesión"
                    )}
                  </Button>
                </form>
                <div className="border-t pt-4">
                  <Button type="button" variant="link" className="w-full" onClick={showAccessForm}>
                    Solicitar acceso
                  </Button>
                </div>
              </>
            ) : accessSubmitted ? (
              <div className="flex flex-col items-center gap-4 py-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircleIcon className="size-6" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl">Solicitud enviada</CardTitle>
                  <CardDescription>
                    Administración revisará tus datos y te contactará cuando el acceso esté listo.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={showLoginForm}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Iniciar sesión
                </Button>
              </div>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit px-2" onClick={showLoginForm}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Iniciar sesión
                </Button>
                <div className="space-y-1">
                  <CardTitle className="text-2xl">Solicitar acceso</CardTitle>
                  <CardDescription>Completa tus datos para que administración revise tu cuenta.</CardDescription>
                </div>
                <form className="space-y-4" onSubmit={handleAccessSubmit} aria-busy={accessSubmitting}>
                  <Field>
                    <FieldLabel htmlFor="first-name">Nombre</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <UserIcon className="size-4" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="first-name"
                        required
                        value={accessForm.firstName}
                        onChange={(event) => updateAccessForm({ firstName: event.target.value })}
                      />
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="last-name">Apellido</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <UserIcon className="size-4" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="last-name"
                        required
                        value={accessForm.lastName}
                        onChange={(event) => updateAccessForm({ lastName: event.target.value })}
                      />
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="request-email">Correo</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <MailIcon className="size-4" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="request-email"
                        type="email"
                        required
                        value={accessForm.email}
                        onChange={(event) => updateAccessForm({ email: event.target.value })}
                      />
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="request-phone">Teléfono</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <PhoneIcon className="size-4" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="request-phone"
                        required
                        value={accessForm.phone}
                        onChange={(event) => updateAccessForm({ phone: event.target.value })}
                      />
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel>Tipo de acceso</FieldLabel>
                    <Select
                      items={[
                        { label: "Cliente", value: "client" },
                        { label: "Inversionista", value: "investor" },
                      ]}
                      value={accessForm.roleRequested}
                      onValueChange={(value) =>
                        updateAccessForm({ roleRequested: (value ?? "client") as AccessRequestForm["roleRequested"] })
                      }
                    >
                      <SelectTrigger size="lg">
                        <LandmarkIcon data-icon="inline-start" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="client">Cliente</SelectItem>
                          <SelectItem value="investor">Inversionista</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button type="submit" className="w-full" disabled={accessSubmitting}>
                    {accessSubmitting ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <SendIcon data-icon="inline-start" />
                    )}
                    Enviar solicitud
                  </Button>
                </form>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        &copy; 2026 ABC Inversiones. Todos los derechos reservados.
      </p>
    </div>
  )
}
