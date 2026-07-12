import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { formatPercent } from "@/lib/formatters"
import { useInvestorDashboardQuery } from "@/pages/dashboard/dashboard-queries"
import { motion } from "framer-motion"
import { CheckSquareIcon, TrendingUpIcon, WalletIcon } from "lucide-react"


import { Button } from "@/components/ui/button"

export default function InvestorDashboard() {
  const { user } = useAuth()
  const { data: dashboardData, isLoading, isError, error, refetch } = useInvestorDashboardQuery()
  const data = dashboardData?.data ?? null
  const collectedAmount = dashboardData?.collectedAmount ?? 0

  if (isLoading) {
    return <InvestorDashboardSkeleton />
  }

  if (isError) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <TrendingUpIcon className="size-7 text-destructive" />
          </div>
          <p className="font-bold text-lg">Error al cargar el panel de inversión</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {error instanceof Error ? error.message : "No se pudieron cargar tus inversiones. Intenta de nuevo."}
          </p>
          <Button onClick={() => refetch()} variant="default" className="mt-6">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const summary = data?.summary || {}
  const totalInvested = parseFloat(summary.totalInvested || "0")
  const totalReturn = parseFloat(summary.totalReturn || "0")
  const activeLoans = summary.activeLoans || 0

  const roi = totalInvested > 0 ? ((totalReturn - totalInvested) / totalInvested) * 100 : 0

  const progressPercent = totalReturn > 0 ? (collectedAmount / totalReturn) * 100 : 0

  const chartData = [
    { name: "Cobrado", value: collectedAmount, color: "#10b981" },
    { name: "Por cobrar", value: Math.max(0, totalReturn - collectedAmount), color: "#3b82f6" },
  ].filter(d => d.value > 0)
  
  if (chartData.length === 0) {
    chartData.push({ name: "Sin datos", value: 1, color: "rgba(255,255,255,0.2)" })
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          ¡Hola, <span className="text-primary">{user?.firstName}</span>!
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-muted-foreground">Tu portafolio de inversiones.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-xl tracking-tight flex items-center gap-2">
          <TrendingUpIcon className="size-5 text-primary" />
          Rendimiento General
        </h3>
        <Card className="bg-primary text-primary-foreground rounded-3xl overflow-hidden shadow-md border-none relative">
          <CardContent className="p-6 md:p-8 relative z-10">
            <div className="flex flex-col md:flex-row gap-8 md:items-center justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-primary-foreground/70 font-bold uppercase tracking-widest text-[10px]">Capital Invertido</p>
                <p className="text-4xl md:text-5xl font-black tabular-nums tracking-tight">
                  <AnimatedNumber value={totalInvested} isCurrency />
                </p>
              </div>
              
              <div className="flex items-center gap-4 flex-1 w-full justify-start md:justify-end border-t border-white/10 md:border-none pt-6 md:pt-0">

                <div className="flex flex-col gap-3">
                  <div>
                     <p className="text-[10px] text-success font-bold uppercase mb-0.5 truncate">Cobrado</p>
                     <p className="text-lg font-bold leading-none"><AnimatedNumber value={collectedAmount} isCurrency /></p>
                  </div>
                  <div>
                     <p className="text-[10px] text-info font-bold uppercase mb-0.5 truncate">Por Cobrar</p>
                     <p className="text-lg font-bold leading-none"><AnimatedNumber value={Math.max(0, totalReturn - collectedAmount)} isCurrency /></p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-xl tracking-tight">Detalles del Portafolio</h3>
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ initial: {}, animate: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Main big card for Retorno and Cobrado */}
          <motion.div 
            variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } }}
            className="md:col-span-2"
          >
            <Card className="border-border overflow-hidden transition-all hover:shadow-md bg-card h-full">
              <CardContent className="p-6 md:p-8 flex flex-col justify-between h-full">
                <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TrendingUpIcon className="size-4 text-primary" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Retorno Total Esperado</span>
                    </div>
                    <div className="font-black text-3xl md:text-4xl tracking-tight wrap-break-word"><AnimatedNumber value={totalReturn} isCurrency /></div>
                    <div className="text-xs text-primary font-bold mt-1">+{formatPercent(roi)} rendimiento estimado</div>
                  </div>
                  <div className="sm:text-right">
                    <div className="flex items-center sm:justify-end gap-2 mb-2">
                      <div className="size-8 rounded-lg bg-success/10 flex items-center justify-center sm:hidden">
                        <WalletIcon className="size-4 text-success" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ya Cobrado</span>
                      <div className="size-8 rounded-lg bg-success/10 hidden sm:flex items-center justify-center">
                        <WalletIcon className="size-4 text-success" />
                      </div>
                    </div>
                    <div className="font-black text-2xl md:text-3xl tracking-tight text-success wrap-break-word"><AnimatedNumber value={collectedAmount} isCurrency /></div>
                  </div>
                </div>
                
                <div className="space-y-2 mt-auto">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground uppercase tracking-wider">Progreso de cobro</span>
                    <span><AnimatedNumber value={progressPercent} decimals={1} suffix="%" /></span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full bg-secondary h-3 rounded-full overflow-hidden"
                  >
                    <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } }}>
            <Card className="border-border overflow-hidden transition-all hover:shadow-md bg-linear-to-b from-card to-card/50 h-full flex flex-col justify-between">
              <CardContent className="p-6 md:p-8 relative z-10 flex flex-col h-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground">Préstamos Activos</span>
                    <CheckSquareIcon className="size-5 text-primary" />
                  </div>
                  <div className="font-black text-5xl md:text-6xl tracking-tighter"><AnimatedNumber value={activeLoans} /></div>
                </div>
                
                <div className="space-y-3 mt-auto pt-6 border-t border-border/40">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Al día</span>
                    <span className="font-bold">{activeLoans}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">En mora</span>
                    <span className="font-bold">0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>


    </div>
  )
}

function InvestorDashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-64 max-w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-56" />
        <Card className="border-none bg-primary/10 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-4 max-[480px]:p-4 sm:p-8">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-12 w-72 max-w-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-24" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCardSkeleton() {
  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

