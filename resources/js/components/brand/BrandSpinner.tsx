import { BrandIcon } from './BrandIcon';
import { cn } from '@/lib/utils';

const sizes = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
} as const;

interface BrandSpinnerProps {
    size?: keyof typeof sizes;
    className?: string;
}

/** Compact branded spinner for buttons & inline loading */
export function BrandSpinner({ size = 'sm', className }: BrandSpinnerProps) {
    return (
        <span className={cn('relative inline-flex shrink-0 items-center justify-center', sizes[size], className)}>
            <span className="brand-loader-ring absolute inset-0 rounded-md" aria-hidden="true" />
            <BrandIcon
                size={size === 'xs' ? 'xs' : size === 'sm' ? 'xs' : 'sm'}
                className="relative z-10 scale-[0.65]"
            />
        </span>
    );
}
