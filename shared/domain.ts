// Shared between the React app (src/) and the API (server/).

export type Role = 'customer' | 'reviewer' | 'admin';
export type ProfileType = 'player' | 'club' | 'academy';
export type ProfileStatus = 'pending' | 'verified' | 'rejected';
export type BvnStatus = 'none' | 'pending' | 'verified' | 'failed';
export type ApplicationKind = 'account' | 'loan' | 'grant';
export type ApplicationStatus =
  | 'draft'
  | 'changes_requested'
  | 'submitted'
  | 'verification'
  | 'assessment'
  | 'approved'
  | 'rejected';

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  changes_requested: 'Changes requested',
  submitted: 'Submitted',
  verification: 'Document verification',
  assessment: 'Assessment',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const KIND_LABEL: Record<ApplicationKind, string> = {
  account: 'Account opening',
  loan: 'Loan',
  grant: 'Grant',
};

export const PROFILE_TYPE_LABEL: Record<ProfileType, string> = {
  player: 'Individual player',
  club: 'Registered football club',
  academy: 'Football academy',
};

/** Statuses in which the applicant may still edit the application. */
export const EDITABLE_STATUSES: ApplicationStatus[] = ['draft', 'changes_requested'];

/** Which status a reviewer may move an application to, from each status. */
export const REVIEW_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  submitted: ['verification', 'changes_requested', 'rejected'],
  verification: ['assessment', 'changes_requested', 'rejected'],
  assessment: ['approved', 'changes_requested', 'rejected'],
};

export interface DocSlot {
  slot: string;
  label: string;
  hint: string;
  required: boolean;
  accept: string;
}

const IMG = 'image/jpeg,image/png';
const IMG_PDF = 'image/jpeg,image/png,application/pdf';

export function documentSlots(kind: ApplicationKind, type: ProfileType): DocSlot[] {
  const credLabel =
    type === 'player' ? 'Football credentials' : type === 'club' ? 'Club registration certificate' : 'Academy registration certificate';
  if (kind === 'account') {
    return [
      { slot: 'passport_photo', label: 'Passport photograph', hint: 'JPG or PNG, plain background', required: true, accept: IMG },
      { slot: 'identification', label: 'Valid identification', hint: 'NIN slip, passport or driver’s licence', required: true, accept: IMG_PDF },
      { slot: 'football_docs', label: 'Supporting football documents', hint: 'Club registration, player card, trial invitations', required: type !== 'player', accept: IMG_PDF },
    ];
  }
  return [
    { slot: 'identification', label: 'Valid identification', hint: 'NIN slip, passport or driver’s licence', required: true, accept: IMG_PDF },
    { slot: 'credentials', label: credLabel, hint: 'PDF, JPG or PNG', required: true, accept: IMG_PDF },
  ];
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** Form fields stored in applications.data */
export interface AccountData {
  address?: string;
  phone?: string;
  nin?: string;
}
export interface FundingData {
  amount?: number; // naira
  option?: string; // repayment period (loan) or grant category (grant)
  purpose?: string;
  phone?: string;
}

/** Business rules, editable by admins. */
export interface Settings {
  loan: {
    minAmount: number; // naira
    maxAmount: number;
    periods: { label: string; months: number; monthlyRate: number }[];
    maxApplicationsPerDay: number;
  };
  grant: {
    minAmount: number;
    maxAmount: number;
    categories: string[];
  };
  savings: {
    plans: { label: string; days: number; flexibleRate: number; fixedRate: number }[];
  };
}

export const DEFAULT_SETTINGS: Settings = {
  loan: {
    minAmount: 10_000,
    maxAmount: 2_000_000,
    periods: [
      { label: '3 months', months: 3, monthlyRate: 2.5 },
      { label: '6 months', months: 6, monthlyRate: 2.25 },
      { label: '12 months', months: 12, monthlyRate: 2.0 },
    ],
    maxApplicationsPerDay: 2,
  },
  grant: {
    minAmount: 10_000,
    maxAmount: 5_000_000,
    categories: ['Talent development', 'Equipment', 'Facilities', 'Travel and trials'],
  },
  savings: {
    plans: [
      { label: '30 days', days: 30, flexibleRate: 6, fixedRate: 8 },
      { label: '90 days', days: 90, flexibleRate: 8, fixedRate: 10.5 },
      { label: '180 days', days: 180, flexibleRate: 9, fixedRate: 12 },
      { label: '365 days', days: 365, flexibleRate: 10, fixedRate: 14 },
    ],
  },
};
