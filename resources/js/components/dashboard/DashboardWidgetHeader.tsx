import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface DashboardWidgetHeaderProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    accent?: string;
    badge?: string | number;
    className?: string;
}

export function DashboardWidgetHeader({
    icon: Icon,
    title,
    subtitle,
    accent = 'from-emerald-500 to-lime-500',
    badge,
    className,
}: DashboardWidgetHeaderProps) {
    return (
        <div className={cn('mb-5 flex items-start justify-between gap-3', className)}>
            <div className="flex items-center gap-3 min-w-0">
                <div
                    className={cn(
                        'admin-dash-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br',
                        accent,
                    )}
                >
                    <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold admin-page-title truncate">{title}</h3>
                    {subtitle && <p className="text-xs admin-page-sub mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {badge !== undefined && badge !== null && (
                <span className="admin-dash-badge shrink-0 rounded-full px-2.5 py-1 text-xs font-bold">
                    {badge}
                </span>
            )}
        </div>
    );
}
