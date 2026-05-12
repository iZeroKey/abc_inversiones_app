export type UserRole = "admin" | "client" | "investor"
export type MaritalStatus = "single" | "married" | "unspecified"

export type LoanStatus =
  | "pending"
  | "pending_investor_review"
  | "approved"
  | "active"
  | "paid"
  | "defaulted"
  | "rejected"
  | "cancelled"

export type InstallmentStatus = "pending" | "paid" | "overdue" | "partial" | string

export type InterestType = "simple" | "compound" | string
export type InterestPeriod = "daily" | "weekly" | "monthly" | "annual" | string
export type LoanFrequency = "daily" | "weekly" | "biweekly" | "monthly" | string

export type RelatedUser = {
  id: string
  authUserId?: string | null
  publicCode?: string | null
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  dni?: string | null
  address?: string | null
  bank?: string | null
  bankAccounts?: string[]
  maritalStatus?: MaritalStatus | null
  avatarUrl?: string | null
  avatar?: string | null
  role?: UserRole | string
  active?: boolean
  isOwner?: boolean
}

export type Loan = {
  id: string
  publicCode?: string | null
  clientId?: string
  clientCode?: string | null
  investorId?: string | null
  investorCode?: string | null
  principal?: string | number
  totalDebt?: string | number
  totalPaid?: string | number
  interestRate?: string | number
  interestType?: InterestType
  interestPeriod?: InterestPeriod
  installmentsCount?: number
  frequency?: LoanFrequency
  paymentDay?: number
  startDate?: string
  endDate?: string | null
  status?: LoanStatus | string
  observation?: string | null
  createdAt?: string
  updatedAt?: string
  approvedAt?: string | null
  rejectedAt?: string | null
  client?: RelatedUser | null
  investor?: RelatedUser | null
  clientName?: string
  investorName?: string
}

export type LoanSummary = {
  totalLoans?: number
  total?: number
  activeLoans?: number
  active?: number
  paidLoans?: number
  paid?: number
  defaultedLoans?: number
  defaulted?: number
  overdueLoans?: number
  pendingLoans?: number
  pending?: number
  totalDebt?: string | number
  debt?: string | number
  totalPaid?: string | number
  paidAmount?: string | number
  nextPayment?:
    | string
    | number
    | null
    | {
        dueDate?: string
        amount?: string | number
      }
  nextPaymentDate?: string | null
  overduePayments?: number
  overdueAmount?: string | number
}

export type AdminLoanSummaryRow = {
  id: string
  publicCode?: string
  clientId?: string
  clientCode?: string
  clientName?: string
  investorCode?: string | null
  investorName?: string | null
  creditDate?: string | null
  principal?: string | number
  frequency?: LoanFrequency
  interestRate?: string | number
  paidAmount?: string | number
  totalInterest?: string | number
  remainingDebt?: string | number
  remainingInstallments?: number
  totalDebt?: string | number
  status?: LoanStatus | string
  createdAt?: string
}

export type Installment = {
  id: string
  loanId?: string
  installmentNumber?: number
  number?: number
  dueDate?: string
  amount?: string | number
  paidAmount?: string | number
  status?: InstallmentStatus
  paymentDate?: string | null
}

export type Payment = {
  id: string
  loanId?: string
  installmentId?: string | null
  amount?: string | number
  method?: string
  status?: string
  reference?: string | null
  paymentDate?: string
  createdAt?: string
}

export type PaymentVoucher = {
  id: string
  loanId?: string
  paymentId?: string | null
  amount?: string | number
  operationId?: string
  status?: string
  evidenceUrl?: string | null
  fileUrl?: string | null
  createdAt?: string
}

export type PaginationMeta = {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
}

export type ApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
  meta?: PaginationMeta & {
    timestamp?: string
    pagination?: PaginationMeta
  }
}

export type LoanCreatePayload = {
  clientId: string
  investorId?: string
  principal: string
  interestRate: string
  installmentsCount: number
  frequency: string
  startDate: string
  observation?: string
}
