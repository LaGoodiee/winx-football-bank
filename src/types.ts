export type Theme = 'light' | 'dark';

export type ApplicantType = 'player' | 'club' | 'academy';

export type ApplicationKind = 'Loan' | 'Grant';

export type ApplicationStatus = 'Draft' | 'Submitted' | 'Verification' | 'Assessment' | 'Approved' | 'Rejected';

export interface SavingsPlan {
  id: string;
  name: string;
  balance: number; // in naira
  interestRate: number; // percent
  daysToMaturity: number;
  progress: number; // 0–100
}

export interface Application {
  reference: string;
  type: 'Account opening' | ApplicationKind;
  applicant: 'Player' | 'Club' | 'Academy';
  status: ApplicationStatus;
}

export interface UserSummary {
  firstName: string;
  initials: string;
  tier: number;
  kycLevel: number;
  mainBalance: number;
  savingsTotal: number;
  accountNumberMasked: string;
  loanEligible: boolean;
  loanAppsUsedToday: number;
  loanAppsDailyLimit: number;
  onTimeRepaymentPct: number;
}
