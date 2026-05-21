export const realtimeNotificationsEvent = "abc:notifications-updated"
export const realtimeDomainEvent = "abc:domain-updated"

export type RealtimeNotificationDetail = {
  source: "http" | "websocket"
  type?: string
  data?: unknown
}

export type RealtimeDomainDetail = {
  source: "websocket"
  type: string
  data?: unknown
}

export function buildWebSocketUrl(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = "/ws"
  url.search = ""
  url.hash = ""
  return url.toString()
}

export function dispatchNotificationsUpdated(detail: RealtimeNotificationDetail = { source: "http" }) {
  window.dispatchEvent(new CustomEvent<RealtimeNotificationDetail>(realtimeNotificationsEvent, { detail }))
}

export function dispatchDomainUpdated(detail: RealtimeDomainDetail) {
  window.dispatchEvent(new CustomEvent<RealtimeDomainDetail>(realtimeDomainEvent, { detail }))
}
