import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    Moon, Sun, ShieldCheck, LogIn, Sparkles,
} from 'lucide-react';
import { BrandIcon } from '@/components/brand/BrandIcon';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
const BG_IMAGE = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80';

export function AuthShell({
    children,
    title,
    subtitle,
    horizontal = false,
}: {
    children: ReactNode;
    title: string;
    subtitle?: string;
    horizontal?: boolean;
}) {
    const { dark, toggle: toggleDark } = useTheme();
    const { t } = useLocale();
    const year = new Date().getFullYear();
    return (
        <div className="login-page font-sans">
            <div className="login-bg" style={{ backgroundImage: `url('${BG_IMAGE}')` }} aria-hidden="true" />
            <div className="login-bg-overlay" aria-hidden="true" />
            <div className="login-shapes" aria-hidden="true">
                <div className="login-shape-ring login-shape-ring-1" />
                <div className="login-shape-ring login-shape-ring-2" />
                <div className="login-shape login-shape-1" />
                <div className="login-shape login-shape-2" />
                <div className="login-shape login-shape-3" />
                <div className="login-shape login-shape-4" />
            </div>

            <div className="auth-shell">
                <header className="auth-header">
                    <div className="auth-header-inner mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
                        <Link to="/app/login" className="auth-header-brand group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
                            <BrandIcon size="lg" className="!h-10 !w-10 shrink-0" />
                            <div className="min-w-0 text-start leading-tight">
                                <p className="auth-logo-text truncate">{t.brand_name}</p>
                                <p className="auth-header-tagline truncate">{t.app_tagline}</p>
                            </div>
                            <span className="auth-header-secure hidden items-center gap-1.5 rounded-full lg:inline-flex">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>{t.secure_login}</span>
                            </span>
                        </Link>

                        <nav className="auth-header-nav hidden items-center gap-1.5 md:flex" aria-label="Auth navigation">
                            <Link
                                to="/app/login"
                                className={cn('auth-header-nav-btn auth-header-nav-btn-active')}
                            >
                                <LogIn className="h-4 w-4 shrink-0" />
                                <span>{t.sign_in}</span>
                            </Link>
                        </nav>

                        <div className="login-header-controls shrink-0">
                            <button
                                type="button"
                                onClick={toggleDark}
                                className="login-theme-toggle auth-header-theme-btn"
                                title={dark ? t.light_mode : t.dark_mode}
                                aria-label={dark ? t.light_mode : t.dark_mode}
                            >
                                {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                                <span className="hidden sm:inline">{dark ? t.light_mode : t.dark_mode}</span>
                            </button>

                            <span className="auth-header-spark hidden items-center gap-1 rounded-full xl:inline-flex">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>v2</span>
                            </span>
                        </div>
                    </div>

                    <nav className="auth-header-mobile-nav mx-auto flex max-w-6xl gap-2 px-5 pb-3 md:hidden" aria-label="Auth navigation mobile">
                        <Link
                            to="/app/login"
                            className={cn('auth-header-nav-btn flex-1 justify-center auth-header-nav-btn-active')}
                        >
                            <LogIn className="h-4 w-4 shrink-0" />
                            <span>{t.sign_in}</span>
                        </Link>
                    </nav>
                </header>
                <main className="auth-main">
                    <div className={cn('auth-card auth-card-hover login-animate', horizontal && 'auth-card-wide')}>
                        <div className={cn('login-glass-strong login-form-surface rounded-2xl', horizontal ? 'p-5 sm:p-6' : 'p-5 sm:p-6')}>
                            {horizontal ? (
                                <div className="mb-4 flex items-center gap-3 text-start">
                                    <BrandIcon size="md" className="shrink-0" />
                                    <div className="min-w-0">
                                        <h1 className="auth-logo-text text-xl font-extrabold tracking-tight">{title}</h1>
                                        {subtitle && <p className="mt-0.5 text-sm login-text-muted">{subtitle}</p>}
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 text-center">
                                    <BrandIcon size="lg" className="mx-auto mb-4" />
                                    <h1 className="auth-logo-text text-2xl font-extrabold tracking-tight">{title}</h1>
                                    {subtitle && <p className="mt-2 text-sm login-text-muted">{subtitle}</p>}
                                </div>
                            )}
                            {children}
                        </div>
                    </div>
                </main>

                <footer className="auth-footer py-4">
                    <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-center sm:flex-row sm:text-start">
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                            <p className="text-sm login-text-muted">
                                &copy; {year}{' '}
                                <span className="auth-logo-text text-sm font-bold">{t.brand_name}</span>
                                — {t.all_rights}
                            </p>
                            <span className="hidden sm:inline text-xs opacity-40">|</span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-lime-400">Powered by GMS</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                            <span className="login-footer-badge font-semibold text-emerald-700 dark:text-lime-400">
                                Powered by GMS
                            </span>
                            <span className="login-footer-badge">
                                <span className="login-footer-dot" aria-hidden="true" />
                                {t.secure_login}
                            </span>
                            <span className="login-footer-badge">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-lime-400" />
                                SSL Encrypted
                            </span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
