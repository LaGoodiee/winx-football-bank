// Demo data only. Replace with API calls once the backend exists.
import type { Application, SavingsPlan, UserSummary } from '../types';

export const formatNaira = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const savingsPlans: SavingsPlan[] = [
  { id: 'boots', name: 'Boots and kit', balance: 100.21, interestRate: 12.0, daysToMaturity: 45, progress: 18 },
  { id: 'academy', name: 'Academy fees', balance: 9104.04, interestRate: 8.0, daysToMaturity: 25, progress: 34 },
  { id: 'trial', name: 'Trial travel fund', balance: 100.21, interestRate: 10.5, daysToMaturity: 23, progress: 30 },
];

export const demoUser: UserSummary = {
  firstName: 'Goodness',
  initials: 'GN',
  tier: 5,
  kycLevel: 3,
  mainBalance: 9304.46,
  savingsTotal: 9304.46,
  accountNumberMasked: '2093 •••• 14',
  loanEligible: false,
  loanAppsUsedToday: 0,
  loanAppsDailyLimit: 2,
  onTimeRepaymentPct: 98.72,
};

export const applications: Application[] = [
  { reference: 'WSB-0412', type: 'Account opening', applicant: 'Player', status: 'Approved' },
  { reference: 'WSB-0457', type: 'Loan', applicant: 'Player', status: 'Assessment' },
  { reference: 'WSB-0461', type: 'Grant', applicant: 'Academy', status: 'Draft' },
];
