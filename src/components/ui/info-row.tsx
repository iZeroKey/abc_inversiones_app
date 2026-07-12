import { cn } from "@/lib/utils"
import { useState, type ReactNode } from "react"

export function InfoRow({
  icon,
  label,
  value,
  mono = false,
  truncate = false,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  mono?: boolean
  truncate?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className="flex items-center gap-3 min-w-0 w-full">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">{label}</p>
        <p 
          onClick={() => truncate && setExpanded(!expanded)}
          className={cn(
            "text-sm font-semibold transition-colors",
            mono && "font-mono",
            truncate && !expanded ? "truncate cursor-pointer hover:text-foreground/80" : truncate && expanded ? "break-all cursor-pointer hover:text-foreground/80" : "wrap-break-word"
          )}
          title={truncate && typeof value === "string" ? (!expanded ? "Toca para expandir" : "Toca para ocultar") : undefined}
        >
          {value}
        </p>
      </div>
    </div>
  )
}
