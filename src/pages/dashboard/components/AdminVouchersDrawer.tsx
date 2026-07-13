import { ArrowRightIcon, ReceiptIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { VoucherStatusBadge } from "@/features/loans/components/LoanBadges"
import { useAllVouchersQuery } from "@/features/loans/loan-queries"
import { formatDate } from "@/features/loans/loan-utils"
import { useIsMobile } from "@/hooks/use-media-query"

export function AdminVouchersDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [sortOrder, setSortOrder] = useState<"Recientes" | "Antiguos">("Recientes")
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Reset page when drawer opens using render phase state update (React recommended way)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setPage(1)
    }
  }

  const { data, isLoading } = useAllVouchersQuery(
    {
      limit: 100,
      order: sortOrder === "Recientes" ? "desc" : "asc",
    },
    { enabled: open }
  )

  const vouchers = useMemo(() => {
    if (!data) return []
    const all = data.pages.flatMap((p) => p.vouchers)
    return all.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.operationDate || 0).getTime()
      const dateB = new Date(b.createdAt || b.operationDate || 0).getTime()
      return sortOrder === "Recientes" ? dateB - dateA : dateA - dateB
    })
  }, [data, sortOrder])

  const totalPages = Math.max(1, Math.ceil(vouchers.length / pageSize))
  const paginatedVouchers = useMemo(() => {
    return vouchers.slice((page - 1) * pageSize, page * pageSize)
  }, [vouchers, page])

  const handleVoucherClick = (loanId?: string) => {
    if (!loanId) return
    onOpenChange(false)
    navigate("/loans", { state: { selectedLoanId: loanId, appBackTarget: "/home" } })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup 
        showCloseButton={!isMobile} 
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 400, maxWidth: "100vw" } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ReceiptIcon className="size-5 text-primary" />
            Revisar Vouchers
          </DrawerTitle>
          <DrawerDescription>
            Lista de vouchers emitidos pendientes de revisión o historial general.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerPanel className="p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ordenar por emisión</span>
            <Select
              value={sortOrder}
              onValueChange={(val) => {
                setSortOrder(val as "Recientes" | "Antiguos")
                setPage(1)
              }}
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Recientes">Recientes</SelectItem>
                <SelectItem value="Antiguos">Antiguos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No hay vouchers pendientes por revisar.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {paginatedVouchers.map((voucher) => (
                <button
                  key={voucher.id}
                  type="button"
                  onClick={() => handleVoucherClick(voucher.loanId)}
                  className="flex flex-col gap-2 p-4 text-left bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-base">
                      <AnimatedNumber value={voucher.amount} isCurrency />
                    </span>
                    <VoucherStatusBadge status={voucher.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(voucher.createdAt || voucher.operationDate)}</span>
                    <span className="flex items-center gap-1 text-primary font-medium">
                      Ver préstamo <ArrowRightIcon className="size-3" />
                    </span>
                  </div>
                </button>
              ))}
              {totalPages > 1 && (
                <div className="pt-2">
                  <Pagination>
                    <PaginationContent className="w-full justify-between">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="text-xs font-medium text-muted-foreground">
                          Página {page} de {totalPages}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </DrawerPanel>

        <DrawerFooter variant="bare">
          <DrawerClose render={<Button variant="secondary" className="w-full" />}>
            Cerrar
          </DrawerClose>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}
