import { cn, statusColors } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: string;
    className?: string;
}

export function Badge({ children, variant = 'pending', className }: BadgeProps) {
    return (
        <span className={cn(
            'inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold capitalize',
            statusColors[variant] ?? 'admin-badge-muted',
            className,
        )}>
            {children}
        </span>
    );
}
