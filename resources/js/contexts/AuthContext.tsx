import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { prefetchEssentialData, resetAppQueries } from '@/lib/queryClient';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    school?: { id: number; name: string; logo?: string };
    permissions?: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    hasPermission: (perm: string) => boolean;
    isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_CACHE_KEY = 'auth_user';

function readCachedUser(): User | null {
    try {
        const raw = sessionStorage.getItem(USER_CACHE_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

function cacheUser(user: User | null) {
    if (user) {
        sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
        sessionStorage.removeItem(USER_CACHE_KEY);
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');
    const cachedUser = hasToken ? readCachedUser() : null;

    const [user, setUser] = useState<User | null>(cachedUser);
    const [loading, setLoading] = useState(hasToken && !cachedUser);

    const fetchUser = useCallback(async (background = false) => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setUser(null);
            cacheUser(null);
            setLoading(false);
            return;
        }

        if (!background) setLoading(true);

        try {
            const data = await apiGet<User>('/user');
            setUser(data);
            cacheUser(data);
            prefetchEssentialData(data.id, data.role);
        } catch {
            localStorage.removeItem('auth_token');
            resetAppQueries();
            cacheUser(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const cached = token ? readCachedUser() : null;
        fetchUser(!!cached);
    }, [fetchUser]);

    useEffect(() => {
        const onLogout = () => {
            resetAppQueries();
            cacheUser(null);
            setUser(null);
        };
        window.addEventListener('auth:logout', onLogout);
        return () => window.removeEventListener('auth:logout', onLogout);
    }, []);

    const login = async (email: string, password: string) => {
        const data = await apiPost<{ token: string; user: User }>('/login', { email, password });
        resetAppQueries();
        localStorage.setItem('auth_token', data.token);
        cacheUser(data.user);
        setUser(data.user);
        prefetchEssentialData(data.user.id, data.user.role);
        return data.user;
    };

    const logout = async () => {
        try { await apiPost('/logout'); } catch { /* ignore */ }
        localStorage.removeItem('auth_token');
        resetAppQueries();
        cacheUser(null);
        setUser(null);
    };

    const isSuperAdmin = user?.role === 'school-owner';
    const hasPermission = (perm: string) => isSuperAdmin || (user?.permissions?.includes(perm) ?? false);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, isSuperAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
