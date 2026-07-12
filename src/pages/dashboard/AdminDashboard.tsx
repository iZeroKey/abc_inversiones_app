import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useAdminDashboardQuery } from "@/pages/dashboard/dashboard-queries"
import { motion } from "framer-motion"
import { PieChartIcon, ReceiptIcon, TrendingUpIcon, WalletIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

export default function AdminDashboard() {
  const { user } = useAuth()
  const { data, isLoading, isError, error, refetch } = useAdminDashboardQuery()
  const navigate = useNavigate()

  if (isLoading) {
    return <AdminDashboardSkeleton />
  }

  if (isError) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <PieChartIcon className="size-7 text-destructive" />
          </div>
          <p className="font-bold text-lg">Error al cargar el dashboard</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {error instanceof Error ? error.message : "No se pudieron cargar las métricas. Intenta de nuevo."}
          </p>
          <Button onClick={() => refetch()} variant="default" className="mt-6">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

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
  
  const nplRate = loansActive > 0 ? (loansMora / loansActive) * 100 : 0
  const collectedThisMonth = parseFloat(data?.payments?.collectedThisMonth || "0")

  const chartData = [
    { name: "Activos", value: loansActive, fill: "#10b981" },
    { name: "Mora", value: loansMora, fill: "#ef4444" },
    { name: "Pendientes", value: pendingLoans, fill: "#f59e0b" },
  ].filter(d => d.value > 0)
  
  if (chartData.length === 0) {
    chartData.push({ name: "Sin datos", value: 1, fill: "rgba(255,255,255,0.2)" })
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
        <div className="flex flex-row md:items-center gap-4 md:gap-5">
          <Avatar className="size-16 md:size-20 border-2 border-background shadow-md">
            <AvatarImage src={user?.avatarUrl || ""} alt={user?.firstName || "Usuario"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {user?.firstName?.[0] || "A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex flex-col items-start">
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
            className="w-full md:w-auto shadow-md min-h-11"
            onClick={() => navigate("/loans", { state: { appBackTarget: "/home" } })}
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
        <Card className="bg-primary text-primary-foreground border-none shadow-md rounded-3xl overflow-hidden relative">
          <CardContent className="p-6 md:p-8 space-y-8 relative z-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Capital activo prestado</p>
              <div className="text-4xl md:text-5xl font-black tracking-tight">
                <AnimatedNumber value={capital} isCurrency isCompact={Number(capital) >= 1000000} />
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

            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 pt-6 border-t border-white/10 items-center">
              <div className="size-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background/95 backdrop-blur-sm border border-border px-3 py-2 rounded-xl shadow-lg">
                              <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                                <p className="font-bold text-foreground text-xs">
                                  {payload[0].name}: <span className="font-black tracking-tight ml-1">{payload[0].value}</span>
                                </p>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                <div className="bg-white/10 p-3 sm:p-4 rounded-2xl flex sm:flex-col items-center sm:items-start justify-between sm:justify-center transition-transform hover:scale-[1.02]">
                  <div className="text-[10px] sm:text-xs font-bold uppercase opacity-90 sm:mb-1 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success" />
                    Activos
                  </div>
                  <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={loansActive} /></div>
                </div>
                <div className="bg-white/10 p-3 sm:p-4 rounded-2xl flex sm:flex-col items-center sm:items-start justify-between sm:justify-center transition-transform hover:scale-[1.02]">
                  <div className="text-[10px] sm:text-xs font-bold uppercase opacity-90 sm:mb-1 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-destructive" />
                    Mora
                  </div>
                  <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={loansMora} /></div>
                </div>
                <div className="bg-white/10 p-3 sm:p-4 rounded-2xl flex sm:flex-col items-center sm:items-start justify-between sm:justify-center transition-transform hover:scale-[1.02]">
                  <div className="text-[10px] sm:text-xs font-bold uppercase opacity-90 sm:mb-1 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-warning" />
                    Pendientes
                  </div>
                  <div className="text-xl sm:text-2xl font-bold"><AnimatedNumber value={pendingLoans} /></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-xl tracking-tight">Métricas Operativas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
            className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Card className="border-border overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 shrink-0 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <TrendingUpIcon className="size-5 text-destructive" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5 line-clamp-2 leading-tight">Tasa de Morosidad (NPL)</div>
                    <div className="font-black text-xl sm:text-2xl tracking-tight text-destructive"><AnimatedNumber value={nplRate} decimals={1} suffix="%" /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 shrink-0 rounded-xl bg-success/10 flex items-center justify-center">
                    <WalletIcon className="size-5 text-success" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5 line-clamp-2 leading-tight">Recaudado (Mes Actual)</div>
                    <div className="font-black text-xl sm:text-2xl tracking-tight text-success"><AnimatedNumber value={collectedThisMonth} isCurrency isCompact={collectedThisMonth >= 1000000} /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border overflow-hidden transition-all hover:shadow-md sm:col-span-2">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUpIcon className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5 line-clamp-2 leading-tight">Deuda Activa Circulante</div>
                    <div className="font-black text-xl sm:text-2xl tracking-tight"><AnimatedNumber value={totalDebt} isCurrency isCompact={totalDebtAmount >= 1000000} /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] } }}
          >
            <Card className="border-border overflow-hidden transition-all hover:shadow-md h-full flex flex-col justify-center relative">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Eficiencia de Cobro</h4>
                <div className="w-full relative my-2 flex justify-center">
                  <div className="w-50 h-25 overflow-hidden relative">
                    <div className="w-50 h-50">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: avance, fill: "var(--primary)" },
                              { value: 100 - avance, fill: "var(--muted)" }
                            ]}
                            cx="50%"
                            cy="50%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="70%"
                            outerRadius="95%"
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={5}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end">
                      <span className="text-4xl font-black leading-none text-primary"><AnimatedNumber value={avance} decimals={0} suffix="%" /></span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground max-w-50 leading-relaxed mt-auto">
                  Porcentaje del capital invertido respecto a la deuda generada activa.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
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

