import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { WalletIcon, ReceiptTextIcon, CreditCardIcon, ChevronRightIcon } from "lucide-react"
import { formatCurrency, formatCurrencyPrecise } from "@/lib/formatters"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

type Loan = {
  id: string
  totalDebt?: string
  totalPaid?: string
  status?: string
  installmentsCount?: number
  interestRate?: string | number
  frequency?: string
}

type Installment = {
  id: string
  status?: string
}

type ClientStatement = {
  loans?: Loan[]
  summary?: {
    totalDebt?: string
    totalPaid?: string
  }
}

type ApiResponse<T> = {
  success: boolean
  data?: T
}

export default function ClientDashboard() {
  const { user, session, fetchWithAuth } = useAuth()
  const [data, setData] = useState<ClientStatement | null>(null)
  const [pendingInstallments, setPendingInstallments] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/reports/statement`)
        const json = (await res.json()) as ApiResponse<ClientStatement>
        if (json.success && json.data) {
          setData(json.data)
          const activeLoans = (json.data.loans ?? []).filter((loan) => loan.status === "active")
          const installmentResponses = await Promise.all(
            activeLoans.map(async (loan) => {
              const installmentRes = await fetchWithAuth(
                `${API_BASE_URL}/api/v1/loans/${loan.id}/installments`,
              )
              const installmentJson = (await installmentRes.json()) as ApiResponse<Installment[]>
              return installmentJson.success ? installmentJson.data ?? [] : []
            }),
          )
          setPendingInstallments(
            installmentResponses
              .flat()
              .filter((installment) => installment.status !== "paid").length,
          )
        }
      } catch (error) {
        console.error("Failed to fetch client statement", error)
      } finally {
        setLoading(false)
      }
    }
    if (session?.access_token) {
      fetchData()
    }
  }, [fetchWithAuth, session?.access_token])

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const loans = data?.loans ?? []
  const summary = data?.summary || {}
  
  const activeLoans = loans.filter((loan) => loan.status === "active")
  const totalDebt = parseFloat(summary.totalDebt || "0")
  const totalPaid = parseFloat(summary.totalPaid || "0")
  const remainingDebt = Math.max(0, totalDebt - totalPaid)
  const mainLoan = activeLoans.length > 0 ? activeLoans[0] : null
  const otherLoans = activeLoans.length > 1 ? activeLoans.slice(1) : []

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Header Hero */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          ¡Hola, <span className="text-primary">{user?.firstName}</span>!
        </h2>
        <p className="text-sm text-muted-foreground font-medium">Aquí tienes el resumen de tus finanzas hoy.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 md:gap-5">
        <MetricCard 
          icon={<WalletIcon className="size-5 md:size-6 text-primary" />} 
          value={loans.length} 
          label="Préstamos" 
        />
        <MetricCard 
          icon={<ReceiptTextIcon className="size-5 md:size-6 text-primary" />} 
          value={formatCurrency(remainingDebt)} 
          label="Por pagar" 
        />
        <MetricCard 
          icon={<CreditCardIcon className="size-5 md:size-6 text-primary" />} 
          value={pendingInstallments} 
          label="Cuotas" 
        />
      </div>

      {/* Préstamo activo */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl tracking-tight">Tu Préstamo Principal</h3>
          {activeLoans.length > 0 && (
            <Badge variant="secondary">{activeLoans.length} Activos</Badge>
          )}
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

      {/* Otros préstamos */}
      {otherLoans.length > 0 && (
        <div className="space-y-4 pb-8">
          <h3 className="font-bold text-lg tracking-tight">Otros Préstamos</h3>
          <div className="space-y-3">
            {otherLoans.map((loan) => (
              <OtherLoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon, value, label }: { icon: React.ReactNode, value: string | number, label: string }) {
  return (
    <Card className="border-border shadow-sm overflow-hidden">
      <CardContent className="p-4 md:p-5 flex flex-col items-center justify-center text-center space-y-3">
        <div className="size-12 md:size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="font-bold text-xl md:text-2xl leading-none tracking-tight">{value}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-widest mt-1.5">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function MainLoanCard({ loan }: { loan: Loan }) {
  const totalDebt = parseFloat(loan.totalDebt || "0")
  const totalPaid = parseFloat(loan.totalPaid || "0")
  const remainingDebt = Math.max(0, totalDebt - totalPaid)
  const progressPercent = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0
  
  const frequencyMap: Record<string, string> = {
    daily: "Diario",
    weekly: "Semanal",
    biweekly: "Quincenal",
    monthly: "Mensual"
  }
  const cuotas = loan.installmentsCount || 0
  const tasa = loan.interestRate ? `${loan.interestRate}%` : "0%"
  const normalizedFrequency = loan.frequency?.toLowerCase()
  const frecuencia = normalizedFrequency
    ? frequencyMap[normalizedFrequency] || loan.frequency || "N/A"
    : "N/A"

  return (
    <Link to={`/loans/${loan.id}`} className="block">
      <Card className="bg-primary text-primary-foreground shadow-lg border-none rounded-3xl overflow-hidden hover:opacity-95 transition-opacity">
        <CardContent className="p-8 space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Saldo Restante</p>
              <div className="text-4xl md:text-5xl font-black tracking-tight">
                S/ {formatCurrencyPrecise(remainingDebt)}
              </div>
            </div>
            <div className="size-10 rounded-full bg-white/10 flex items-center justify-center">
              <ChevronRightIcon className="size-5" />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="opacity-70">Progreso de pago</span>
              <span>{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
               <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-xs opacity-70">Pagado: S/ {formatCurrencyPrecise(totalPaid)}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
            <div>
              <div className="text-xl font-bold">{cuotas}</div>
              <div className="text-[10px] font-bold uppercase opacity-60">Cuotas</div>
            </div>
            <div>
              <div className="text-xl font-bold">{tasa}</div>
              <div className="text-[10px] font-bold uppercase opacity-60">Tasa</div>
            </div>
            <div>
              <div className="text-xl font-bold">{frecuencia}</div>
              <div className="text-[10px] font-bold uppercase opacity-60">Freq.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function OtherLoanCard({ loan }: { loan: Loan }) {
  const totalDebt = parseFloat(loan.totalDebt || "0")
  const totalPaid = parseFloat(loan.totalPaid || "0")
  const remainingDebt = Math.max(0, totalDebt - totalPaid)
  const progressPercent = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0
  const frequencyMap: Record<string, string> = {
    daily: "Diario",
    weekly: "Semanal",
    biweekly: "Quincenal",
    monthly: "Mensual"
  }
  const normalizedFrequency = loan.frequency?.toLowerCase()
  const frequency = normalizedFrequency
    ? frequencyMap[normalizedFrequency] || loan.frequency || "Mensual"
    : "Mensual"

  return (
    <Link to={`/loans/${loan.id}`} className="block group">
      <Card className="border-border shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
        <CardContent className="p-4 md:p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
               <ReceiptTextIcon className="size-6 text-primary" />
             </div>
             <div>
               <div className="font-bold tracking-tight">S/ {formatCurrencyPrecise(remainingDebt)}</div>
               <div className="text-xs text-muted-foreground font-medium mt-0.5">{frequency} • <span className="text-success font-bold">{progressPercent.toFixed(0)}% pagado</span></div>
             </div>
          </div>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  )
}
