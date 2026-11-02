import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    /** Snappier open — no backdrop blur, faster animation */
    fast?: boolean;
}

const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
};

export function Modal({ open, onClose, title, children, footer, size = 'lg', fast = false }: ModalProps) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div className={cn('admin-modal-backdrop', fast && 'admin-modal-backdrop--fast')} onClick={onClose}>
            <div
                className={cn('admin-modal relative flex w-full flex-col', fast ? 'animate-fade-in-fast' : 'animate-fade-in-up', sizes[size])}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {title && (
                    <div className="flex shrink-0 items-center justify-between border-b border-emerald-500/10 px-6 py-4">
                        <h2 className="admin-page-title text-lg">{title}</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-emerald-600/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}
                <div className="admin-modal-body scrollbar-thin p-6">{children}</div>
                {footer && (
                    <div className="shrink-0 border-t border-emerald-500/10 px-6 py-4">{footer}</div>
                )}
            </div>
        </div>,
        document.body,
    );
}

/** Wraps form fields with scrollable body + sticky action buttons */
export function ModalForm({
    onSubmit,
    children,
    actions,
    className,
}: {
    onSubmit: (e: React.FormEvent) => void;
    children: ReactNode;
    actions: ReactNode;
    className?: string;
}) {
    return (
        <form onSubmit={onSubmit} className={cn('flex flex-col', className)}>
            <div className="space-y-4">{children}</div>
            <div className="mt-5 flex shrink-0 items-center justify-end gap-3 border-t border-emerald-500/10 pt-4">
                {actions}
            </div>
        </form>
    );
}
