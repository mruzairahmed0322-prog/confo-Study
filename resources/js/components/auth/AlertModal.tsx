import { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertModalProps {
    open: boolean;
    type?: AlertType;
    title: string;
    message?: string;
    confirmText?: string;
    onClose: () => void;
}

const config = {
    error: { icon: AlertCircle, ring: 'ring-red-400/30', iconBg: 'bg-red-500/15', iconColor: 'text-red-500' },
    success: { icon: CheckCircle, ring: 'ring-emerald-400/30', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-500' },
    warning: { icon: AlertCircle, ring: 'ring-amber-400/30', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-500' },
    info: { icon: Info, ring: 'ring-blue-400/30', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-500' },
};

export function AlertModal({ open, type = 'info', title, message, confirmText = 'OK', onClose }: AlertModalProps) {
    const { icon: Icon, ring, iconBg, iconColor } = config[type];

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="auth-alert-backdrop" onClick={onClose} role="presentation">
            <div
                className="auth-alert-card login-animate"
                onClick={e => e.stopPropagation()}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="auth-alert-title"
            >
                <button type="button" onClick={onClose} className="auth-alert-close" aria-label="Close">
                    <X className="h-4 w-4" />
                </button>
                <div className={cn('auth-alert-icon-wrap', ring, iconBg)}>
                    <Icon className={cn('h-7 w-7', iconColor)} />
                </div>
                <h2 id="auth-alert-title" className="auth-alert-title">{title}</h2>
                {message && <p className="auth-alert-message">{message}</p>}
                <button type="button" onClick={onClose} className="login-glass-btn mt-6 w-full rounded-xl py-3 text-sm font-bold">
                    {confirmText}
                </button>
            </div>
        </div>
    );
}
