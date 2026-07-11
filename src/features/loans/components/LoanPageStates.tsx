import {
  AlertCircleIcon,
  CalendarClockIcon,
  CreditCardIcon,
  FileTextIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react"
import type { ElementType } from "react"

import { DataTableSkeleton } from "@/components/data-table-card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

export function LoanListSkeleton({
  variant = "cards",
}: {
  variant?: "cards" | "table"
}) {
  if (variant === "table") {
    return (
      <DataTableSkeleton
        rows={7}
        tableClassName="min-w-[1180px]"
        columns={[
          { className: "w-[4.5rem]", headerWidth: "w-10", cellWidth: "w-14" },
          { headerWidth: "w-28", cellWidth: "w-32" },
          { headerWidth: "w-28", cellWidth: "w-32" },
          { headerWidth: "w-28", cellWidth: "w-32" },
          { className: "text-right", headerWidth: "ml-auto w-24", cellWidth: "ml-auto w-28" },
          { className: "text-right", headerWidth: "ml-auto w-24", cellWidth: "ml-auto w-28" },
          { className: "text-right", headerWidth: "ml-auto w-20", cellWidth: "ml-auto w-24" },
          { className: "text-right", headerWidth: "ml-auto w-20", cellWidth: "ml-auto w-24" },
          { className: "text-right", headerWidth: "ml-auto w-12", cellWidth: "ml-auto w-14" },
          { headerWidth: "w-20", cellWidth: "w-24" },
          { className: "text-right", headerWidth: "ml-auto w-14", cellWidth: "ml-auto w-16" },
          { headerWidth: "w-28", cellWidth: "w-28" },
          { headerWidth: "w-24", cellWidth: "w-24" },
        ]}
      />
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex h-full w-full flex-col rounded-2xl bg-card shadow-xs/5 border-l-4 border-muted-foreground/20"
        >
          <div className="flex items-center justify-between gap-2 px-4 pt-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="mt-2 px-4">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 px-4">
            <div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1 h-5 w-24" />
            </div>
            <div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1 h-5 w-24" />
            </div>
          </div>
          <div className="mt-3 px-4">
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex-1" />
          <div className="mt-3 flex items-center justify-between gap-2 px-4 pb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-3.5 shrink-0" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 border-b pb-4">
        <Skeleton className="size-8 rounded-lg" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
      <DataTableSkeleton
        rows={4}
        tableClassName="min-w-[620px]"
        columns={[
          { headerWidth: "w-12", cellWidth: "w-12" },
          { headerWidth: "w-16", cellWidth: "w-20" },
          { headerWidth: "w-16", cellWidth: "w-24" },
          { headerWidth: "w-16", cellWidth: "w-24" },
          { headerWidth: "w-16", cellWidth: "w-20" },
        ]}
      />
    </div>
  )
}

export function EmptyLoanList({ message, title = "No hay préstamos" }: { message: string; title?: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <SearchIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function EmptyDetail() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <FileTextIcon />
        </EmptyMedia>
        <EmptyTitle>Selecciona un préstamo</EmptyTitle>
        <EmptyDescription>El detalle, cronograma y accesos relacionados aparecerán aquí.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <AlertCircleIcon />
        </EmptyMedia>
        <EmptyTitle>No se pudo cargar</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCwIcon data-icon="inline-start" />
          Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function CompactEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType
  title: string
  description: string
}) {
  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyMedia>
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export const relatedEmptyIcons = {
  schedule: CalendarClockIcon,
  payments: CreditCardIcon,
  vouchers: ShieldCheckIcon,
} as const
