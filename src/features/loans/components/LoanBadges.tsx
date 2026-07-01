import { motion } from "framer-motion"
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "lucide-react"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import { statusLabels, voucherStatusLabels } from "@/features/loans/loan-constants"
import { cn } from "@/lib/utils"

const badgeSpring = {
  scale: [1, 1.28, 0.9, 1.1, 0.96, 1],
  transition: { duration: 0.7, ease: [0.25, 1.3, 0.4, 1] },
}

function AnimatedBadgeWrapper({ status, children }: { status: string; children: React.ReactNode }) {
  return (
    <motion.span key={status} animate={badgeSpring} className="inline-flex">
      {children}
    </motion.span>
  )
}

export function LoanStatusBadge({
  status,
  size,
  className,
}: {
  status: string
  size?: BadgeProps["size"]
  className?: string
}) {
  const variant =
    status === "defaulted" || status === "rejected"
      ? "destructive"
      : status === "active"
        ? "success"
        : status === "paid"
          ? "outline"
          : "warning"

  return (
    <AnimatedBadgeWrapper status={status}>
      <Badge
        variant={variant}
        size={size}
        className={cn(
          "relative rounded-full font-semibold uppercase transition-all duration-300 px-2",
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-current shrink-0" />
        {statusLabels[status] ?? status}
      </Badge>
    </AnimatedBadgeWrapper>
  )
}

export function InstallmentBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <AnimatedBadgeWrapper status={status}>
        <Badge variant="success" className="relative">
          <CheckCircleIcon />
          Pagada
        </Badge>
      </AnimatedBadgeWrapper>
    )
  }

  if (status === "overdue") {
    return (
      <AnimatedBadgeWrapper status={status}>
        <Badge variant="destructive" className="relative">
          <AlertCircleIcon />
          Vencida
        </Badge>
      </AnimatedBadgeWrapper>
    )
  }

  if (status === "partial") {
    return (
      <AnimatedBadgeWrapper status={status}>
        <Badge variant="warning" className="relative">
          <ClockIcon />
          Parcial
        </Badge>
      </AnimatedBadgeWrapper>
    )
  }

  return (
    <AnimatedBadgeWrapper status={status}>
      <Badge variant="outline" className="relative">
        <ClockIcon />
        Pendiente
      </Badge>
    </AnimatedBadgeWrapper>
  )
}

export function VoucherStatusBadge({ status }: { status?: string }) {
  const currentStatus = status ?? "pending_investor_review"

  const variant =
    currentStatus === "owner_approved" || currentStatus === "investor_approved"
      ? "success"
      : currentStatus === "owner_rejected" || currentStatus === "investor_rejected" || currentStatus === "deleted" || currentStatus === "reversed"
        ? "destructive"
        : "warning"

  return (
    <AnimatedBadgeWrapper status={currentStatus}>
      <Badge
        variant={variant}
        className="relative transition-all duration-300"
      >
        {voucherStatusLabels[currentStatus] ?? currentStatus}
      </Badge>
    </AnimatedBadgeWrapper>
  )
}

export function PaymentStatusBadge({ status, className }: { status?: string, className?: string }) {
  const currentStatus = status ?? "confirmed"
  const variant = currentStatus === "reversed" ? "destructive" : "success"
  const label = currentStatus === "reversed" ? "Revertido" : "Aplicado"

  return (
    <AnimatedBadgeWrapper status={currentStatus}>
      <Badge
        variant={variant}
        className={cn("relative transition-all duration-300", className)}
      >
        {label}
      </Badge>
    </AnimatedBadgeWrapper>
  )
}
