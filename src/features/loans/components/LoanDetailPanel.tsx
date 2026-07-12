import { motion } from "framer-motion"
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CreditCardIcon,
  UserIcon,
} from "lucide-react"
import { useState, type ReactNode } from "react"

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
}

import { AnimatedNumber } from "@/components/AnimatedNumber"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { UserDetailDrawer, type UserDetailProfile } from "@/components/UserDetailDrawer"
import { useAuth } from "@/contexts/auth-context"
import { LoanStatusBadge } from "@/features/loans/components/LoanBadges"
import {
  InfoRow,
  LoanSummaryBar,
  NextPaymentHero,
} from "@/features/loans/components/LoanMetricBits"
import { DetailSkeleton, EmptyDetail } from "@/features/loans/components/LoanPageStates"
import { PaymentsGallery } from "@/features/loans/components/PaymentsGallery"
import { ScheduleDrawer } from "@/features/loans/components/ScheduleDrawer"
import { ScheduleTimeline } from "@/features/loans/components/ScheduleTimeline"
import { SectionBlock } from "@/features/loans/components/SectionBlock"
import { DelayedOpenGate, usePaymentMutations } from "@/features/loans/hooks/usePaymentMutations"
import { interestPeriodLabels } from "@/features/loans/loan-constants"
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
import { fetchUserById } from "@/lib/loans-api"
import { cn } from "@/lib/utils"
import type { Installment, Loan, LoanTransaction, PaginationMeta, Payment, PaymentVoucher } from "@/types/loans"

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

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
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
  onRetry,
  perspective = "admin",
  sticky = true,
  onDataChanged,
  drawerWidth,
  transactions,
  transactionsMeta,
  loadingTransactions,
  onLoadMoreTransactions,
}: {
  loan: Loan | null
  relatedData: RelatedData
  loading: boolean
  error: string | null
  onRetry: () => void
  perspective?: "admin" | "client" | "investor"
  sticky?: boolean
  drawerWidth?: number
  onDataChanged?: () => Promise<void> | void
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
  const [clientSheetUser, setClientSheetUser] = useState<UserDetailProfile | null>(null)
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

  const registerPaymentButton: ReactNode | null =
    perspective === "admin" && canRegisterPayment ? (
      <Button
        size="sm"
        className="bg-white text-primary hover:bg-white/90 rounded-xl px-6"
        onClick={() => mutations.setPaymentDialogPayment(null)}
      >
        <CreditCardIcon className="size-4" />
        Registrar pago
      </Button>
    ) : null

  return (
    <section
      className={cn(
        "min-w-0 transition-all duration-300 animate-in fade-in slide-in-from-left-6",
        sticky && "lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto",
      )}
    >
      <motion.div
        className="flex flex-col gap-6"
        variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
        initial="initial"
        animate="animate"
      >
        {error && (
          <motion.div variants={fadeIn} className="flex items-start gap-3 text-sm rounded-xl bg-destructive/5 p-3">
            <AlertCircleIcon className="mt-0.5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-destructive">Detalle parcial</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </motion.div>
        )}

        {/* ── Investor: pending review banner ── */}
        {perspective === "investor" && pendingVouchersCount > 0 && (
          <motion.div variants={fadeIn} className="flex items-center justify-between rounded-xl bg-warning/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-warning/10 text-warning">
                <span className="text-sm font-bold">{pendingVouchersCount}</span>
              </div>
              <div>
                <p className="text-sm font-medium">Vouchers por revisar</p>
                <p className="text-xs text-muted-foreground">Pendientes de aprobación</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => {}}>
              Revisar
            </Button>
          </motion.div>
        )}

        {/* ── Remaining balance + progress (all roles) ── */}
        <SectionBlock animate>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Saldo total pendiente</p>
              <LoanStatusBadge status={loanStatus} size="sm" />
            </div>
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

        {/* ── Next payment hero (all roles) ── */}
        <motion.div variants={fadeIn}>
          <NextPaymentHero
            amount={nextInstallment?.amount}
            dueDate={nextInstallment?.dueDate}
            canSubmitVoucher={canSubmitVoucher}
            onSubmitVoucher={() => mutations.setVoucherDialogVoucher(null)}
            intent="hero"
            actionButton={registerPaymentButton}
          />
        </motion.div>

        {/* ── Admin: parties section ── */}
        {perspective === "admin" && (
          <SectionBlock animate>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                icon={UserIcon}
                avatar={{ src: clientUser?.avatarUrl, initials: getInitials(loanClientName(loan)), name: loanClientName(loan) }}
                label="Cliente"
                value={loanClientName(loan)}
                onClick={clientUser ? () => setClientSheetUser(clientUser) : undefined}
              />
              <InfoRow
                icon={UserIcon}
                avatar={{ src: investorUser?.avatarUrl, initials: getInitials(isCompanyFunded ? "ABC Inversiones" : loanInvestorName(loan)), name: isCompanyFunded ? "ABC Inversiones" : loanInvestorName(loan) }}
                label="Inversionista"
                value={isCompanyFunded ? "ABC Inversiones" : loanInvestorName(loan)}
                onClick={!isCompanyFunded && investorUser ? () => setInvestorSheetUser(investorUser) : undefined}
              />
            </div>
          </SectionBlock>
        )}

        {/* ── Cronograma ── */}
        <SectionBlock animate>
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
        <SectionBlock animate>
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
      </motion.div>

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

      <DelayedOpenGate open={clientSheetUser !== null} onOpenChange={(open) => { if (!open) setClientSheetUser(null) }}>
        {(gateOpen, gateOnOpenChange) => (
          <UserDetailDrawer
            user={gateOpen ? clientSheetUser : null}
            onOpenChange={(open) => { if (!open) gateOnOpenChange(false) }}
            fetchUserById={(id) => fetchUserById(fetchWithAuth, id)}
          />
        )}
      </DelayedOpenGate>

      <DelayedOpenGate open={investorSheetUser !== null} onOpenChange={(open) => { if (!open) setInvestorSheetUser(null) }}>
        {(gateOpen, gateOnOpenChange) => (
          <UserDetailDrawer
            user={gateOpen ? investorSheetUser : null}
            onOpenChange={(open) => { if (!open) gateOnOpenChange(false) }}
            fetchUserById={(id) => fetchUserById(fetchWithAuth, id)}
          />
        )}
      </DelayedOpenGate>
    </section>
  )
}
