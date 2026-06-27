import { useEffect, useRef, useState } from "react"
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "lucide-react"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import { statusLabels, voucherStatusLabels } from "@/features/loans/loan-constants"
import { cn } from "@/lib/utils"

export function LoanStatusBadge({
  status,
  size,
  className,
}: {
  status: string
  size?: BadgeProps["size"]
  className?: string
}) {
  const [animate, setAnimate] = useState(false)
  const prevStatusRef = useRef(status)

  useEffect(() => {
    if (prevStatusRef.current !== status) {
      setAnimate(true)
      prevStatusRef.current = status
      const timer = setTimeout(() => setAnimate(false), 900)
      return () => clearTimeout(timer)
    }
  }, [status])

  const variant =
    status === "defaulted" || status === "rejected"
      ? "destructive"
      : status === "active"
        ? "success"
        : status === "paid"
          ? "outline"
          : "warning"

  return (
    <Badge
      variant={variant}
      size={size}
      className={cn(
        "relative rounded-full font-semibold uppercase transition-all duration-300 px-2",
        className,
        animate && "animate-badge-change",
      )}
    >
      <span className="size-1.5 rounded-full bg-current shrink-0" />
      {statusLabels[status] ?? status}
    </Badge>
  )
}

export function InstallmentBadge({ status }: { status: string }) {
  const [animate, setAnimate] = useState(false)
  const prevStatusRef = useRef(status)

  useEffect(() => {
    if (prevStatusRef.current !== status) {
      setAnimate(true)
      prevStatusRef.current = status
      const timer = setTimeout(() => setAnimate(false), 900)
      return () => clearTimeout(timer)
    }
  }, [status])

  if (status === "paid") {
    return (
      <Badge variant="success" className={cn("relative", animate && "animate-badge-change")}>
        <CheckCircleIcon />
        Pagada
      </Badge>
    )
  }

  if (status === "overdue") {
    return (
      <Badge variant="destructive" className={cn("relative", animate && "animate-badge-change")}>
        <AlertCircleIcon />
        Vencida
      </Badge>
    )
  }

  if (status === "partial") {
    return (
      <Badge variant="warning" className={cn("relative", animate && "animate-badge-change")}>
        <ClockIcon />
        Parcial
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={cn("relative", animate && "animate-badge-change")}>
      <ClockIcon />
      Pendiente
    </Badge>
  )
}

export function VoucherStatusBadge({ status }: { status?: string }) {
  const currentStatus = status ?? "pending_investor_review"
  const [animate, setAnimate] = useState(false)
  const prevStatusRef = useRef(currentStatus)

  useEffect(() => {
    if (prevStatusRef.current !== currentStatus) {
      setAnimate(true)
      prevStatusRef.current = currentStatus
      const timer = setTimeout(() => setAnimate(false), 900)
      return () => clearTimeout(timer)
    }
  }, [currentStatus])

  const variant =
    currentStatus === "owner_approved" || currentStatus === "investor_approved"
      ? "success"
      : currentStatus === "owner_rejected" || currentStatus === "investor_rejected"
        ? "destructive"
        : "warning"

  return (
    <Badge
      variant={variant}
      className={cn(
        "relative transition-all duration-300",
        animate && "animate-badge-change",
      )}
    >
      {voucherStatusLabels[currentStatus] ?? currentStatus}
    </Badge>
  )
}
