export interface FilterOption {
    value: string;
    label: string;
}

export const STATUS_ACTIVE: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

export const STATUS_STUDENT: FilterOption[] = [
    ...STATUS_ACTIVE,
    { value: 'pending', label: 'Pending' },
];

export const STATUS_HOMEWORK: FilterOption[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'closed', label: 'Closed' },
];

export const STATUS_FEE: FilterOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'partial', label: 'Partial' },
    { value: 'overdue', label: 'Overdue' },
];

export const STATUS_LOGIN: FilterOption[] = [
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
    { value: 'locked', label: 'Locked' },
];

export const STATUS_SALARY: FilterOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' },
];

export const STATUS_LIVE: FilterOption[] = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'live', label: 'Live' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

export const STATUS_EXAM: FilterOption[] = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

export const STATUS_CERT: FilterOption[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
];

export const STATUS_LIBRARY: FilterOption[] = [
    { value: 'available', label: 'Available' },
    { value: 'unavailable', label: 'Unavailable' },
];

export const STATUS_QUIZ: FilterOption[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
];

export const STATUS_PAYMENT_PROOF: FilterOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

export const STATUS_LOGIN_ACCOUNT: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'blocked', label: 'Blocked' },
];

export const AUDIT_EVENTS: FilterOption[] = [
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
    { value: 'deleted', label: 'Deleted' },
];

export const USER_ROLES: FilterOption[] = [
    { value: 'parent', label: 'Parent' },
    { value: 'reception', label: 'Staff (Reception)' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'admin', label: 'Admin' },
];

export const WEEKDAYS: FilterOption[] = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
];

export const MONTHS: FilterOption[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
].map(m => ({ value: m, label: m }));

export const EXPENSE_CATEGORIES: FilterOption[] = [
    { value: 'General', label: 'General' },
    { value: 'Utilities', label: 'Utilities' },
    { value: 'Salaries', label: 'Salaries' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Supplies', label: 'Supplies' },
    { value: 'Transport', label: 'Transport' },
    { value: 'Other', label: 'Other' },
];

export const LIBRARY_CATEGORIES: FilterOption[] = [
    { value: 'General', label: 'General' },
    { value: 'Fiction', label: 'Fiction' },
    { value: 'Non-Fiction', label: 'Non-Fiction' },
    { value: 'Science', label: 'Science' },
    { value: 'Mathematics', label: 'Mathematics' },
    { value: 'History', label: 'History' },
    { value: 'Reference', label: 'Reference' },
];

export const CERT_TYPES: FilterOption[] = [
    { value: 'completion', label: 'Completion' },
    { value: 'achievement', label: 'Achievement' },
    { value: 'participation', label: 'Participation' },
    { value: 'merit', label: 'Merit' },
];

export type StatusPreset =
    | 'active'
    | 'student'
    | 'homework'
    | 'fee'
    | 'login'
    | 'salary'
    | 'live'
    | 'exam'
    | 'cert'
    | 'library'
    | 'quiz'
    | 'paymentProof'
    | 'loginAccount';

const STATUS_PRESETS: Record<StatusPreset, FilterOption[]> = {
    active: STATUS_ACTIVE,
    student: STATUS_STUDENT,
    homework: STATUS_HOMEWORK,
    fee: STATUS_FEE,
    login: STATUS_LOGIN,
    salary: STATUS_SALARY,
    live: STATUS_LIVE,
    exam: STATUS_EXAM,
    cert: STATUS_CERT,
    library: STATUS_LIBRARY,
    quiz: STATUS_QUIZ,
    paymentProof: STATUS_PAYMENT_PROOF,
    loginAccount: STATUS_LOGIN_ACCOUNT,
};

export function statusOptions(preset: StatusPreset): FilterOption[] {
    return STATUS_PRESETS[preset];
}
