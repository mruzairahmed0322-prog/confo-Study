import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import {
    Ban,
    CheckCircle,
    Eye,
    Pencil,
    Play,
    Printer,
    ShieldCheck,
    Trash2,
    XCircle,
    type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export const actionVariantStyles = {
    edit: 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/25',
    view: 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/25',
    print: 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/25',
    delete: 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/25',
    block: 'text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/25',
    unblock: 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/25',
    attempt: 'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/25',
    approve: 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/25',
    reject: 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/25',
    toggle: 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/25',
} as const;

export type ActionVariant = keyof typeof actionVariantStyles;

const defaultIcons: Record<ActionVariant, LucideIcon> = {
    edit: Pencil,
    view: Eye,
    print: Printer,
    delete: Trash2,
    block: Ban,
    unblock: ShieldCheck,
    attempt: Play,
    approve: CheckCircle,
    reject: XCircle,
    toggle: ShieldCheck,
};

interface ActionIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant: ActionVariant;
    title: string;
    icon?: LucideIcon;
    children?: ReactNode;
}

export function ActionIconButton({
    variant,
    title,
    icon: IconOverride,
    className,
    children,
    ...props
}: ActionIconButtonProps) {
    const Icon = IconOverride ?? defaultIcons[variant];

    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
                'disabled:pointer-events-none disabled:opacity-50',
                actionVariantStyles[variant],
                className,
            )}
            {...props}
        >
            {children ?? <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
        </button>
    );
}

export function ActionButtonGroup({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap items-center gap-1', className)}>
            {children}
        </div>
    );
}
