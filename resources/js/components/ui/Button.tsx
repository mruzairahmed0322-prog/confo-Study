import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';
import { BrandSpinner } from '@/components/brand/BrandSpinner';



const variants = {

    primary: 'admin-btn-primary text-white',

    secondary: 'admin-btn-secondary',

    danger: 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-md hover:shadow-lg hover:from-rose-700 hover:to-red-600',

    ghost: 'text-emerald-700 dark:text-lime-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',

    success: 'bg-gradient-to-r from-emerald-600 to-lime-500 text-white',

};



const sizes = {

    sm: 'px-3 py-1.5 text-xs gap-1.5',

    md: 'px-4 py-2 text-sm gap-2',

    lg: 'px-6 py-3 text-base gap-2',

};



interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {

    variant?: keyof typeof variants;

    size?: keyof typeof sizes;

    loading?: boolean;

}



export const Button = forwardRef<HTMLButtonElement, ButtonProps>(

    ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => (

        <button

            ref={ref}

            disabled={disabled || loading}

            className={cn(

                'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',

                variants[variant], sizes[size], className,

            )}

            {...props}

        >

            {loading && <BrandSpinner size="xs" />}

            {children}

        </button>

    ),

);

Button.displayName = 'Button';

