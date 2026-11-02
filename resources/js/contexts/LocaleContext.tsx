import { createContext, useContext, type ReactNode } from 'react';
import { authStrings, type AuthStrings } from '@/lib/auth-i18n';

interface LocaleContextType {
    t: AuthStrings;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
    return (
        <LocaleContext.Provider value={{ t: authStrings }}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    const ctx = useContext(LocaleContext);
    if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
    return ctx;
}
