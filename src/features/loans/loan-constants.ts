import type { LoanStatus } from "@/types/loans";

export const PAGE_SIZE = 8;

export const statusFilters: Array<{
  value: "all" | LoanStatus;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "pending_investor_review", label: "Pendientes" },
  { value: "active", label: "Activos" },
  { value: "paid", label: "Pagados" },
  { value: "defaulted", label: "Vencidos" },
  { value: "rejected", label: "Rechazados" },
];

export const statusLabels: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  pending_investor_review: "Pendiente",
  pending_admin_review: "Revisión admin",
  approved: "Aprobado",
  active: "Activo",
  paid: "Pagado",
  defaulted: "Vencido",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

export const frequencyLabels: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

export const interestPeriodLabels: Record<string, string> = {
  daily: "diaria",
  weekly: "semanal",
  monthly: "mensual",
  annual: "anual",
};

export const installmentStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Pagado",
  overdue: "Vencido",
};

export const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  deposit: "Depósito",
  other: "Otro",
};

export const voucherStatusLabels: Record<string, string> = {
  draft: "Borrador",
  pending_investor_review: "Pendiente",
  pending_admin_review: "Revisión admin",
  investor_approved: "Aprobado por inversionista",
  investor_rejected: "Rechazado por inversionista",
  owner_approved: "Aprobado",
  owner_rejected: "Rechazado",
};
