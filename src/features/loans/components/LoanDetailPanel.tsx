import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  MoreHorizontalIcon,
  UserIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserDetailSheet, type UserDetailProfile } from "@/components/UserDetailSheet"
import { useAuth } from "@/contexts/auth-context"
import {
  InfoRow,
  LoanConditions,
  LoanSummaryBar,
  NextPaymentHero,
} from "@/features/loans/components/LoanMetricBits"
import { interestPeriodLabels } from "@/features/loans/loan-constants"
import { DetailSkeleton, EmptyDetail } from "@/features/loans/components/LoanPageStates"
import { PaymentsGallery } from "@/features/loans/components/PaymentsGallery"
import { ScheduleDrawer } from "@/features/loans/components/ScheduleDrawer"
import { ScheduleTimeline } from "@/features/loans/components/ScheduleTimeline"
import { DelayedOpenGate, usePaymentMutations } from "@/features/loans/hooks/usePaymentMutations"
import {
  canDeleteVoucher,
  canEditVoucher,
  canProcessVoucher,
} from "@/features/loans/loan-permissions"
import {
  getLoanPaidAmount,
  getLoanProgress,
  getNextInstallment,
  getRemainingDebt,
  getVisibleInstallments,
  loanClientName,
  loanInvestorName,
  normalizeStatus,
} from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { Installment, Loan, PaginationMeta, Payment, PaymentVoucher, LoanTransaction } from "@/types/loans"

export type RelatedData = {
  installments: Installment[]
  payments: Payment[]
  vouchers: PaymentVoucher[]
}

const STATUS_ACCENT: Record<string, "success" | "warning" | "destructive" | "muted"> = {
  active: "success",
  defaulted: "destructive",
  overdue: "destructive",
  pending: "warning",
  paid: "muted",
  rejected: "muted",
}

function getStatusAccent(status: string) {
  return STATUS_ACCENT[status] ?? "muted"
}

function resolveClientUser(loan: Loan): UserDetailProfile | null {
  return loan.client ?? (loan.clientId || loan.clientName ? {
    id: loan.clientId ?? "",
    publicCode: loan.clientCode ?? null,
    firstName: loan.clientName?.split(/\s+/)[0] ?? loan.clientName ?? undefined,
    lastName: loan.clientName?.split(/\s+/).slice(1).join(" ") || undefined,
    role: "client",
  } : null)
}

function resolveInvestorUser(loan: Loan): UserDetailProfile | null {
  const isCompanyFunded = loan.isCompanyFunded || (!loan.investorId && !loan.investorName && !loan.investor)
  if (isCompanyFunded) return { id: "__company__", isCompany: true }
  return loan.investor ?? (loan.investorId || loan.investorName ? {
    id: loan.investorId ?? "",
    publicCode: loan.investorCode ?? null,
    firstName: loan.investorName?.split(/\s+/)[0] ?? loan.investorName ?? undefined,
    lastName: loan.investorName?.split(/\s+/).slice(1).join(" ") || undefined,
    role: "investor",
  } : null)
}

