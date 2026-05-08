import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckSquareIcon, TrendingUpIcon, WalletIcon } from "lucide-react"
import { formatCurrencyPrecise, formatPercent } from "@/lib/formatters"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

type InvestorPortfolio = {
  investments?: {
    loanId: string
  }[]
  summary?: {
    totalInvested?: string
    totalReturn?: string
    activeLoans?: number
  }
}

type Payment = {
  amount?: string
  status?: string
}

type ApiResponse<T> = {
  success: boolean
  data?: T
}

export default function InvestorDashboard() {
  const { user, session, fetchWithAuth } = useAuth()
  const [data, setData] = useState<InvestorPortfolio | null>(null)
  const [collectedAmount, setCollectedAmount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/reports/portfolio`)
        const json = (await res.json()) as ApiResponse<InvestorPortfolio>
        if (json.success && json.data) {
          setData(json.data)
          const paymentsByLoan = await Promise.all(
            (json.data.investments ?? []).map(async (investment) => {
              const paymentRes = await fetchWithAuth(
                `${API_BASE_URL}/api/v1/payments/loan/${investment.loanId}`,
              )
              const paymentJson = (await paymentRes.json()) as ApiResponse<Payment[]>
              return paymentJson.success ? paymentJson.data ?? [] : []
            }),
          )
          setCollectedAmount(
            paymentsByLoan
              .flat()
              .filter((payment) => payment.status === "confirmed")
              .reduce((total, payment) => total + parseFloat(payment.amount || "0"), 0),
          )
        }
      } catch (error) {
        console.error("Failed to fetch investor portfolio", error)
      } finally {
        setLoading(false)
      }
    }
    if (session?.access_token) {
      fetchData()
    }
  }, [fetchWithAuth, session?.access_token])

  if (loading) {
    return <InvestorDashboardSkeleton />
  }

  const summary = data?.summary || {}
  const totalInvested = parseFloat(summary.totalInvested || "0")
  const totalReturn = parseFloat(summary.totalReturn || "0")
  const activeLoans = summary.activeLoans || 0

  // Calculate ROI
  const roi = totalInvested > 0 ? ((totalReturn - totalInvested) / totalInvested) * 100 : 0

  const progressPercent = totalReturn > 0 ? (collectedAmount / totalReturn) * 100 : 0

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
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
        <Card className="bg-primary text-primary-foreground rounded-3xl overflow-hidden shadow-lg border-none">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-2">
                <p className="text-primary-foreground/70 font-semibold uppercase tracking-widest text-[10px]">Capital Invertido</p>
                <p className="text-4xl md:text-5xl font-black tabular-nums tracking-tight">
                  S/ {formatCurrencyPrecise(totalInvested)}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">
                    <TrendingUpIcon className="size-3 mr-1" />
                    ROI {formatPercent(roi)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-primary-foreground/60 font-bold uppercase mb-1">Activos</p>
                  <p className="text-xl font-bold">{activeLoans}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-primary-foreground/60 font-bold uppercase mb-1">Cobrado</p>
                  <p className="text-xl font-bold">S/ {formatCurrencyPrecise(collectedAmount)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-xl tracking-tight">Detalles</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          <MetricCard
            icon={<TrendingUpIcon className="size-5 md:size-6 text-primary" />}
            label="Retorno Total"
            value={`S/ ${formatCurrencyPrecise(totalReturn)}`}
            subValue={`${formatPercent(roi)} ROI`}
          />
          <MetricCard
            icon={<CheckSquareIcon className="size-5 md:size-6 text-primary" />}
            label="Préstamos Activos"
            value={activeLoans.toString()}
            subValue="En curso"
          />
          <MetricCard
            icon={<WalletIcon className="size-5 md:size-6 text-primary" />}
            label="Cobrado"
            value={`S/ ${formatCurrencyPrecise(collectedAmount)}`}
            subValue={`${progressPercent.toFixed(1)}% del total`}
          />
        </div>
      </div>
    </div>
  )
}

function InvestorDashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-64 max-w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-56" />
        <Card className="border-none bg-primary/10 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="p-8">
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
    <Card className="border-border shadow-sm overflow-hidden">
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
  value: string
  subValue?: string
}) {
  return (
    <Card className="border-border shadow-sm overflow-hidden">
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
