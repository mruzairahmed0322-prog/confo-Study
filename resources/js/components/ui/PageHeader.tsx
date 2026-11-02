import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    badge?: string;
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({ title, subtitle, badge, actions, className }: PageHeaderProps) {
    return (
        <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
            <div>
                {badge && (
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-lime-600 dark:text-lime-400">
                        {badge}
                    </p>
                )}
                <h1 className="admin-page-title text-2xl sm:text-3xl">{title}</h1>
                {subtitle && <p className="admin-page-sub mt-1 text-sm">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
