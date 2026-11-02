import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' | 'warning' }

interface ToastContextType {
    toast: (message: string, type?: Toast['type']) => void;
    success: (message: string) => void;
    error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const icons = { success: CheckCircle, error: AlertCircle, info: Info, warning: AlertTriangle };
const colors = {
    success: 'border-emerald-500/40 bg-emerald-50/95 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 shadow-emerald-500/10',
    error: 'border-red-500/40 bg-red-50/95 dark:bg-red-900/30 text-red-800 dark:text-red-200 shadow-red-500/10',
    info: 'border-blue-500/40 bg-blue-50/95 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 shadow-blue-500/10',
    warning: 'border-yellow-500/40 bg-yellow-50/95 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 shadow-yellow-500/10',
};
const iconColors = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-yellow-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
    }, []);

    const success = useCallback((message: string) => toast(message, 'success'), [toast]);
    const error = useCallback((message: string) => toast(message, 'error'), [toast]);

    return (
        <ToastContext.Provider value={{ toast, success, error }}>
            {children}
            <div className="fixed bottom-4 end-4 z-[150] flex flex-col gap-2.5 pointer-events-none">
                {toasts.map(t => {
                    const Icon = icons[t.type];
                    return (
                        <div
                            key={t.id}
                            className={cn(
                                'pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3.5 shadow-xl backdrop-blur-md animate-toast-slide min-w-[300px] max-w-sm',
                                colors[t.type],
                            )}
                        >
                            <div className={cn('shrink-0 rounded-full p-0.5', iconColors[t.type])}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <span className="flex-1 text-sm font-medium leading-snug">{t.message}</span>
                            <button
                                type="button"
                                onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
                                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
