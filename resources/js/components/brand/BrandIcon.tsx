import { useId, type SVGProps } from 'react';
import { cn } from '@/lib/utils';

const sizes = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
} as const;

interface BrandIconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
    size?: keyof typeof sizes;
}

export function BrandIcon({ size = 'md', className, ...props }: BrandIconProps) {
    const gradId = useId();

    return (
        <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            className={cn('shrink-0', sizes[size], className)}
            {...props}
        >
            <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#047857" />
                    <stop offset="45%" stopColor="#059669" />
                    <stop offset="75%" stopColor="#84cc16" />
                    <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />
            <g
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="translate(5 7)"
            >
                <path d="M11 2L1 7l10 5 10-5L11 2z" />
                <path d="M5 10v4.5c0 2.2 2.4 3.5 6 3.5s6-1.3 6-3.5V10" />
                <path d="M21 7v6.5" />
            </g>
        </svg>
    );
}
