import type { Loan, PaymentVoucher } from "@/types/loans";

type AuthUser = {
  id?: string;
  role?: string;
  isOwner?: boolean;
} | null;

export type LoanRole = "admin" | "client" | "investor";

export function isAdminUser(user: AuthUser) {
  return user?.role === "admin" || Boolean(user?.isOwner);
}

export function getLoanRole(user: AuthUser): LoanRole {
  if (isAdminUser(user)) return "admin";
  if (user?.role === "investor") return "investor";
  return "client";
}

export function getRoleCopy(role: LoanRole) {
  if (role === "admin") {
    return {
      title: "Préstamos",
      description:
        "Gestiona la cartera completa, crea préstamos y revisa acciones operativas.",
      empty: "Crea un préstamo o cambia los filtros para revisar la cartera.",
    };
  }

  if (role === "investor") {
    return {
      title: "Inversiones",
      description:
        "Consulta préstamos asignados y revisa solicitudes pendientes cuando corresponda.",
      empty:
        "Tus inversiones asignadas aparecerán aquí cuando estén disponibles.",
    };
  }

  return {
    title: "Mis préstamos",
    description:
      "Consulta tu deuda, cronograma, pagos registrados y vouchers vinculados.",
    empty: "Cuando tengas préstamos asignados, aparecerán en esta vista.",
  };
}

export function canCreateLoan(user: AuthUser) {
  return isAdminUser(user);
}

export function canReviewLoan(loan: Loan | null, user: AuthUser) {
  if (!loan) return false;
  const isReviewable =
    loan.status === "pending" ||
    loan.status === "pending_investor_review" ||
    loan.status === "pending_admin_review";

  if (!isReviewable) return false;
  if (isAdminUser(user)) return true;
  return (
    user?.role === "investor" &&
    Boolean(loan.investorId) &&
    loan.investorId === user.id
  );
}

export function canRegisterPayment(loan: Loan | null, user: AuthUser) {
  return isAdminUser(user) && loan?.status === "active";
}

export function canUploadVoucher(loan: Loan | null, user: AuthUser) {
  return user?.role === "client" && loan?.status === "active";
}

function isPendingVoucherForClient(voucher: PaymentVoucher) {
  return ["draft", "pending_investor_review", "pending_admin_review"].includes(voucher.status ?? "")
}

export function canEditVoucher(voucher: PaymentVoucher, perspective: LoanRole, userId?: string) {
  if (perspective === "admin") return voucher.status === "owner_approved"
  return (
    perspective === "client" &&
    voucher.clientId === userId &&
    isPendingVoucherForClient(voucher)
  )
}

export function canDeleteVoucher(voucher: PaymentVoucher, perspective: LoanRole, userId?: string) {
  if (perspective === "admin") return voucher.status !== "deleted"
  return (
    perspective === "client" &&
    voucher.clientId === userId &&
    isPendingVoucherForClient(voucher)
  )
}

export function canProcessVoucher(
  voucher: PaymentVoucher,
  loan: Loan,
  perspective: LoanRole,
  userId?: string,
) {
  if (perspective === "investor") {
    return voucher.status === "pending_investor_review" && loan.investorId === userId
  }
  if (perspective !== "admin") return false
  return ["pending_admin_review", "investor_approved"].includes(voucher.status ?? "")
}
