import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

interface ResponsivePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function ResponsivePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: ResponsivePaginationProps) {
  if (totalPages <= 1) return null

  const getVisiblePages = (current: number, total: number) => {
    const maxVisible = 5
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    const pages: Array<number | "ellipsis"> = [1]
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)

    if (start > 2) pages.push("ellipsis")
    for (let page = start; page <= end; page++) {
      pages.push(page)
    }
    if (end < total - 1) pages.push("ellipsis")
    pages.push(total)
    return pages
  }

  const visiblePages = getVisiblePages(currentPage, totalPages)

  return (
    <nav
      aria-label="Paginación"
      className={cn("flex items-center justify-center gap-1.5 w-full mt-4", className)}
    >
      <Button
        variant="outline"
        className="rounded-full gap-1 min-w-9 px-3 sm:px-4 h-9 cursor-pointer"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeftIcon className="size-4 shrink-0" />
        <span className="hidden sm:inline">Anterior</span>
      </Button>

      <div className="flex items-center gap-1">
        {visiblePages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Button
              key={item}
              variant={item === currentPage ? "default" : "outline"}
              size="icon"
              aria-current={item === currentPage ? "page" : undefined}
              className={cn(
                "size-9 rounded-full font-medium transition-all duration-200 cursor-pointer",
                item === currentPage
                  ? "bg-slate-900 text-white hover:bg-slate-900/90 dark:bg-slate-50 dark:text-slate-900"
                  : "border-border hover:bg-muted"
              )}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          )
        )}
      </div>

      <Button
        variant="outline"
        className="rounded-full gap-1 min-w-9 px-3 sm:px-4 h-9 cursor-pointer"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRightIcon className="size-4 shrink-0" />
      </Button>
    </nav>
  )
}
