import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
    return (
        <div className={cn('rounded-xl border border-emerald-500/10 bg-emerald-50/30 p-4 dark:bg-emerald-950/20', className)}>
            <div className="mb-4">
                <h3 className="text-sm font-bold admin-page-title">{title}</h3>
                {description && <p className="mt-0.5 text-xs admin-page-sub">{description}</p>}
            </div>
            {children}
        </div>
    );
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
    const colClass = cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2';
    return <div className={cn('grid gap-4', colClass)}>{children}</div>;
}
