import { useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/contexts/auth-context"
import { queryKeys } from "@/lib/query-keys"
import { buildWebSocketUrl, dispatchDomainUpdated, dispatchNotificationsUpdated } from "@/lib/realtime"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

type RealtimeStatus = "idle" | "connecting" | "authenticated" | "disconnected" | "error"

type RealtimeMessage = {
  type?: string
  data?: unknown
  timestamp?: string
}

type RealtimeContextValue = {
  status: RealtimeStatus
  lastMessage: RealtimeMessage | null
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined)

function parseRealtimeMessage(value: string): RealtimeMessage | null {
  try {
    return JSON.parse(value) as RealtimeMessage
  } catch {
    return null
  }
}

function getReconnectDelay(attempt: number) {
  return Math.min(1_000 * 2 ** attempt, 30_000)
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>("idle")
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const invalidationQueueRef = useRef<RealtimeMessage[]>([])
  const invalidationTimeoutRef = useRef<number | undefined>(undefined)

  const flushRealtimeInvalidations = useMemo(
    () => () => {
      invalidationTimeoutRef.current = undefined
      const messages = invalidationQueueRef.current
      invalidationQueueRef.current = []

      const shouldInvalidateLoans = messages.some((message) =>
        ["loan.", "payment.", "voucher."].some((prefix) =>
          message.type?.startsWith(prefix),
        ),
      )
      const shouldInvalidateUsers = messages.some((message) =>
        ["user.", "access-request."].some((prefix) =>
          message.type?.startsWith(prefix),
        ),
      )
      const shouldInvalidateNotifications = messages.some((message) =>
        message.type?.startsWith("notification."),
      )
      const shouldInvalidateAudit = messages.some(
        (message) => message.type === "audit.created",
      )

      if (shouldInvalidateLoans) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.loans.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      }

      if (shouldInvalidateUsers) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      }

      if (shouldInvalidateNotifications) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
      }

      if (shouldInvalidateAudit) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all })
      }
    },
    [queryClient],
  )

  const scheduleRealtimeInvalidation = useMemo(
    () => (message: RealtimeMessage) => {
      invalidationQueueRef.current.push(message)
      if (invalidationTimeoutRef.current !== undefined) return

      invalidationTimeoutRef.current = window.setTimeout(
        flushRealtimeInvalidations,
        300,
      )
    },
    [flushRealtimeInvalidations],
  )

  useEffect(() => {
    const token = session?.access_token
    if (!token || !API_BASE_URL) {
      return
    }

    let stopped = false
    let shouldReconnect = true
    let reconnectTimeoutId: number | undefined
    let pingIntervalId: number | undefined

    const cleanupSocket = () => {
      if (pingIntervalId !== undefined) {
        window.clearInterval(pingIntervalId)
        pingIntervalId = undefined
      }

      const socket = socketRef.current
      socketRef.current = null
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close(1000, "client reconnect")
      }
    }

    const scheduleReconnect = () => {
      if (stopped) return
      const delay = getReconnectDelay(reconnectAttemptRef.current)
      reconnectAttemptRef.current += 1
      reconnectTimeoutId = window.setTimeout(connect, delay)
    }

    const connect = () => {
      cleanupSocket()
      if (stopped) return

      setStatus("connecting")
      const socket = new WebSocket(buildWebSocketUrl(API_BASE_URL))
      socketRef.current = socket

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "auth", token }))
        pingIntervalId = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }))
          }
        }, 30_000)
      })

      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return
        const message = parseRealtimeMessage(event.data)
        if (!message?.type) return

        setLastMessage(message)
        if (message.type === "auth.ok") {
          reconnectAttemptRef.current = 0
          setStatus("authenticated")
          return
        }

        if (message.type === "auth.error" || message.type === "auth.required") {
          shouldReconnect = false
          setStatus("error")
          return
        }

        if (message.type.startsWith("notification.")) {
          scheduleRealtimeInvalidation(message)
          dispatchNotificationsUpdated({
            source: "websocket",
            type: message.type,
            data: message.data,
          })
          return
        }

        if (
          message.type.startsWith("loan.") ||
          message.type.startsWith("payment.") ||
          message.type.startsWith("voucher.") ||
          message.type.startsWith("user.") ||
          message.type.startsWith("access-request.") ||
          message.type.startsWith("audit.")
        ) {
          scheduleRealtimeInvalidation(message)
          dispatchDomainUpdated({
            source: "websocket",
            type: message.type,
            data: message.data,
          })
        }
      })

      socket.addEventListener("close", (event) => {
        if (stopped) return
        if (!shouldReconnect || event.code === 4001 || event.code === 4003) {
          setStatus("error")
          return
        }
        setStatus("disconnected")
        scheduleReconnect()
      })

      socket.addEventListener("error", () => {
        if (!stopped) setStatus("error")
      })
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimeoutId !== undefined) {
        window.clearTimeout(reconnectTimeoutId)
      }
      if (invalidationTimeoutRef.current !== undefined) {
        window.clearTimeout(invalidationTimeoutRef.current)
        invalidationTimeoutRef.current = undefined
      }
      cleanupSocket()
    }
  }, [scheduleRealtimeInvalidation, session?.access_token])

  const value = useMemo(
    () => ({
      status: session?.access_token && API_BASE_URL ? status : "idle",
      lastMessage: session?.access_token && API_BASE_URL ? lastMessage : null,
    }),
    [lastMessage, session?.access_token, status],
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider")
  }
  return context
}
