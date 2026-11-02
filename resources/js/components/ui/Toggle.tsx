import { cn } from '@/lib/utils';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
    return (
        <label className={cn(
            'flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors',
            !disabled && 'cursor-pointer hover:bg-emerald-500/5 dark:hover:bg-lime-400/5',
            disabled && 'opacity-60 cursor-not-allowed',
        )}>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={cn(
                    'admin-toggle shrink-0',
                    checked && 'admin-toggle-on',
                )}
            >
                <span className="admin-toggle-thumb" />
            </button>
            {(label || description) && (
                <div className="min-w-0">
                    {label && <p className="text-sm font-semibold admin-page-title">{label}</p>}
                    {description && <p className="mt-0.5 text-xs admin-page-sub">{description}</p>}
                </div>
            )}
        </label>
    );
}