export function LoanDetailPanel({
  loan,
  relatedData,
  loading,
  error,
  canReview,
  onApprove,
  onReject,
  onRetry,
  perspective = "admin",
  sticky = true,
  onDataChanged,
  drawerWidth,
  onUserClick,
  transactions,
  transactionsMeta,
  loadingTransactions,
  onLoadMoreTransactions,
}: {
  loan: Loan | null
  relatedData: RelatedData
  loading: boolean
  error: string | null
  canReview: boolean
  basePath: string
  onApprove: () => void
  onReject: () => void
  onRetry: () => void
  perspective?: "admin" | "client" | "investor"
  sticky?: boolean
  hideBackButton?: boolean
  drawerWidth?: number
  onDataChanged?: () => Promise<void> | void
  onUserClick?: (user: UserDetailProfile) => void
  onBack?: () => void
  transactions?: LoanTransaction[]
  transactionsMeta?: PaginationMeta
  loadingTransactions?: boolean
  onLoadMoreTransactions?: () => void
}) {
  const { user, session, fetchWithAuth } = useAuth()

  const mutations = usePaymentMutations({
    loan: loan as Loan,
    fetchWithAuth: fetchWithAuth!,
    session,
    onDataChanged,
    drawerWidth,
  })

  const [showSchedule, setShowSchedule] = useState(false)
  const [investorSheetUser, setInvestorSheetUser] = useState<UserDetailProfile | null>(null)

  if (loading) {
    return (
      <section className="min-h-105">
        <DetailSkeleton />
      </section>
    )
  }

  if (!loan) {
    return (
      <section className="min-h-105">
        <EmptyDetail />
      </section>
    )
  }

  const paidAmount = getLoanPaidAmount(loan, relatedData.installments)
  const progress = getLoanProgress(loan, relatedData.installments)
  const remaining = getRemainingDebt(loan, relatedData.installments)
  const nextInstallment = getNextInstallment(relatedData.installments)
  const loanStatus = normalizeStatus(loan, relatedData.installments)
  const accent = getStatusAccent(loanStatus)
  const paymentAllowedStatuses = new Set(["active", "defaulted", "overdue"])
  const canSubmitVoucher = perspective === "client" && loan.status === "active"
  const canRegisterPayment = perspective === "admin" && paymentAllowedStatuses.has(loanStatus)

  const pendingVouchersCount = relatedData.vouchers.filter(
    (v) => v.status === "pending_investor_review" || v.status === "pending_admin_review",
  ).length

  const visibleInstallments = getVisibleInstallments(relatedData.installments)

  const clientUser = resolveClientUser(loan)
  const investorUser = resolveInvestorUser(loan)
  const isCompanyFunded = loan.isCompanyFunded || (!loan.investorId && !loan.investorName && !loan.investor)

  return (
    <section
      className={cn(
        "min-w-0 transition-all duration-300 animate-in fade-in slide-in-from-left-6",
        sticky && "lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto",
      )}
    >
      {/* ── Admin action buttons ── */}
      {perspective === "admin" && (canRegisterPayment || canReview) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-5">
          {canRegisterPayment && (
            <Button size="sm" className="w-full sm:w-auto" onClick={() => mutations.setPaymentDialogPayment(null)}>
              <CreditCardIcon data-icon="inline-start" />
              Registrar pago
            </Button>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-col gap-6">
        {error && (
          <div className="flex items-start gap-3 text-sm rounded-xl bg-destructive/5 p-3">
            <AlertCircleIcon className="mt-0.5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-destructive">Detalle parcial</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        )}

        {/* ── Investor: pending review banner ── */}
        {perspective === "investor" && pendingVouchersCount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-warning/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-warning/10 text-warning">
                <span className="text-sm font-bold">{pendingVouchersCount}</span>
              </div>
              <div>
                <p className="text-sm font-medium">Vouchers por revisar</p>
                <p className="text-xs text-muted-foreground">Pendientes de aprobación</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => {}}>
              Revisar
            </Button>
          </div>
        )}

        {/* ── Client: remaining + progress ── */}
        {perspective === "client" && (
          <SectionBlock>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Saldo total pendiente</p>
              <p className="text-3xl font-black tabular-nums tracking-tight text-foreground">
                <AnimatedNumber value={remaining} isCurrency />
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Capital <AnimatedNumber value={loan.principal} isCurrency /></span>
                {loan.interestRate != null && (
                  <>
                    <span>·</span>
                    <span>
                      <AnimatedNumber value={loan.interestRate} decimals={1} suffix="%" />
                      {" "}{interestPeriodLabels[String(loan.interestPeriod)] ?? ""}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="my-4 px-0">
              <Separator className="w-full" />
            </div>
            <LoanSummaryBar
              totalDebt={loan.totalDebt ?? 0}
              paidAmount={paidAmount}
              progress={progress}
              accent={accent}
            />
          </SectionBlock>
        )}

        {/* ── Client: hero card ── */}
        {perspective === "client" && (
          <NextPaymentHero
            amount={nextInstallment?.amount}
            dueDate={nextInstallment?.dueDate}
            canSubmitVoucher={canSubmitVoucher}
            onSubmitVoucher={() => mutations.setVoucherDialogVoucher(null)}
            intent="hero"
          />
        )}

        {/* ── Admin: top grid ── */}
        {perspective === "admin" && (
          <SectionBlock>
            <div className="grid gap-4 sm:grid-cols-2">
              <NextPaymentHero
                amount={nextInstallment?.amount}
                dueDate={nextInstallment?.dueDate}
                canSubmitVoucher={false}
                onSubmitVoucher={() => {}}
              />
              <LoanSummaryBar
                totalDebt={loan.totalDebt ?? 0}
                paidAmount={paidAmount}
                progress={progress}
                accent={accent}
              />
            </div>
          </SectionBlock>
        )}

        {/* ── Client: parties section ── */}
        {perspective === "client" && (
          <SectionBlock>
            <InfoRow
              icon={UserRoundIcon}
              label="Inversionista"
              value={isCompanyFunded ? "ABC Inversiones" : loanInvestorName(loan)}
              onClick={!isCompanyFunded && investorUser ? () => setInvestorSheetUser(investorUser) : undefined}
            />
          </SectionBlock>
        )}

        {/* ── Admin / Investor: conditions ── */}
        {(perspective === "admin" || perspective === "investor") && (
          <SectionBlock>
            <LoanConditions
              principal={loan.principal}
              installmentsCount={loan.installmentsCount}
              frequency={loan.frequency}
              interestRate={loan.interestRate}
              interestPeriod={loan.interestPeriod}
              startDate={loan.startDate}
            />
          </SectionBlock>
        )}

        {/* ── Investor: summary ── */}
        {perspective === "investor" && (
          <SectionBlock>
            <LoanSummaryBar
              totalDebt={loan.totalDebt ?? 0}
              paidAmount={paidAmount}
              progress={progress}
              accent={accent}
            />
          </SectionBlock>
        )}

        {/* ── Admin: parties section ── */}
        {perspective === "admin" && (
          <SectionBlock>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                icon={UserIcon}
                label="Cliente"
                value={loanClientName(loan)}
                onClick={clientUser ? () => onUserClick?.(clientUser) : undefined}
              />
              <InfoRow
                icon={UserRoundIcon}
                label="Inversionista"
                value={isCompanyFunded ? "ABC Inversiones" : loanInvestorName(loan)}
                onClick={!isCompanyFunded && investorUser ? () => setInvestorSheetUser(investorUser) : undefined}
              />
            </div>
          </SectionBlock>
        )}

        {/* ── Investor: parties section (client only) ── */}
        {perspective === "investor" && (
          <SectionBlock>
            <InfoRow
              icon={UserIcon}
              label="Cliente"
              value={loanClientName(loan)}
              onClick={clientUser ? () => onUserClick?.(clientUser) : undefined}
            />
          </SectionBlock>
        )}

        {/* ── Cronograma ── */}
        <SectionBlock>
          <h3 className="text-sm font-semibold text-foreground mb-3">Cronograma</h3>
          <ScheduleTimeline installments={visibleInstallments.visible} />
          {visibleInstallments.hasMore && (
            <div className="flex justify-center mt-3">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors cursor-pointer"
                onClick={() => setShowSchedule(true)}
              >
                Ver cronograma completo
                <ArrowRightIcon className="size-4" />
              </button>
            </div>
          )}
        </SectionBlock>

        {/* ── Pagos y Vouchers ── */}
        <SectionBlock>
          <h3 className="text-sm font-semibold text-foreground mb-3">Pagos</h3>
          <PaymentsGallery
            transactions={transactions ?? []}
            canManage={perspective === "admin"}
            canEditVoucher={(v) => canEditVoucher(v, perspective, user?.id)}
            canDeleteVoucher={(v) => canDeleteVoucher(v, perspective, user?.id)}
            canProcessVoucher={(v) => canProcessVoucher(v, loan, perspective, user?.id)}
            onEdit={mutations.setPaymentDialogPayment}
            onDelete={(payment) => mutations.setDeleteTarget({ type: "payment", item: payment, source: "list" })}
            onEditVoucher={mutations.setVoucherDialogVoucher}
            onDeleteVoucher={(voucher) => mutations.setDeleteTarget({ type: "voucher", item: voucher, source: "list" })}
            onApproveVoucher={(voucher) => mutations.setProcessDialog({ voucher, mode: "approve" })}
            onRejectVoucher={(voucher) => mutations.setProcessDialog({ voucher, mode: "reject" })}
            drawerWidth={drawerWidth}
            dialogElements={mutations.dialogElements}
            transactionsMeta={transactionsMeta}
            loadingTransactions={loadingTransactions}
            onLoadMoreTransactions={onLoadMoreTransactions}
            lastMutatedItem={mutations.lastMutatedItem}
          />
        </SectionBlock>
      </div>

      <DelayedOpenGate open={showSchedule} onOpenChange={setShowSchedule}>
        {(gateOpen, gateOnOpenChange) => (
          <ScheduleDrawer
            open={gateOpen}
            installments={relatedData.installments}
            onOpenChange={gateOnOpenChange}
            drawerWidth={drawerWidth}
          />
        )}
      </DelayedOpenGate>

      <DelayedOpenGate open={investorSheetUser !== null} onOpenChange={(open) => { if (!open) setInvestorSheetUser(null) }}>
        {(gateOpen, gateOnOpenChange) => (
          <UserDetailSheet
            user={gateOpen ? investorSheetUser : null}
            onOpenChange={(open) => { if (!open) gateOnOpenChange(false) }}
          />
        )}
      </DelayedOpenGate>
    </section>
  )
}

function SectionBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 rounded-xl p-4">
      {children}
    </div>
  )
}
