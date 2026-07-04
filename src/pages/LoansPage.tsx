/* eslint-disable react-hooks/set-state-in-effect */
import { useQueryClient } from "@tanstack/react-query"
import { CheckIcon, PlusIcon, XIcon } from "lucide-react"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"

import { toastManager } from "@/components/ui/toast"
import { UserDetailSheet, type UserDetailProfile } from "@/components/UserDetailSheet"
import { useAuth } from "@/contexts/auth-context"

import { CreateLoanDialog } from "@/features/loans/components/CreateLoanDialog"
import { LoanStatusBadge } from "@/features/loans/components/LoanBadges"
import { LoanDetailPanel, type RelatedData } from "@/features/loans/components/LoanDetailPanel"
import { LoansListPanel } from "@/features/loans/components/LoansListPanel"
import { LoanSummaryCard } from "@/features/loans/components/LoanSummaryCard"
import { ReviewLoanDialog } from "@/features/loans/components/ReviewLoanDialog"
import { PAGE_SIZE } from "@/features/loans/loan-constants"
import { createDefaultLoanForm, type LoanFormState } from "@/features/loans/loan-form"
import {
  canCreateLoan,
  canReviewLoan,
  getLoanRole,
  getRoleCopy,
} from "@/features/loans/loan-permissions"
import {
  getAuthQueryScope,
  useLoanBundleQuery,
  useLoansQuery,
  useLoansSummaryQuery,
  useLoanTransactionsQuery,
  useLoanUsersByRoleQuery,
} from "@/features/loans/loan-queries"
import {
  getErrorMessage,
  getLoanPaidAmount, normalizeStatus
} from "@/features/loans/loan-utils"
import { useDrawerHistory } from "@/hooks/use-drawer-history"
import { useIsMobile } from "@/hooks/use-media-query"
import {
  approveLoan,
  createLoan,
  fetchLoanBundle,
  fetchUserById,
  rejectLoan,
} from "@/lib/loans-api"
import { queryKeys } from "@/lib/query-keys"
import type {
  Loan,
  LoanCreatePayload,
  LoanStatus,
  PaginationMeta,
  RelatedUser,
} from "@/types/loans"

const emptyRelatedData: RelatedData = {
  installments: [],
  payments: [],
  vouchers: [],
}

function withPaymentProgress(loan: Loan, installments: RelatedData["installments"] = []) {
  if (installments.length === 0) return loan
  return {
    ...loan,
    totalPaid: getLoanPaidAmount(loan, installments),
  }
}

