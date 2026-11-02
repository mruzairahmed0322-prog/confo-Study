import { BrandIcon } from './BrandIcon';
import { cn } from '@/lib/utils';

const sizes = {
    sm: { wrap: 'h-8 w-8', icon: 'xs' as const, text: 'text-xs' },
    md: { wrap: 'h-12 w-12', icon: 'sm' as const, text: 'text-sm' },
    lg: { wrap: 'h-16 w-16', icon: 'md' as const, text: 'text-base' },
    xl: { wrap: 'h-20 w-20', icon: 'lg' as const, text: 'text-lg' },
} as const;

interface BrandLoaderProps {
    size?: keyof typeof sizes;
    label?: string;
    className?: string;
    fullScreen?: boolean;
}

export function BrandLoader({ size = 'md', label, className, fullScreen = false }: BrandLoaderProps) {
    const s = sizes[size];

    const content = (
        <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
            <div className={cn('brand-loader relative flex items-center justify-center', s.wrap)}>
                <span className="brand-loader-ring absolute inset-0 rounded-2xl" aria-hidden="true" />
                <BrandIcon size={s.icon} className="relative z-10" />
            </div>
            {label && (
                <p className={cn('font-semibold text-emerald-700 dark:text-lime-300', s.text)}>
                    {label}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-lime-50 via-white to-yellow-50 dark:from-[#011a12] dark:via-[#042e1c] dark:to-[#011a12]">
                {content}
            </div>
        );
    }

    return content;
}
