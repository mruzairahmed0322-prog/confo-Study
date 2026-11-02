import { type HTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';



interface CardProps extends HTMLAttributes<HTMLDivElement> {

    hover?: boolean;

}



export const Card = forwardRef<HTMLDivElement, CardProps>(

    ({ className, hover, children, ...props }, ref) => (

        <div

            ref={ref}

            className={cn(

                'admin-card rounded-2xl',

                hover && 'admin-card-hover cursor-default',

                className,

            )}

            {...props}

        >

            {children}

        </div>

    ),

);

Card.displayName = 'Card';



export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {

    return <div className={cn('px-6 py-4 border-b border-emerald-500/10 dark:border-lime-400/10', className)} {...props}>{children}</div>;

}



export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {

    return <div className={cn('p-6', className)} {...props}>{children}</div>;

}



export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {

    return <h3 className={cn('admin-page-title text-lg', className)} {...props}>{children}</h3>;

}

