import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import {
  getLoanPaidAmount,
  getLoanProgress,
  getRemainingDebt,
  toNumber,
} from "@/features/loans/loan-utils"
import { useIsMobile } from "@/hooks/use-media-query"
import {
  useClientDashboardQuery,
  type DashboardLoan as Loan,
} from "@/pages/dashboard/dashboard-queries"

import { motion } from "framer-motion"
import { ArrowRightIcon, CreditCardIcon, ReceiptTextIcon, WalletIcon } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"


import { Button } from "@/components/ui/button"
import { LoanCardRow } from "@/features/loans/components/LoansListPanel"

export default function ClientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: dashboardData, isLoading, isError, error, refetch } = useClientDashboardQuery()
  const data = dashboardData?.data ?? null
  const pendingInstallments = dashboardData?.pendingInstallments ?? 0

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-52" />
          </div>
          <Card className="border-none bg-primary/10 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div className="w-full space-y-3">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-12 md:h-14 w-64 max-w-full" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
                 <div className="flex flex-col justify-center text-center space-y-2">
                    <Skeleton className="size-8 md:size-10 mx-auto" />
                    <Skeleton className="h-3 w-16" />
                 </div>
                 <div className="space-y-2 w-full flex flex-col items-center sm:items-start">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-32" />
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t border-border/40 pt-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-border/40 mt-6 flex items-center justify-center">
                  <Skeleton className="h-4 w-40" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="col-span-2">
            <Card className="border-border overflow-hidden">
              <CardContent className="p-5 md:p-6 flex items-center gap-4">
                <Skeleton className="size-14 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 md:h-4 w-20" />
                  <Skeleton className="h-10 w-48 max-w-[50vw]" />
                </div>
              </CardContent>
            </Card>
          </div>
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <CreditCardIcon className="size-7 text-destructive" />
          </div>
          <p className="font-bold text-lg">Error al cargar tu panel</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {error instanceof Error ? error.message : "No se pudieron cargar tus préstamos. Intenta de nuevo."}
          </p>
          <Button onClick={() => refetch()} variant="default" className="mt-6">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const loans = data?.loans ?? []
  const summary = data?.summary || {}
  
  const activeLoans = loans.filter((loan) => loan.status === "active")
  const totalDebt = toNumber(summary.totalDebt)
  const totalPaid = toNumber(summary.totalPaid)
  const remainingDebt = Math.max(0, totalDebt - totalPaid)
  const mainLoan = activeLoans.length > 0 ? activeLoans[0] : null
  const otherLoans = activeLoans.length > 1 ? activeLoans.slice(1) : []

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Header Hero */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          ¡Hola, <span className="text-primary">{user?.firstName}</span>!
        </h2>
        <p className="text-sm text-muted-foreground font-medium">Aquí tienes el resumen de tus finanzas hoy.</p>
      </div>

      {/* Préstamo activo */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl tracking-tight">Tu Préstamo Principal</h3>
        </div>
        {mainLoan ? (
          <MainLoanCard loan={mainLoan} />
        ) : (
          <Card className="p-10 text-center border-dashed border-2 flex flex-col items-center justify-center bg-muted/20">
            <WalletIcon className="size-10 text-muted-foreground mb-3 opacity-20" />
            <p className="text-muted-foreground font-medium">No tienes préstamos activos en este momento</p>
          </Card>
        )}
      </div>

      {/* Metrics Grid */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={{ initial: {}, animate: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 gap-3 md:gap-4"
      >
        <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } }} className="col-span-2">
          <Card className="border-border overflow-hidden transition-all hover:shadow-md hover:-translate-y-1 group bg-linear-to-r from-card to-card/50">
            <CardContent className="p-5 md:p-6 flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
                <ReceiptTextIcon className="size-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Por pagar</div>
                <div className="font-black text-[clamp(1.5rem,5vw,2.5rem)] leading-none tracking-tight">
                  <AnimatedNumber value={remainingDebt} isCurrency />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } }}>
          <MetricCard 
            icon={<WalletIcon className="size-5 md:size-6 text-primary" />} 
            value={<AnimatedNumber value={loans.length} />} 
            label="Préstamos" 
          />
        </motion.div>
        <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } }}>
          <MetricCard 
            icon={<CreditCardIcon className="size-5 md:size-6 text-primary" />} 
            value={<AnimatedNumber value={pendingInstallments} />} 
            label="Cuotas" 
          />
        </motion.div>
      </motion.div>



      {/* Otros préstamos */}
      {otherLoans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xl tracking-tight">Otros Préstamos</h3>
            {activeLoans.length > 0 && (
              <Badge variant="secondary">{activeLoans.length} Activos</Badge>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {otherLoans.slice(0, 10).map((loan) => (
                <LoanCardRow
                  key={loan.id}
                  loan={loan as Parameters<typeof LoanCardRow>[0]["loan"]}
                  isNew={false}
                selected={false}
                onSelect={(l) => navigate("/loans", { state: { selectedLoanId: l.publicCode || l.id } })}
              />
            ))}
          </div>
          {otherLoans.length > 10 && (
            <div className="pt-2 flex justify-center">
              <Button variant="link" onClick={() => navigate("/loans")}>
                <span className="flex items-center gap-1">Ver todos los préstamos<ArrowRightIcon /></span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon, value, label }: { icon: React.ReactNode, value: React.ReactNode, label: string }) {
  return (
    <Card className="border-border overflow-hidden transition-all hover:shadow-md hover:-translate-y-1 group">
      <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-3">
        <div className="size-12 md:size-14 rounded-2xl bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
          {icon}
        </div>
        <div className="min-w-0 w-full">
          <div className="font-bold text-xl md:text-2xl leading-none tracking-tight wrap-break-word">{value}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1.5">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCardSkeleton() {
  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-3">
        <Skeleton className="size-12 md:size-14 rounded-2xl shrink-0" />
        <div className="space-y-2 w-full flex flex-col items-center">
          <Skeleton className="h-7 md:h-8 w-16" />
          <Skeleton className="h-3 md:h-3.5 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

function MainLoanCard({ loan }: { loan: Loan }) {
  const totalPaid = getLoanPaidAmount(loan)
  const remainingDebt = getRemainingDebt(loan)
  const progressPercent = getLoanProgress(loan)
  
  const frequencyMap: Record<string, string> = {
    daily: "Diario",
    weekly: "Semanal",
    biweekly: "Quincenal",
    monthly: "Mensual"
  }
  const cuotas = loan.installmentsCount || 0
  const normalizedFrequency = loan.frequency?.toLowerCase()
  const frecuencia = normalizedFrequency
    ? frequencyMap[normalizedFrequency] || loan.frequency || "N/A"
    : "N/A"
  const publicCode = loan.publicCode
  const isMobile = useIsMobile()

  return (
    <Link 
      to="/loans" 
      state={{ selectedLoanId: publicCode || loan.id }} 
      aria-label={`Ver préstamo ${publicCode ?? ""}`} 
      className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-3xl"
    >
      <Card className="relative overflow-hidden bg-primary text-primary-foreground border-none rounded-3xl shadow-md hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
        <CardContent className="p-5 sm:p-6 md:p-8 relative z-10 flex flex-col min-h-70">
          {/* Top Section */}
          <div className="mb-6 md:mb-8">
            <p className="text-[11px] font-semibold text-primary-foreground/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              Saldo Restante
            </p>
            <div className="text-4xl md:text-5xl font-black tracking-tighter">
              <AnimatedNumber value={remainingDebt} isCurrency isCompact={isMobile && remainingDebt >= 100000} />
            </div>
          </div>

          <div className="mt-auto space-y-8">
            {/* Progress Section */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-end px-0.5">
                <span className="text-[11px] font-bold text-primary-foreground/70 uppercase tracking-widest">Progreso del pago</span>
                <span className="text-sm font-black"><AnimatedNumber value={progressPercent} decimals={0} suffix="%" /></span>
              </div>
              <div className="h-2.5 w-full bg-black/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full relative transition-all duration-1000 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                >
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
               <div className="bg-white/10 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-center">
                 <p className="text-[10px] text-primary-foreground/70 font-bold uppercase tracking-widest mb-1">Pagado</p>
                 <div className="text-sm sm:text-base font-black truncate"><AnimatedNumber value={totalPaid} isCurrency isCompact={isMobile && totalPaid >= 10000} /></div>
               </div>
               <div className="bg-white/10 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-center">
                 <p className="text-[10px] text-primary-foreground/70 font-bold uppercase tracking-widest mb-1">Cuotas</p>
                 <div className="text-sm sm:text-base font-black truncate"><AnimatedNumber value={cuotas} /></div>
               </div>
               <div className="bg-white/10 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-center">
                 <p className="text-[10px] text-primary-foreground/70 font-bold uppercase tracking-widest mb-1">Tasa</p>
                 <div className="text-sm sm:text-base font-black truncate"><AnimatedNumber value={parseFloat(String(loan.interestRate || 0))} decimals={1} suffix="%" /></div>
               </div>
               <div className="bg-white/10 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-center relative overflow-hidden">
                 <p className="text-[10px] text-primary-foreground/70 font-bold uppercase tracking-widest mb-1">Freq.</p>
                 <div className="text-sm sm:text-base font-black truncate">{frecuencia}</div>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

