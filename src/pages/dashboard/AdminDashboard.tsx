import { FileTextIcon, PieChartIcon, ReceiptIcon, TrendingUpIcon, UsersIcon, WalletIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useAdminDashboardQuery } from "@/pages/dashboard/dashboard-queries"

export default function AdminDashboard() {
  const { user } = useAuth()
  const { data, isLoading, isError, error, refetch } = useAdminDashboardQuery()
  const navigate = useNavigate()

  if (isLoading) {
    return <AdminDashboardSkeleton />
  }

  if (isError) {
    return (
      <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <PieChartIcon className="size-7 text-destructive" />
          </div>
          <p className="font-bold text-lg">Error al cargar el dashboard</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {error instanceof Error ? error.message : "No se pudieron cargar las métricas. Intenta de nuevo."}
          </p>
          <Button onClick={() => refetch()} variant="default" className="mt-6 shadow-md">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const usersCount = data?.users?.totalUsers || 0
  const loansCount = data?.loans?.totalLoans || 0
  const capital = data?.loans?.totalPortfolio || 0
  const totalDebt = data?.loans?.totalDebt || 0
  const totalDebtAmount = parseFloat(String(totalDebt))
  const avance = totalDebtAmount > 0
    ? Math.round((parseFloat(String(capital)) / totalDebtAmount) * 100)
    : 0
  const vouchersCount = (data?.vouchers?.pendingInvestor || 0) + (data?.vouchers?.pendingAdmin || 0)

  const loansActive = data?.loans?.activeLoans || 0
  const loansMora = data?.overdue?.overdueCount || 0
  const pendingLoans = data?.loans?.pendingLoans || 0

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="flex items-center gap-5">
          <Avatar className="size-16 md:size-20 border-2 border-background shadow-md">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {user?.firstName?.[0] || "A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{user?.firstName} {user?.lastName}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="default" className="font-semibold">Administrador</Badge>
              {user?.isOwner && <Badge variant="secondary" className="font-semibold">Dueño</Badge>}
            </div>
          </div>
        </div>

        {vouchersCount > 0 && (
          <Button
            size="lg"
            variant="default"
            className="w-full md:w-auto shadow-md"
            onClick={() => navigate("/loans", { state: { adminView: "advanced", appBackTarget: "/home" } })}
          >
            <ReceiptIcon data-icon="inline-start" />
            Revisar Vouchers ({vouchersCount})
            <span className="ml-2 flex size-2 rounded-full bg-destructive animate-pulse" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-xl tracking-tight flex items-center gap-2">
          <PieChartIcon className="size-5 text-primary" />
          Visión General del Capital
        </h3>
        <Card className="bg-primary text-primary-foreground border-none shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-8 space-y-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Capital activo prestado</p>
              <div className="text-4xl md:text-5xl font-black tracking-tight">
                <AnimatedNumber value={capital} isCurrency />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="opacity-70">Capital vs deuda activa</span>
                <span><AnimatedNumber value={avance} decimals={0} suffix="%" /></span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={avance}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Capital vs deuda activa"
                className="w-full bg-white/20 h-3 rounded-full overflow-hidden"
              >
                <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${avance}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
              <div className="bg-white/10 p-4 rounded-2xl">
                <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Activos</div>
                <div className="text-2xl font-bold"><AnimatedNumber value={loansActive} /></div>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl">
                <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Mora</div>
                <div className="text-2xl font-bold"><AnimatedNumber value={loansMora} /></div>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl">
                <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Pendientes</div>
                <div className="text-2xl font-bold"><AnimatedNumber value={pendingLoans} /></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-xl tracking-tight">Métricas Operativas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<UsersIcon className="size-5 md:size-6 text-primary" />}
            value={<AnimatedNumber value={usersCount} />}
            label="Usuarios"
          />
          <MetricCard
            icon={<FileTextIcon className="size-5 md:size-6 text-primary" />}
            value={<AnimatedNumber value={loansCount} />}
            label="Préstamos"
          />
          <MetricCard
            icon={<TrendingUpIcon className="size-5 md:size-6 text-primary" />}
            value={<AnimatedNumber value={totalDebt} isCurrency />}
            label="Deuda activa"
          />
          <MetricCard
            icon={<WalletIcon className="size-5 md:size-6 text-primary" />}
            value={<AnimatedNumber value={avance} decimals={0} suffix="%" />}
            label="Eficiencia"
          />
        </div>
      </div>
    </div>
  )
}

function AdminDashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          <Skeleton className="size-16 rounded-full md:size-20" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-56 max-w-[60vw]" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-md md:w-48" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-7 w-64" />
        <Card className="border-none bg-primary/10 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-12 w-72 max-w-full" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-border/40 pt-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-2xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-7 w-44" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
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
      <CardContent className="p-5 flex flex-col space-y-4">
        <Skeleton className="size-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ icon, value, label }: { icon: React.ReactNode, value: React.ReactNode, label: string }) {
  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-3.5 sm:p-5 flex flex-col space-y-4">
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1 truncate">{label}</div>
          <div className="font-bold text-base sm:text-xl md:text-2xl leading-none tracking-tight whitespace-nowrap truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}
