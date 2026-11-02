import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextType {
    dark: boolean;
    toggle: () => void;
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    mobileSidebarOpen: boolean;
    setMobileSidebarOpen: (open: boolean) => void;
    toggleMobileSidebar: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(
        () => localStorage.getItem('sidebarCollapsed') === 'true',
    );
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, [dark]);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    const toggleSidebar = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setMobileSidebarOpen(prev => !prev);
        } else {
            setSidebarCollapsed(c => !c);
        }
    };

    const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev);

    return (
        <ThemeContext.Provider value={{
            dark,
            toggle: () => setDark(d => !d),
            sidebarCollapsed,
            toggleSidebar,
            mobileSidebarOpen,
            setMobileSidebarOpen,
            toggleMobileSidebar,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
