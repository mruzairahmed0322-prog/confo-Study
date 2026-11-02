import { type InputHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, type, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === 'password';
        const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

        return (
            <div className="space-y-1.5">
                {label && <label className="block text-sm font-medium admin-page-title">{label}</label>}
                <div className="relative">
                    {icon && <div className="absolute start-3 top-1/2 -translate-y-1/2 admin-page-sub">{icon}</div>}
                    <input
                        ref={ref}
                        type={inputType}
                        className={cn(
                            'admin-input w-full px-4 py-2.5 text-sm',
                            icon && 'ps-10',
                            isPassword && 'pe-10',
                            error && 'border-yellow-600 focus:border-yellow-600 focus:ring-yellow-500/20',
                            className,
                        )}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:text-emerald-400 dark:text-stone-300 dark:hover:text-emerald-400 hover:bg-stone-100/10 transition-colors focus:outline-none"
                            title={showPassword ? 'Hide password' : 'Show password'}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    )}
                </div>
                {error && <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">{error}</p>}
            </div>
        );
    },
);
Input.displayName = 'Input';
