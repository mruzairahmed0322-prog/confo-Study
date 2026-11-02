import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, value, onChange, options, placeholder, className, disabled }, ref) => (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-emerald-800/70 dark:text-lime-400/70">
                    {label}
                </label>
            )}
            <select
                ref={ref}
                value={value}
                disabled={disabled}
                onChange={e => onChange(e.target.value)}
                className={cn(
                    'admin-select admin-input w-full px-3 py-2.5 text-sm font-medium',
                    disabled && 'cursor-not-allowed opacity-60',
                )}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    ),
);
Select.displayName = 'Select';