export default function LoansPage() {
  const { user, session, fetchWithAuth } = useAuth()
  const queryClient = useQueryClient()
  const queryScope = useMemo(() => getAuthQueryScope(user), [user])
  const [drawerLoanId, setDrawerLoanId] = useState<string | null>(null)
  const loanId = drawerLoanId
  const location = useLocation()
  const role = getLoanRole(user)
  const roleCopy = getRoleCopy(role)
  const basePath = location.pathname.startsWith("/investments") ? "/investments" : "/loans"
  const routeState = location.state as { adminView?: string } | null
  const pageTitle = basePath === "/investments" ? "Inversiones" : roleCopy.title
  const isDetailOpen = Boolean(drawerLoanId)

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<"all" | LoanStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [manualSelectedLoanId, setManualSelectedLoanId] = useState<string | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [relatedData, setRelatedData] = useState<RelatedData>(emptyRelatedData)
  const [relatedDataLoanId, setRelatedDataLoanId] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewDialog, setReviewDialog] = useState<"approve" | "reject" | null>(null)
  const [rejectObservation, setRejectObservation] = useState("")
  const isMobile = useIsMobile()
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const loansQuery = useLoansQuery({
    limit: PAGE_SIZE,
    page,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: deferredSearchQuery || undefined,
  })
  const loans = useMemo(() => loansQuery.data?.loans ?? [], [loansQuery.data])
  const loadingList = loansQuery.isLoading || (loansQuery.isFetching && !loansQuery.data)
  const listError = loansQuery.error
    ? getErrorMessage(loansQuery.error, "No se pudieron cargar los préstamos.")
    : null


  useDrawerHistory(isDetailOpen, (open) => {
    if (!open) setDrawerLoanId(null)
  })

  const [submittingAction, setSubmittingAction] = useState(false)
  const [loanForm, setLoanForm] = useState<LoanFormState>(createDefaultLoanForm)
  const [creatingLoan, setCreatingLoan] = useState(false)
  const [clients, setClients] = useState<RelatedUser[]>([])
  const [investors, setInvestors] = useState<RelatedUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const adminView = routeState?.adminView === "advanced" ? "advanced" : "simple"
  const [selectedUserForSheet, setSelectedUserForSheet] = useState<UserDetailProfile | null>(null)
  const [newLoanIds, setNewLoanIds] = useState<Set<string>>(() => new Set())
  const summaryQuery = useLoansSummaryQuery()
  const clientsQuery = useLoanUsersByRoleQuery("client", {
    enabled: canCreateLoan(user) && createOpen,
  })
  const investorsQuery = useLoanUsersByRoleQuery("investor", {
    enabled: canCreateLoan(user) && createOpen,
  })

  const activeLoanLookup = loanId ?? manualSelectedLoanId
  const activeLoanIdRef = useRef<string | null>(loanId ?? null)
  const pendingDetailIdRef = useRef<string | null>(null)
  const visibleLoanIdsRef = useRef<Set<string>>(new Set())
  const newLoanTimeoutRef = useRef<number | undefined>(undefined)
  const highlightLoanIds = useCallback((ids: string[]) => {
    const highlightedIds = Array.from(new Set(ids.filter(Boolean)))
    if (highlightedIds.length === 0) return

    if (newLoanTimeoutRef.current !== undefined) {
      window.clearTimeout(newLoanTimeoutRef.current)
    }

    setNewLoanIds(new Set(highlightedIds))
    newLoanTimeoutRef.current = window.setTimeout(() => {
      setNewLoanIds(new Set())
      newLoanTimeoutRef.current = undefined
    }, 2200)
  }, [])
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
  const detailQuery = useLoanBundleQuery(detailLoanId, {
    enabled: Boolean(detailLoanId),
  })
  const transactionsQuery = useLoanTransactionsQuery(detailLoanId, { limit: 10 })
  const transactionsData = useMemo(() => {
    const raw = transactionsQuery.data?.pages.flatMap(p => p.data) ?? []
    const seen = new Set<string>()
    return raw.filter(t => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }, [transactionsQuery.data?.pages])
  
  const transactionsMeta = transactionsQuery.data?.pages[transactionsQuery.data.pages.length - 1]?.meta
  const loadingTransactions = transactionsQuery.isFetchingNextPage || transactionsQuery.isLoading
  const detailDataMatchesLoan = Boolean(detailLoanId && relatedDataLoanId === detailLoanId)
  const visibleRelatedData = detailDataMatchesLoan ? relatedData : emptyRelatedData
  const detailLoadingVisible = Boolean(
    loadingDetail ||
      (detailLoanId && (!selectedLoanMatchesLookup || !detailDataMatchesLoan)),
  )
  const paginatedLoans = loans
  const meta = loansQuery.data?.meta
  const pagination: PaginationMeta = useMemo(
    () => meta ?? { page, limit: PAGE_SIZE, total: 0, totalPages: 1 },
    [meta, page],
  )

  const rememberVisibleLoans = useCallback(
    (nextLoans: Loan[], highlightNew: boolean) => {
      const previousIds = visibleLoanIdsRef.current
      const nextIds = new Set(nextLoans.map((loan) => loan.id))
      const addedIds =
        highlightNew && previousIds.size > 0
          ? nextLoans
              .map((loan) => loan.id)
              .filter((id) => !previousIds.has(id))
          : []

      visibleLoanIdsRef.current = nextIds

      highlightLoanIds(addedIds)
    },
    [highlightLoanIds],
  )

  useEffect(() => {
    if (!loansQuery.data) return

    rememberVisibleLoans(loansQuery.data.loans, false)

    if (adminView === "advanced" && !activeLoanIdRef.current && loansQuery.data.loans[0]) {
      activeLoanIdRef.current = loansQuery.data.loans[0].id
      setManualSelectedLoanId(loansQuery.data.loans[0].id)
    }
  }, [adminView, loansQuery.data, rememberVisibleLoans])

  useEffect(() => {
    return () => {
      if (newLoanTimeoutRef.current !== undefined) {
        window.clearTimeout(newLoanTimeoutRef.current)
      }
    }
  }, [])

  const loadDetail = useCallback(
    async (id: string, fallbackLoan?: Loan | null, options?: { silent?: boolean }) => {
      if (!session?.access_token) return

      pendingDetailIdRef.current = id
      const silent = options?.silent ?? false

      if (!silent) {
        setLoadingDetail(true)
        setDetailError(null)
        setRelatedDataLoanId(null)
        setRelatedData(emptyRelatedData)
        if (fallbackLoan) {
          setSelectedLoan(fallbackLoan)
        }
      }

      try {
        const bundle = await queryClient.fetchQuery({
          queryFn: ({ signal }) => fetchLoanBundle(fetchWithAuth, id, { signal }),
          queryKey: queryKeys.loans.detail(queryScope, id),
        })

        if (pendingDetailIdRef.current !== id) return

        const installments = bundle.installments

        if (bundle.loan) {
          setSelectedLoan(withPaymentProgress(bundle.loan, installments))
        } else if (fallbackLoan) {
          setSelectedLoan(withPaymentProgress(fallbackLoan, installments))
        } else {
          throw new Error("No se pudo cargar el detalle del préstamo.")
        }

        setRelatedData({
          installments,
          payments: [],
          vouchers: [],
        })
        setRelatedDataLoanId(id)
      } catch (error) {
        if (pendingDetailIdRef.current !== id) return
        if (!silent) {
          setSelectedLoan(fallbackLoan ?? null)
          setRelatedDataLoanId(null)
          setDetailError(getErrorMessage(error, "No se pudo cargar el detalle del préstamo."))
        }
      } finally {
        if (!silent) {
          setLoadingDetail(false)
        }
      }
    },
    [fetchWithAuth, queryClient, queryScope, session?.access_token],
  )

  useEffect(() => {
    activeLoanIdRef.current = activeLoanLookup ?? null
  }, [activeLoanLookup])

  useEffect(() => {
    if (!detailLoanId || !detailQuery.data) return

    const detailLoan = detailQuery.data.loan ?? selectedLoanFromList
    if (detailLoan) {
      setSelectedLoan(withPaymentProgress(detailLoan, detailQuery.data.installments))
    }
    setRelatedData({
      installments: detailQuery.data.installments,
      payments: [],
      vouchers: [],
    })
    setRelatedDataLoanId(detailLoanId)
    setDetailError(null)
    setLoadingDetail(false)
  }, [detailLoanId, detailQuery.data, selectedLoanFromList])

  useEffect(() => {
    if (!detailLoanId || !detailQuery.error) return

    setDetailError(getErrorMessage(detailQuery.error, "No se pudo cargar el detalle del préstamo."))
    setLoadingDetail(false)
  }, [detailLoanId, detailQuery.error])

  useEffect(() => {
    if (adminView !== "advanced" || isDetailOpen || activeLoanIdRef.current || !loans[0]) return

    activeLoanIdRef.current = loans[0].id
    setManualSelectedLoanId(loans[0].id)
  }, [adminView, isDetailOpen, loans])

  useEffect(() => {
    if (!createOpen || !canCreateLoan(user)) return

    if (clientsQuery.data) setClients(clientsQuery.data)
    if (investorsQuery.data) setInvestors(investorsQuery.data)

    const loading = clientsQuery.isFetching || investorsQuery.isFetching
    setLoadingUsers(loading)
  }, [
    clientsQuery.data,
    clientsQuery.isFetching,
    createOpen,
    investorsQuery.data,
    investorsQuery.isFetching,
    user,
  ])

  const handleSelectLoan = (loan: Loan) => {
    if (activeLoanIdRef.current === loan.id && relatedDataLoanId === loan.id) return
    activeLoanIdRef.current = loan.id
    setManualSelectedLoanId(loan.id)
    setSelectedLoan(loan)
    setRelatedData(emptyRelatedData)
    setRelatedDataLoanId(null)
    setDetailError(null)
  }

  const handleOpenLoanDetail = (loan: Loan) => {
    const routeId = loan.publicCode || loan.id
    handleSelectLoan(loan)
    setDrawerLoanId(routeId)
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
      name: loanForm.name.trim() || undefined,
    }

    const principal = Number.parseFloat(payload.principal)
    const interestRate = Number.parseFloat(payload.interestRate)
    if (
      !payload.clientId ||
      !Number.isFinite(principal) ||
      principal <= 0 ||
      !Number.isFinite(interestRate) ||
      interestRate <= 0 ||
      !Number.isInteger(payload.installmentsCount) ||
      payload.installmentsCount <= 0
    ) {
      toastManager.add({
        type: "warning",
        title: "Revisa el formulario",
        description: "Cliente, monto principal, tasa y plazo son obligatorios.",
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
      setLoanForm(createDefaultLoanForm())

      if (createdLoan?.id) {
        const upsertCreatedLoan = (prevLoans: Loan[]) => [
          createdLoan,
          ...prevLoans.filter((loan) => loan.id !== createdLoan.id),
        ]
        queryClient.setQueriesData<{ loans: Loan[]; meta: PaginationMeta }>(
          { queryKey: ["abc", "loans", "list"] },
          (currentData) => {
            if (!currentData) return currentData
            return { ...currentData, loans: upsertCreatedLoan(currentData.loans) }
          },
        )
        setPage(1)
        visibleLoanIdsRef.current = new Set([
          createdLoan.id,
          ...visibleLoanIdsRef.current,
        ])
        highlightLoanIds([createdLoan.id])
        handleSelectLoan(createdLoan)
      } else {
        await loansQuery.refetch()
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.loans.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ])
      await loadDetail(visibleSelectedLoan.id, visibleSelectedLoan)
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

  const refreshSelectedLoanData = useCallback(async () => {
    const id = detailLoanId ?? visibleSelectedLoan?.id
    if (!id) return

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.list(queryScope) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.detail(queryScope, id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.list(queryScope, id) }),
    ])
    if (id) {
      await loadDetail(id, visibleSelectedLoan, { silent: true })
    }
  }, [detailLoanId, loadDetail, queryClient, queryScope, visibleSelectedLoan])

  return (
    <div>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
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
          {canCreateLoan(user) && (
            <Button className="max-sm:px-2" onClick={() => setCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              <span className="max-sm:hidden">Nuevo préstamo</span>
            </Button>
          )}
        </div>
      </header>

      <LoanSummaryCard
        summary={summaryQuery.data}
        loading={summaryQuery.isFetching}
        perspective={role}
      />

      <SimpleLoansWorkspace
        loans={paginatedLoans}
        highlightedLoanIds={newLoanIds}
        pagination={pagination}
        page={page}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        loadingList={loadingList}
        isFetchingList={loansQuery.isFetching}
        listError={listError}
        emptyMessage={roleCopy.empty}
        perspective={role}
        onRetryList={() => void loansQuery.refetch()}
        onOpenLoan={handleOpenLoanDetail}
        onPageChange={setPage}
        onStatusFilterChange={handleStatusFilterChange}
        onSearchQueryChange={setSearchQuery}
      />

      <Drawer
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) setDrawerLoanId(null)
        }}
        position={isMobile ? "bottom" : "right"}
      >
        <DrawerPopup
          showCloseButton={!isMobile}
          className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
          style={!isMobile ? { width: 760, maxWidth: "min(1080px, calc(100vw - 2rem))", minWidth: 560 } : undefined}
        >
          <DrawerHeader>
            <div className="flex items-center justify-between gap-2">
              <DrawerTitle className="text-lg font-semibold truncate">
                {visibleSelectedLoan?.name || "Detalle del préstamo"}
              </DrawerTitle>
              {visibleSelectedLoan && (
                <LoanStatusBadge
                  status={normalizeStatus(visibleSelectedLoan, visibleRelatedData?.installments)}
                />
              )}
            </div>
          </DrawerHeader>
          <DrawerPanel>
            <LoanDetailPanel
              loan={visibleSelectedLoan}
              relatedData={visibleRelatedData}
              loading={detailLoadingVisible || (loadingList && !visibleSelectedLoan)}
              error={detailError}
              canReview={canReviewLoan(visibleSelectedLoan, user)}
              basePath={basePath}
              perspective={role}
              onApprove={() => setReviewDialog("approve")}
              onReject={() => setReviewDialog("reject")}
              onRetry={() => detailLoanId && void loadDetail(detailLoanId, visibleSelectedLoan)}
              onDataChanged={refreshSelectedLoanData}
              sticky={false}
              drawerWidth={760}
              onBack={() => setDrawerLoanId(null)}
              transactions={transactionsData}
              transactionsMeta={transactionsMeta}
              loadingTransactions={loadingTransactions}
              onLoadMoreTransactions={() => transactionsQuery.fetchNextPage()}
            />
          </DrawerPanel>
          <DrawerFooter variant="bare">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                {canReviewLoan(visibleSelectedLoan, user) && (
                  <>
                    <Button variant="default" size="sm" onClick={() => setReviewDialog("approve")}>
                      <CheckIcon data-icon="inline-start" />
                      Aprobar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setReviewDialog("reject")}>
                      <XIcon data-icon="inline-start" />
                      Rechazar
                    </Button>
                  </>
                )}
              </div>
              <DrawerClose render={<Button variant="outline" />}>
                Cerrar
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerPopup>

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
      </Drawer>

      <CreateLoanDialog
        open={createOpen}
        form={loanForm}
        clients={clients}
        investors={investors}
        creating={creatingLoan}
        loadingUsers={loadingUsers}
        onOpenChange={setCreateOpen}
        onFormChange={setLoanForm}
        onSubmit={handleCreateLoan}
      />

      <UserDetailSheet
        user={selectedUserForSheet}
        onOpenChange={(open) => {
          if (!open) setSelectedUserForSheet(null)
        }}
        fetchUserById={(id) => fetchUserById(fetchWithAuth, id)}
      />
    </div>
    </div>
  )
}

function SimpleLoansWorkspace({
  loans,
  highlightedLoanIds,
  pagination,
  page,
  statusFilter,
  searchQuery,
  loadingList,
  isFetchingList,
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
  highlightedLoanIds?: Set<string>
  pagination: PaginationMeta
  page: number
  statusFilter: "all" | LoanStatus
  searchQuery: string
  loadingList: boolean
  isFetchingList?: boolean
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
        highlightedLoanIds={highlightedLoanIds}
        selectedLoan={null}
        pagination={pagination}
        page={page}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        loading={loadingList}
        isFetching={isFetchingList}
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
