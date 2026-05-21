import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/contexts/auth-context"
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
  const [status, setStatus] = useState<RealtimeStatus>("idle")
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)

  useEffect(() => {
    const token = session?.access_token
    if (!token || !API_BASE_URL) {
      return
    }

    let stopped = false
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
          setStatus("error")
          return
        }

        if (message.type.startsWith("notification.")) {
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
          message.type.startsWith("voucher.")
        ) {
          dispatchDomainUpdated({
            source: "websocket",
            type: message.type,
            data: message.data,
          })
        }
      })

      socket.addEventListener("close", () => {
        if (stopped) return
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
      cleanupSocket()
    }
  }, [session?.access_token])

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
