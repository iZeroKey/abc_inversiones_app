import {
  AlertCircleIcon,
  CheckIcon,
  CreditCardIcon,
  MoreHorizontalIcon,
  UserIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { UserDetailProfile } from "@/components/UserDetailSheet"
import { useAuth } from "@/contexts/auth-context"
import {
  InfoRow,
  LoanConditions,
  LoanSummaryBar,
  NextPaymentHero,
} from "@/features/loans/components/LoanMetricBits"
import { DetailSkeleton, EmptyDetail } from "@/features/loans/components/LoanPageStates"
import { PaymentsTable } from "@/features/loans/components/PaymentsTable"
import { ScheduleTable } from "@/features/loans/components/ScheduleTable"
import { VouchersTable } from "@/features/loans/components/VouchersTable"
import { usePaymentMutations } from "@/features/loans/hooks/usePaymentMutations"
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
  loanClientName,
  loanInvestorName,
  normalizeStatus,
} from "@/features/loans/loan-utils"
import { cn } from "@/lib/utils"
import type { Installment, Loan, Payment, PaymentVoucher } from "@/types/loans"

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
}) {
  const { user, session, fetchWithAuth } = useAuth()

  const mutations = usePaymentMutations({
    loan: loan as Loan,
    fetchWithAuth: fetchWithAuth!,
    session,
    onDataChanged,
    drawerWidth,
  })

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
        <div className="flex items-center gap-2 pb-5">
          {canRegisterPayment && (
            <Button size="sm" onClick={() => mutations.setPaymentDialogPayment(null)}>
              <CreditCardIcon data-icon="inline-start" />
              Registrar pago
            </Button>
          )}
          {canReview && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="Más acciones" />}>
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={onApprove}>
                    <CheckIcon />
                    Aprobar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onReject} className="text-destructive">
                    <XIcon />
                    Rechazar
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
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

        {/* ── Client: summary + conditions ── */}
        {perspective === "client" && (
          <>
            <SectionBlock>
              <LoanSummaryBar
                totalDebt={loan.totalDebt ?? 0}
                paidAmount={paidAmount}
                remaining={remaining}
                progress={progress}
                accent={accent}
              />
            </SectionBlock>
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
          </>
        )}

        {/* ── Admin: top grid ── */}
        {perspective === "admin" && (
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
              remaining={remaining}
              progress={progress}
              accent={accent}
            />
          </div>
        )}

        {/* ── Client: parties section ── */}
        {perspective === "client" && (
          <SectionBlock>
            <InfoRow
              icon={UserRoundIcon}
              label="Inversionista"
              value={isCompanyFunded ? "ABC Inversiones" : loanInvestorName(loan)}
              onClick={investorUser ? () => onUserClick?.(investorUser) : undefined}
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
              remaining={remaining}
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
                onClick={investorUser ? () => onUserClick?.(investorUser) : undefined}
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

        {/* ── Tabs ── */}
        <SectionBlock>
          <Tabs defaultValue={perspective === "investor" ? "vouchers" : "schedule"} className="min-h-0">
            <TabsList className="w-full overflow-x-auto">
              {perspective === "investor" ? (
                <>
                  <TabsTrigger value="vouchers" className="flex-1">Vouchers</TabsTrigger>
                  <TabsTrigger value="schedule" className="flex-1">Cronograma</TabsTrigger>
                  <TabsTrigger value="payments" className="flex-1">Pagos</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="schedule" className="flex-1">Cronograma</TabsTrigger>
                  <TabsTrigger value="payments" className="flex-1">Pagos</TabsTrigger>
                  {perspective === "admin" && (
                    <TabsTrigger value="vouchers" className="flex-1">Vouchers</TabsTrigger>
                  )}
                </>
              )}
            </TabsList>

            <TabsContent value="schedule">
              <ScheduleTable installments={relatedData.installments} />
            </TabsContent>
            <TabsContent value="payments">
              <PaymentsTable
                payments={relatedData.payments}
                vouchers={relatedData.vouchers}
                canManage={perspective === "admin"}
                showUnappliedVouchers
                canEditVoucher={(v) => canEditVoucher(v, perspective, user?.id)}
                canDeleteVoucher={(v) => canDeleteVoucher(v, perspective, user?.id)}
                canProcessVoucher={(v) => canProcessVoucher(v, loan, perspective, user?.id)}
                onEdit={mutations.setPaymentDialogPayment}
                onDelete={(payment) => mutations.setDeleteTarget({ type: "payment", item: payment, source: "list" })}
                onEditVoucher={mutations.setVoucherDialogVoucher}
                onDeleteVoucher={(voucher) => mutations.setDeleteTarget({ type: "voucher", item: voucher, source: "list" })}
                onApproveVoucher={(voucher) => mutations.setProcessDialog({ voucher, mode: "approve" })}
                onRejectVoucher={(voucher) => mutations.setProcessDialog({ voucher, mode: "reject" })}
              />
            </TabsContent>
            {(perspective === "admin" || perspective === "investor") && (
              <TabsContent value="vouchers">
                <VouchersTable
                  vouchers={relatedData.vouchers}
                  payments={relatedData.payments}
                  canDeletePayment={perspective === "admin"}
                  canEdit={(v) => canEditVoucher(v, perspective, user?.id)}
                  canDelete={(v) => canDeleteVoucher(v, perspective, user?.id)}
                  canProcess={(v) => canProcessVoucher(v, loan, perspective, user?.id)}
                  onEdit={mutations.setVoucherDialogVoucher}
                  onDelete={(voucher) => mutations.setDeleteTarget({ type: "voucher", item: voucher, source: "gallery" })}
                  onDeletePayment={(payment) => mutations.setDeleteTarget({ type: "payment", item: payment, source: "gallery" })}
                  onApprove={(voucher) => mutations.setProcessDialog({ voucher, mode: "approve" })}
                  onReject={(voucher) => mutations.setProcessDialog({ voucher, mode: "reject" })}
                  deleteTarget={mutations.deleteTarget}
                  submitting={mutations.submitting}
                  onCancelDelete={() => mutations.setDeleteTarget(null)}
                  onConfirmDelete={mutations.handleDeleteTarget}
                />
              </TabsContent>
            )}
          </Tabs>
        </SectionBlock>
      </div>

      {mutations.dialogElements}
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
