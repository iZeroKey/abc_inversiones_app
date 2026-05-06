import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { statusLabels, voucherStatusLabels } from "@/features/loans/loan-constants"

export function LoanStatusBadge({ status }: { status: string }) {
  const variant =
    status === "defaulted" || status === "rejected"
      ? "destructive"
      : status === "active"
        ? "success"
        : status === "paid"
          ? "outline"
          : "warning"

  return <Badge variant={variant}>{statusLabels[status] ?? status}</Badge>
}

export function InstallmentBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <Badge variant="success">
        <CheckCircleIcon />
        Pagada
      </Badge>
    )
  }

  if (status === "overdue") {
    return (
      <Badge variant="destructive">
        <AlertCircleIcon />
        Vencida
      </Badge>
    )
  }

  if (status === "partial") {
    return (
      <Badge variant="warning">
        <ClockIcon />
        Parcial
      </Badge>
    )
  }

  return (
    <Badge variant="outline">
      <ClockIcon />
      Pendiente
    </Badge>
  )
}

export function VoucherStatusBadge({ status }: { status?: string }) {
  const currentStatus = status ?? "pending_investor_review"
  const variant =
    currentStatus === "owner_approved" || currentStatus === "investor_approved"
      ? "success"
      : currentStatus === "owner_rejected" || currentStatus === "investor_rejected"
        ? "destructive"
        : "warning"

  return <Badge variant={variant}>{voucherStatusLabels[currentStatus] ?? currentStatus}</Badge>
}
