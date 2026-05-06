import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toastManager } from "@/components/ui/toast"
import { AdminLoansOperationsPanel } from "@/features/loans/components/AdminLoansOperationsPanel"
import { CreateLoanDialog } from "@/features/loans/components/CreateLoanDialog"
import { LoanDetailPanel, type RelatedData } from "@/features/loans/components/LoanDetailPanel"
import { LoansListPanel, RefreshButton } from "@/features/loans/components/LoansListPanel"
import { ReviewLoanDialog } from "@/features/loans/components/ReviewLoanDialog"
import { defaultLoanForm, type LoanFormState } from "@/features/loans/loan-form"
import {
  canCreateLoan,
  canReviewLoan,
  getLoanRole,
  getRoleCopy,
} from "@/features/loans/loan-permissions"
import { PAGE_SIZE } from "@/features/loans/loan-constants"
import {
  createLoanSearchText,
  getErrorMessage,
} from "@/features/loans/loan-utils"
import { useAuth } from "@/contexts/auth-context"
import {
  approveLoan,
  createLoan,
  fetchLoanDetail,
  fetchLoanInstallments,
  fetchLoanPayments,
  fetchLoanVouchers,
  fetchLoans,
  fetchUsersByRole,
  rejectLoan,
} from "@/lib/loans-api"
import type {
  Loan,
  LoanCreatePayload,
  LoanStatus,
  PaginationMeta,
  RelatedUser,
} from "@/types/loans"

