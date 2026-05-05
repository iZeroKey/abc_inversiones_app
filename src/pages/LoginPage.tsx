import { zodResolver } from "@hookform/resolvers/zod"
import iconNameAbc from "@/assets/icon-name-abc.png"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { toastManager } from "@/components/ui/toast"
import { useAuth } from "@/contexts/auth-context"
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "lucide-react"
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

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

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

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  
  const [showPassword, setShowPassword] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState("")
  const [isAuthErrorVisible, setIsAuthErrorVisible] = useState(false)
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

  const { onChange: onEmailChange, ...emailRest } = register("email")
  const { onChange: onPasswordChange, ...passwordRest } = register("password")

  return (
    <div className="flex flex-col min-h-svh w-full items-center justify-center p-4 md:p-8 bg-linear-to-b from-[#09152E] via-[#192541] to-[#1F2A44]">
      <div className="w-full max-w-xs md:max-w-sm mb-10">
        <img
          src={iconNameAbc}
          alt="ABC Inversiones"
          className="h-20 w-auto mx-auto md:h-24"
        />
      </div>

      <Card className="w-full max-w-xs md:max-w-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full px-6 py-6 space-y-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Bienvenido</CardTitle>
              <CardDescription>Ingresa tus credenciales</CardDescription>
            </div>
            <form onSubmit={handleLoginSubmit} className="space-y-4" aria-busy={isSubmitting}>
              <div
                className={`overflow-hidden rounded-md text-sm text-destructive transition-all duration-200 ease-out ${
                  isAuthErrorVisible
                    ? "max-h-16 opacity-100 mb-3 bg-destructive/10 px-3 py-2"
                    : "max-h-0 opacity-0 mb-0 bg-transparent px-0 py-0"
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
                        aria-describedby={
                          errors.email ? emailErrorId : undefined
                        }
                        aria-invalid={errors.email ? true : undefined}
                        {...emailRest}
                        onChange={(e) => {
                          onEmailChange(e)
                          if (authErrorMessage) updateVisibleAuthError("")
                        }}
                      />
                    </InputGroup>
                  </div>
                  <div
                    id={emailErrorId}
                    className={`overflow-hidden text-xs text-destructive transition-all duration-200 ease-out ${
                      errors.email
                        ? "max-h-5 opacity-100 mt-1"
                        : "max-h-0 opacity-0 mt-0"
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
                          aria-describedby={
                            errors.password ? passwordErrorId : undefined
                          }
                          aria-invalid={errors.password ? true : undefined}
                          {...passwordRest}
                          onChange={(e) => {
                            onPasswordChange(e)
                            if (authErrorMessage) updateVisibleAuthError("")
                          }}
                        />
                        <InputGroupAddon align="inline-end">
                          <button
                            type="button"
                            className="p-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={
                              showPassword
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                            }
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
                        ? "max-h-5 opacity-100 mt-1"
                        : "max-h-0 opacity-0 mt-0"
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
                    onCheckedChange={(c) => setValue("remember", !!c)}
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
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-6">
        &copy; 2026 ABC Inversiones. Todos los derechos reservados.
      </p>
    </div>
  )
}
