import { type TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, ...props }, ref) => (
        <div className="space-y-1.5">
            {label && <label className="block text-sm font-medium admin-page-title">{label}</label>}
            <textarea
                ref={ref}
                rows={3}
                className={cn(
                    'admin-input w-full resize-none px-4 py-2.5 text-sm',
                    error && 'border-yellow-600 focus:border-yellow-600 focus:ring-yellow-500/20',
                    className,
                )}
                {...props}
            />
            {error && <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">{error}</p>}
        </div>
    ),
);
Textarea.displayName = 'Textarea';