export default function LoansPage() {
  const { user, session, fetchWithAuth } = useAuth()
  const { loanId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const role = getLoanRole(user)
  const roleCopy = getRoleCopy(role)
  const basePath = location.pathname.startsWith("/investments") ? "/investments" : "/loans"
  const pageTitle = basePath === "/investments" ? "Inversiones" : roleCopy.title
  const isDetailRoute = Boolean(loanId)

  const [loans, setLoans] = useState<Loan[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<"all" | LoanStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [manualSelectedLoanId, setManualSelectedLoanId] = useState<string | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [relatedData, setRelatedData] = useState<RelatedData>({
    installments: [],
    payments: [],
    vouchers: [],
  })
  const [loadingList, setLoadingList] = useState(true)
  const [refreshingList, setRefreshingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewDialog, setReviewDialog] = useState<"approve" | "reject" | null>(null)
  const [rejectObservation, setRejectObservation] = useState("")
  const [submittingAction, setSubmittingAction] = useState(false)
  const [loanForm, setLoanForm] = useState<LoanFormState>(defaultLoanForm)
  const [creatingLoan, setCreatingLoan] = useState(false)
  const [clients, setClients] = useState<RelatedUser[]>([])
  const [investors, setInvestors] = useState<RelatedUser[]>([])
  const [adminView, setAdminView] = useState("simple")

  const activeLoanLookup = loanId ?? manualSelectedLoanId
  const activeLoanIdRef = useRef<string | null>(loanId ?? null)
  const selectedLoanFromList = useMemo(
    () =>
      loans.find(
        (loan) =>
          loan.id === activeLoanLookup ||
          loan.publicCode === activeLoanLookup,
      ) ?? null,
    [activeLoanLookup, loans],
  )
  const selectedLoanMatchesLookup =
    selectedLoan &&
    (!activeLoanLookup ||
      selectedLoan.id === activeLoanLookup ||
      selectedLoan.publicCode === activeLoanLookup)
  const visibleSelectedLoan = selectedLoanMatchesLookup ? selectedLoan : selectedLoanFromList
  const detailLoanId = selectedLoanFromList?.id ?? (activeLoanLookup && isUuid(activeLoanLookup) ? activeLoanLookup : null)
  const isAdminView = role === "admin"

  const filteredLoans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return loans

    return loans.filter((loan) => createLoanSearchText(loan).includes(query))
  }, [loans, searchQuery])

  const loadLoans = useCallback(
    async ({ keepContent = false }: { keepContent?: boolean } = {}) => {
      if (!session?.access_token) return

      if (keepContent) {
        setRefreshingList(true)
      } else {
        setLoadingList(true)
      }
      setListError(null)

      try {
        const loansResult = await fetchLoans(fetchWithAuth, {
          page,
          limit: PAGE_SIZE,
          status: statusFilter === "all" ? undefined : statusFilter,
          search: searchQuery.trim() || (loanId && !isUuid(loanId) ? loanId : undefined),
        })

        setLoans(loansResult.loans)
        setPagination(loansResult.meta)

        if (adminView === "advanced" && !activeLoanIdRef.current && loansResult.loans[0]) {
          activeLoanIdRef.current = loansResult.loans[0].id
          setManualSelectedLoanId(loansResult.loans[0].id)
        }
      } catch (error) {
        setListError(getErrorMessage(error, "No se pudieron cargar los préstamos."))
      } finally {
        setLoadingList(false)
        setRefreshingList(false)
      }
    },
    [adminView, fetchWithAuth, loanId, page, searchQuery, session?.access_token, statusFilter],
  )

  const loadDetail = useCallback(
    async (id: string) => {
      if (!session?.access_token) return

      setLoadingDetail(true)
      setDetailError(null)

      try {
        const [detailResult, installmentsResult, paymentsResult, vouchersResult] =
          await Promise.allSettled([
            fetchLoanDetail(fetchWithAuth, id),
            fetchLoanInstallments(fetchWithAuth, id),
            fetchLoanPayments(fetchWithAuth, id),
            fetchLoanVouchers(fetchWithAuth, id),
          ])

        if (detailResult.status === "fulfilled") {
          setSelectedLoan(detailResult.value ?? selectedLoanFromList)
        } else if (selectedLoanFromList) {
          setSelectedLoan(selectedLoanFromList)
        } else {
          throw detailResult.reason
        }

        setRelatedData({
          installments: installmentsResult.status === "fulfilled" ? installmentsResult.value : [],
          payments: paymentsResult.status === "fulfilled" ? paymentsResult.value : [],
          vouchers: vouchersResult.status === "fulfilled" ? vouchersResult.value : [],
        })
      } catch (error) {
        setSelectedLoan(selectedLoanFromList)
        setDetailError(getErrorMessage(error, "No se pudo cargar el detalle del préstamo."))
      } finally {
        setLoadingDetail(false)
      }
    },
    [fetchWithAuth, selectedLoanFromList, session?.access_token],
  )

  useEffect(() => {
    activeLoanIdRef.current = activeLoanLookup ?? null
  }, [activeLoanLookup])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLoans()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadLoans])

  useEffect(() => {
    if (!detailLoanId) return

    const timeoutId = window.setTimeout(() => {
      void loadDetail(detailLoanId)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [detailLoanId, loadDetail])

  useEffect(() => {
    if (adminView !== "advanced" || isDetailRoute || activeLoanIdRef.current || !loans[0]) return

    activeLoanIdRef.current = loans[0].id
    setManualSelectedLoanId(loans[0].id)
  }, [adminView, isDetailRoute, loans])

  useEffect(() => {
    if (!canCreateLoan(user) || !session?.access_token || !createOpen) return

    void Promise.allSettled([
      fetchUsersByRole(fetchWithAuth, "client"),
      fetchUsersByRole(fetchWithAuth, "investor"),
    ]).then(([clientsResult, investorsResult]) => {
      if (clientsResult.status === "fulfilled") setClients(clientsResult.value)
      if (investorsResult.status === "fulfilled") setInvestors(investorsResult.value)
    })
  }, [createOpen, fetchWithAuth, session?.access_token, user])

  const handleSelectLoan = (loan: Loan) => {
    activeLoanIdRef.current = loan.id
    setManualSelectedLoanId(loan.id)
  }

  const handleOpenLoanDetail = (loan: Loan) => {
    const routeId = loan.publicCode || loan.id
    navigate(`${basePath}/${routeId}`)
  }

  const handleStatusFilterChange = (nextStatus: "all" | LoanStatus) => {
    setStatusFilter(nextStatus)
    setPage(1)
  }

  const handleCreateLoan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const startDate = loanForm.startDate ? new Date(`${loanForm.startDate}T00:00:00`) : null
    if (!startDate || Number.isNaN(startDate.getTime())) {
      toastManager.add({
        type: "warning",
        title: "Fecha inválida",
        description: "Selecciona una fecha de inicio para calcular el cronograma.",
      })
      return
    }

    const payload: LoanCreatePayload = {
      clientId: loanForm.clientId.trim(),
      investorId: loanForm.investorId.trim() || undefined,
      principal: loanForm.principal,
      interestRate: loanForm.interestRate,
      installmentsCount: Number.parseInt(loanForm.installmentsCount, 10),
      frequency: loanForm.frequency,
      startDate: startDate.toISOString(),
      observation: loanForm.observation.trim() || undefined,
    }

    const principal = Number.parseFloat(payload.principal)
    if (!payload.clientId || !Number.isFinite(principal) || principal <= 0) {
      toastManager.add({
        type: "warning",
        title: "Revisa el formulario",
        description: "Cliente y monto principal son obligatorios.",
      })
      return
    }

    setCreatingLoan(true)
    try {
      const response = await createLoan(fetchWithAuth, payload)
      const createdLoan = response.data

      toastManager.add({
        type: "success",
        title: "Préstamo creado",
        description: "La solicitud quedó registrada para revisión.",
      })
      setCreateOpen(false)
      setLoanForm(defaultLoanForm)
      await loadLoans({ keepContent: true })

      if (createdLoan?.id) {
        handleSelectLoan(createdLoan)
      }
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo crear el préstamo",
        description: getErrorMessage(error, "Inténtalo nuevamente."),
      })
    } finally {
      setCreatingLoan(false)
    }
  }

  const handleReviewAction = async () => {
    if (!visibleSelectedLoan || !reviewDialog) return

    setSubmittingAction(true)
    try {
      if (reviewDialog === "approve") {
        await approveLoan(fetchWithAuth, visibleSelectedLoan.id)
      } else {
        await rejectLoan(fetchWithAuth, visibleSelectedLoan.id, rejectObservation)
      }

      toastManager.add({
        type: "success",
        title: reviewDialog === "approve" ? "Préstamo aprobado" : "Préstamo rechazado",
        description: "El estado se sincronizó con el servidor.",
      })
      setReviewDialog(null)
      setRejectObservation("")
      await Promise.all([loadLoans({ keepContent: true }), loadDetail(visibleSelectedLoan.id)])
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "No se pudo actualizar el préstamo",
        description: getErrorMessage(error, "El servidor rechazó la acción."),
      })
    } finally {
      setSubmittingAction(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-3 py-4 md:px-8 md:py-8">
      <header className="flex items-start justify-between gap-3 border-b border-border pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
              {pageTitle}
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {roleCopy.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <RefreshButton
            loading={loadingList || refreshingList}
            onClick={() => void loadLoans({ keepContent: true })}
          />
          {canCreateLoan(user) && (
            <Button className="max-sm:px-2" onClick={() => setCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              <span className="max-sm:hidden">Nuevo préstamo</span>
            </Button>
          )}
        </div>
      </header>

      {isDetailRoute ? (
        <LoanDetailRoute
          selectedLoan={visibleSelectedLoan}
          relatedData={relatedData}
          loadingDetail={loadingDetail || (loadingList && !visibleSelectedLoan)}
          detailError={detailError}
          canReview={canReviewLoan(visibleSelectedLoan, user)}
          basePath={basePath}
          perspective={role}
          onApprove={() => setReviewDialog("approve")}
          onReject={() => setReviewDialog("reject")}
          onRetryDetail={() => detailLoanId && void loadDetail(detailLoanId)}
        />
      ) : isAdminView ? (
        <Tabs value={adminView} onValueChange={setAdminView} className="gap-5">
          <TabsList className="w-full overflow-x-auto md:w-fit">
            <TabsTrigger value="simple" className="flex-1 md:flex-none">
              Vista simple
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex-1 md:flex-none">
              Vista avanzada
            </TabsTrigger>
          </TabsList>
          <TabsContent value="simple">
            <SimpleLoansWorkspace
              loans={filteredLoans}
              pagination={pagination}
              page={page}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              loadingList={loadingList}
              listError={listError}
              emptyMessage={roleCopy.empty}
              perspective={role}
              onRetryList={() => void loadLoans({ keepContent: true })}
              onOpenLoan={handleOpenLoanDetail}
              onPageChange={setPage}
              onStatusFilterChange={handleStatusFilterChange}
              onSearchQueryChange={setSearchQuery}
            />
          </TabsContent>
          <TabsContent value="advanced">
            <AdminLoansOperationsPanel
              loans={filteredLoans}
              selectedLoan={visibleSelectedLoan}
              pagination={pagination}
              page={page}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              loadingList={loadingList}
              listError={listError}
              emptyMessage={roleCopy.empty}
              relatedData={relatedData}
              loadingDetail={loadingDetail}
              detailError={detailError}
              canReview={canReviewLoan(visibleSelectedLoan, user)}
              basePath={basePath}
              onRetryList={() => void loadLoans({ keepContent: true })}
              onSelectLoan={handleSelectLoan}
              onPageChange={setPage}
              onStatusFilterChange={handleStatusFilterChange}
              onSearchQueryChange={setSearchQuery}
              onApprove={() => setReviewDialog("approve")}
              onReject={() => setReviewDialog("reject")}
              onRetryDetail={() => visibleSelectedLoan && void loadDetail(visibleSelectedLoan.id)}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <SimpleLoansWorkspace
          loans={filteredLoans}
          pagination={pagination}
          page={page}
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          loadingList={loadingList}
          listError={listError}
          emptyMessage={roleCopy.empty}
          perspective={role}
          onRetryList={() => void loadLoans({ keepContent: true })}
          onOpenLoan={handleOpenLoanDetail}
          onPageChange={setPage}
          onStatusFilterChange={handleStatusFilterChange}
          onSearchQueryChange={setSearchQuery}
        />
      )}

      <CreateLoanDialog
        open={createOpen}
        form={loanForm}
        clients={clients}
        investors={investors}
        creating={creatingLoan}
        onOpenChange={setCreateOpen}
        onFormChange={setLoanForm}
        onSubmit={handleCreateLoan}
      />

      <ReviewLoanDialog
        mode={reviewDialog}
        loan={visibleSelectedLoan}
        observation={rejectObservation}
        submitting={submittingAction}
        onObservationChange={setRejectObservation}
        onOpenChange={(open) => {
          if (!open) setReviewDialog(null)
        }}
        onConfirm={() => void handleReviewAction()}
      />
    </div>
  )
}

function LoanDetailRoute({
  selectedLoan,
  relatedData,
  loadingDetail,
  detailError,
  canReview,
  basePath,
  perspective,
  onApprove,
  onReject,
  onRetryDetail,
}: {
  selectedLoan: Loan | null
  relatedData: RelatedData
  loadingDetail: boolean
  detailError: string | null
  canReview: boolean
  basePath: string
  perspective: "admin" | "client" | "investor"
  onApprove: () => void
  onReject: () => void
  onRetryDetail: () => void
}) {
  return (
    <section className="mx-auto w-full max-w-5xl">
      <LoanDetailPanel
        loan={selectedLoan}
        relatedData={relatedData}
        loading={loadingDetail}
        error={detailError}
        canReview={canReview}
        basePath={basePath}
        perspective={perspective}
        onApprove={onApprove}
        onReject={onReject}
        onRetry={onRetryDetail}
        sticky={false}
      />
    </section>
  )
}

function SimpleLoansWorkspace({
  loans,
  pagination,
  page,
  statusFilter,
  searchQuery,
  loadingList,
  listError,
  emptyMessage,
  perspective,
  onRetryList,
  onOpenLoan,
  onPageChange,
  onStatusFilterChange,
  onSearchQueryChange,
}: {
  loans: Loan[]
  pagination: PaginationMeta
  page: number
  statusFilter: "all" | LoanStatus
  searchQuery: string
  loadingList: boolean
  listError: string | null
  emptyMessage: string
  perspective: "admin" | "client" | "investor"
  onRetryList: () => void
  onOpenLoan: (loan: Loan) => void
  onPageChange: (page: number) => void
  onStatusFilterChange: (status: "all" | LoanStatus) => void
  onSearchQueryChange: (query: string) => void
}) {
  return (
    <section className="w-full">
      <LoansListPanel
        loans={loans}
        selectedLoan={null}
        pagination={pagination}
        page={page}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        loading={loadingList}
        error={listError}
        emptyMessage={emptyMessage}
        perspective={perspective}
        onRetry={onRetryList}
        onSelectLoan={onOpenLoan}
        onPageChange={onPageChange}
        onStatusFilterChange={onStatusFilterChange}
        onSearchQueryChange={onSearchQueryChange}
      />
    </section>
  )
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
