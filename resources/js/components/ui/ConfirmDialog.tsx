import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export type ConfirmType = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmDialogProps {
    open: boolean;
    type?: ConfirmType;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const icons = { danger: AlertTriangle, warning: AlertTriangle, success: CheckCircle, info: Info };
const iconColors = {
    danger: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300',
    warning: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300',
    success: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
    info: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export function ConfirmDialog({
    open, type = 'info', title, message, confirmText = 'Confirm', cancelText = 'Cancel',
    loading, onConfirm, onCancel,
}: ConfirmDialogProps) {
    if (!open) return null;
    const Icon = icons[type];

    return (
        <div className="admin-modal-backdrop" onClick={onCancel} role="presentation">
            <div
                className="admin-modal relative w-full max-w-md p-6 animate-fade-in-up"
                onClick={e => e.stopPropagation()}
                role="alertdialog"
                aria-labelledby="confirm-title"
            >
                <button
                    type="button"
                    onClick={onCancel}
                    className="absolute end-4 top-4 rounded-lg p-1.5 admin-page-sub hover:bg-emerald-500/10 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
                <div className="text-center">
                    <div className={cn('mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full', iconColors[type])}>
                        <Icon className="h-7 w-7" />
                    </div>
                    <h2 id="confirm-title" className="admin-page-title text-lg font-bold">{title}</h2>
                    {message && <p className="admin-page-sub mt-2 text-sm">{message}</p>}
                </div>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                    <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>{cancelText}</Button>
                    <Button
                        variant={type === 'danger' || type === 'warning' ? 'danger' : 'primary'}
                        className="flex-1"
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
