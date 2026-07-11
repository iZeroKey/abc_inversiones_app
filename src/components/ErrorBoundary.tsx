import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="size-7 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">Algo salió mal</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ocurrió un error inesperado. Podés intentar recargar la página o volver al inicio.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
            <Button onClick={this.handleReset}>
              Reintentar
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-w-xl overflow-auto rounded-md bg-muted p-4 text-left text-xs text-muted-foreground">
              <ScrollArea>
                {this.state.error.stack}
              </ScrollArea>
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
