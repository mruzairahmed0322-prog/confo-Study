import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCurrency(amount: number | string): string {
    return `Rs. ${Number(amount).toLocaleString('en-PK')}`;
}

export const statusColors: Record<string, string> = {
    active: 'admin-badge-green',
    inactive: 'admin-badge-muted',
    pending: 'admin-badge-yellow',
    paid: 'admin-badge-green',
    partial: 'admin-badge-yellow',
    overdue: 'admin-badge-yellow',
    approved: 'admin-badge-green',
    rejected: 'admin-badge-muted',
    present: 'admin-badge-green',
    absent: 'admin-badge-muted',
    late: 'admin-badge-yellow',
    leave: 'admin-badge-yellow',
    live: 'admin-badge-yellow animate-pulse',
    scheduled: 'admin-badge-green',
    completed: 'admin-badge-muted',
    cancelled: 'admin-badge-muted',
};
