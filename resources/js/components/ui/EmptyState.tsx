import { Clock, Construction } from 'lucide-react';

interface EmptyStateProps {
    title?: string;
    message?: string;
    variant?: 'empty' | 'coming-soon';
    icon?: React.ElementType;
}

export function EmptyState({
    title,
    message,
    variant = 'empty',
    icon,
}: EmptyStateProps) {
    const isComingSoon = variant === 'coming-soon';
    const Icon = icon ?? (isComingSoon ? Construction : Clock);
    const defaultTitle = isComingSoon ? 'Coming Soon' : 'No data yet';
    const defaultMessage = isComingSoon
        ? 'This feature is under development and will be available soon.'
        : 'Nothing to show at the moment.';

    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 px-6 py-8 text-center">
            <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
                isComingSoon ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600'
            }`}>
                <Icon className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold admin-page-title">{title ?? defaultTitle}</p>
            <p className="mt-1 max-w-xs text-xs admin-page-sub">{message ?? defaultMessage}</p>
        </div>
    );
}
