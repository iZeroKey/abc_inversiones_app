import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Badge } from "@/components/ui/badge"
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
      <div className="p-0 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
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

  return (
    <div className="p-0 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          ¡Hola, <span className="text-primary">{user?.firstName}</span>!
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-muted-foreground">Tu portafolio de inversiones.</p>
          <Badge variant="secondary" className="font-bold">Inversionista</Badge>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-xl tracking-tight flex items-center gap-2">
          <TrendingUpIcon className="size-5 text-primary" />
          Rendimiento General
        </h3>
        <Card className="bg-primary text-primary-foreground rounded-3xl overflow-hidden shadow-sm border-none">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-2">
                <p className="text-primary-foreground/70 font-semibold uppercase tracking-widest text-[10px]">Capital Invertido</p>
                <p className="text-4xl md:text-5xl font-black tabular-nums tracking-tight">
                  <AnimatedNumber value={totalInvested} isCurrency />
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">
                    <TrendingUpIcon className="size-3 mr-1" />
                    ROI <AnimatedNumber value={roi} isPercent />
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-primary-foreground/60 font-bold uppercase mb-1">Activos</p>
                  <p className="text-xl font-bold"><AnimatedNumber value={activeLoans} /></p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-primary-foreground/60 font-bold uppercase mb-1">Cobrado</p>
                  <p className="text-xl font-bold"><AnimatedNumber value={collectedAmount} isCurrency /></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-xl tracking-tight">Detalles</h3>
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ initial: {}, animate: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5"
        >
          <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } }}>
            <MetricCard
              icon={<TrendingUpIcon className="size-5 md:size-6 text-primary" />}
              label="Retorno Total"
              value={<AnimatedNumber value={totalReturn} isCurrency />}
              subValue={`${formatPercent(roi)} ROI`}
            />
          </motion.div>
          <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } }}>
            <MetricCard
              icon={<CheckSquareIcon className="size-5 md:size-6 text-primary" />}
              label="Préstamos Activos"
              value={<AnimatedNumber value={activeLoans} />}
              subValue="En curso"
            />
          </motion.div>
          <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } }}>
            <MetricCard
              icon={<WalletIcon className="size-5 md:size-6 text-primary" />}
              label="Cobrado"
              value={<AnimatedNumber value={collectedAmount} isCurrency />}
              subValue={`${progressPercent.toFixed(1)}% del total`}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

function InvestorDashboardSkeleton() {
  return (
    <div className="p-0 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
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

function MetricCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  subValue?: string
}) {
  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-xl font-bold tracking-tight">{value}</p>
            {subValue && <p className="text-[10px] text-primary font-semibold mt-1">{subValue}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
