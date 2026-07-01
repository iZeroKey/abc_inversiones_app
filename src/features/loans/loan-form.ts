export type LoanFormState = {
  clientId: string;
  investorId: string;
  principal: string;
  interestRate: string;
  installmentsCount: string;
  frequency: string;
  startDate: string;
  observation: string;
};

export function createDefaultLoanForm(): LoanFormState {
  return {
    clientId: "",
    investorId: "",
    principal: "0",
    interestRate: "0",
    installmentsCount: "12",
    frequency: "monthly",
    startDate: new Date().toISOString().slice(0, 10),
    observation: "",
  };
}
