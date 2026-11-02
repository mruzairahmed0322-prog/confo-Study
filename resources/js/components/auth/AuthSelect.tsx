import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuthSelectOption {
    value: string;
    label: string;
    description?: string;
}

interface AuthSelectProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    options: AuthSelectOption[];
    placeholder?: string;
    icon?: ReactNode;
    disabled?: boolean;
    className?: string;
}

export function AuthSelect({
    id,
    value,
    onChange,
    options,
    placeholder = 'Select…',
    icon,
    disabled = false,
    className,
}: AuthSelectProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const selected = options.find(o => o.value === value);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const pick = (next: string) => {
        onChange(next);
        setOpen(false);
    };

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <button
                id={id}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => !disabled && setOpen(o => !o)}
                className={cn(
                    'login-input login-select-trigger flex w-full items-center rounded-lg text-start font-semibold transition-all',
                    icon ? 'ps-10 pe-10' : 'px-3 pe-10',
                    open && 'login-select-open',
                    !selected?.value && 'login-select-placeholder',
                    disabled && 'cursor-not-allowed opacity-60',
                )}
            >
                {icon && (
                    <span className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-emerald-600">
                        {icon}
                    </span>
                )}
                <span className="truncate">{selected?.label ?? placeholder}</span>
                <ChevronDown
                    className={cn(
                        'pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600 transition-transform duration-200',
                        open && 'rotate-180',
                    )}
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    aria-labelledby={id}
                    className="login-select-menu"
                >
                    {options.map(opt => {
                        const active = opt.value === value;
                        return (
                            <li key={opt.value || '__empty'} role="option" aria-selected={active}>
                                <button
                                    type="button"
                                    onClick={() => pick(opt.value)}
                                    className={cn('login-select-option', active && 'login-select-option-active')}
                                >
                                    <span className="min-w-0 flex-1 text-start">
                                        <span className="block truncate font-semibold">{opt.label}</span>
                                        {opt.description && (
                                            <span className="login-select-option-desc block truncate">{opt.description}</span>
                                        )}
                                    </span>
                                    {active && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
