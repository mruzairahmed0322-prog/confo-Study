import { CheckCircle, X } from 'lucide-react';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SuccessPopupState {
    open: boolean;
    title: string;
    message: string;
}

interface SuccessPopupContextType {
    showSuccess: (title: string, message?: string) => void;
}

const SuccessPopupContext = createContext<SuccessPopupContextType | null>(null);

const CONFETTI_COLORS = ['#10b981', '#84cc16', '#eab308', '#34d399', '#a3e635'];

export function SuccessPopupProvider({ children }: { children: ReactNode }) {
    const [popup, setPopup] = useState<SuccessPopupState>({ open: false, title: '', message: '' });

    const showSuccess = useCallback((title: string, message = '') => {
        setPopup({ open: true, title, message });
        setTimeout(() => setPopup(p => ({ ...p, open: false })), 2800);
    }, []);

    return (
        <SuccessPopupContext.Provider value={{ showSuccess }}>
            {children}
            {popup.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm">
                    <div className="relative flex flex-col items-center rounded-2xl border border-emerald-500/20 bg-white px-10 py-8 shadow-2xl dark:bg-emerald-950/95 animate-success-pop">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-2xl">
                            {CONFETTI_COLORS.map((color, i) => (
                                <span
                                    key={i}
                                    className="absolute h-2 w-2 rounded-full animate-confetti"
                                    style={{
                                        background: color,
                                        left: `${15 + i * 14}%`,
                                        animationDelay: `${i * 0.08}s`,
                                    }}
                                />
                            ))}
                        </div>
                        <div className="relative mb-4">
                            <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-success-ring" />
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-lime-500 shadow-lg">
                                <CheckCircle className="h-8 w-8 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{popup.title}</h3>
                        {popup.message && (
                            <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">{popup.message}</p>
                        )}
                        <button
                            type="button"
                            onClick={() => setPopup(p => ({ ...p, open: false }))}
                            className="absolute end-3 top-3 rounded-lg p-1 text-emerald-600/50 hover:text-emerald-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </SuccessPopupContext.Provider>
    );
}

export function useSuccessPopup() {
    const ctx = useContext(SuccessPopupContext);
    if (!ctx) throw new Error('useSuccessPopup must be used within SuccessPopupProvider');
    return ctx;
}
