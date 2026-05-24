import type { ElementType, ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"

export function AmountBlock({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-xl border bg-muted/35 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}

export function InfoRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: ElementType
  label: string
  value: ReactNode
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/50 transition-colors w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      {content}
    </div>
  )
}

export function SummaryMetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ElementType
  label: string
  value: ReactNode
  detail: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-bold tabular-nums tracking-normal">{value}</div>
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}
