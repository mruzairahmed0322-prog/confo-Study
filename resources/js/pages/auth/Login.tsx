import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { AuthShell } from '@/components/auth/AuthShell';
import { AlertModal } from '@/components/auth/AlertModal';
import { AuthSelect } from '@/components/auth/AuthSelect';
import { LogIn, Lock, Eye, EyeOff, Mail, ShieldCheck, Users } from 'lucide-react';
import { BrandSpinner } from '@/components/brand/BrandSpinner';
import { resetAppQueries } from '@/lib/queryClient';

/** Role picker = path guide. Password auto-fill nahi. Account ka real role DB se match hota hai. */
const ROLE_OPTIONS = [
    {
        value: 'school-owner',
        label: 'Superadmin',
        description: 'Full control · System Settings · All modules',
        pathHint: 'Dashboard → Students, Live, Fees, Settings…',
    },
    {
        value: 'admin',
        label: 'Admin / Manager',
        description: 'School management · Approvals · Reports',
        pathHint: 'Dashboard → Students, Classes, Fees…',
    },
    {
        value: 'teacher',
        label: 'Teacher',
        description: 'Open Class · Attendance · Materials · Homework',
        pathHint: 'Dashboard → Live Classes · Open Class',
    },
    {
        value: 'student',
        label: 'Student',
        description: 'Join Live · Recordings · Homework (fee-paid)',
        pathHint: 'Dashboard → Live button · Recordings',
    },
    {
        value: 'parent',
        label: 'Parent',
        description: 'Child fees · Results · Live (fee-paid)',
        pathHint: 'Dashboard → Child widgets · Live',
    },
    {
        value: 'accountant',
        label: 'Accountant',
        description: 'Fees · Salary · Expenses',
        pathHint: 'Dashboard → Fees · Reports',
    },
    {
        value: 'reception',
        label: 'Reception',
        description: 'Admissions · Attendance desk',
        pathHint: 'Dashboard → Students · Attendance',
    },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]['value'];

const ROLE_LABEL: Record<string, string> = {
    'school-owner': 'Superadmin',
    admin: 'Admin / Manager',
    teacher: 'Teacher',
    student: 'Student',
    parent: 'Parent',
    accountant: 'Accountant',
    reception: 'Reception',
};

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<RoleValue | ''>('');
    const [remember, setRemember] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ type: 'error' | 'warning' | 'success'; title: string; message?: string } | null>(null);
    const lastSubmit = useRef(0);
    const { login } = useAuth();
    const { t } = useLocale();
    const navigate = useNavigate();

    const selected = ROLE_OPTIONS.find(r => r.value === role);

    const showAlert = useCallback((type: 'error' | 'warning' | 'success', title: string, message?: string) => {
        setAlert({ type, title, message });
    }, []);

    const clearSession = () => {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        resetAppQueries();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!role) {
            showAlert('warning', 'Pehle role select karo', 'Superadmin / Teacher / Student — jis account se login karna hai.');
            return;
        }

        if (!email.trim() || !password) {
            showAlert('warning', t.fill_required);
            return;
        }

        const now = Date.now();
        if (loading || now - lastSubmit.current < 2000) {
            showAlert('warning', t.duplicate_submit);
            return;
        }

        lastSubmit.current = now;
        setLoading(true);

        try {
            const user = await login(email, password);

            if (user.role !== role) {
                clearSession();
                showAlert(
                    'error',
                    'Galat role select',
                    `Is account ka role "${ROLE_LABEL[user.role] ?? user.role}" hai. Dropdown se wahi role choose karo, phir login karo.`,
                );
                setLoading(false);
                return;
            }

            navigate('/app', { replace: true });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '';
            const isNetwork = /slow|network|timeout|try again/i.test(msg);
            showAlert('error', isNetwork ? msg : t.invalid_credentials);
            setLoading(false);
        }
    };

    return (
        <>
            <AuthShell title={t.sign_in} subtitle={t.login_hint} horizontal>
                <div className="login-columns">
                <form onSubmit={handleSubmit} className="login-form-inner space-y-4" noValidate autoComplete="on">
                    <div className="space-y-1.5">
                        <label htmlFor="login-role" className="login-label block">Login as (role)</label>
                        <AuthSelect
                            id="login-role"
                            value={role}
                            onChange={(v) => setRole(v as RoleValue | '')}
                            disabled={loading}
                            placeholder="Select role — Superadmin / Teacher / Student…"
                            icon={<Users className="h-4 w-4" />}
                            options={ROLE_OPTIONS.map(r => ({
                                value: r.value,
                                label: r.label,
                                description: r.description,
                            }))}
                        />
                        {selected && (
                            <p className="text-xs login-text-muted">
                                Path: {selected.pathHint}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="email" className="login-label block">{t.email}</label>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                            <input
                                id="email"
                                name="email"
                                type="text"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder={t.email_placeholder}
                                required
                                autoComplete="username"
                                disabled={loading}
                                className="login-input w-full rounded-lg ps-10 pe-3"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="password" className="login-label block">{t.password}</label>
                        <div className="relative">
                            <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                            <input
                                id="password"
                                name="password"
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                                disabled={loading}
                                className="login-input w-full rounded-lg ps-10 pe-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="login-pass-toggle absolute end-1.5 top-1/2 -translate-y-1/2"
                                title={showPass ? t.hide_password : t.show_password}
                                disabled={loading}
                            >
                                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex cursor-pointer items-center gap-2 text-sm login-text-muted">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={e => setRemember(e.target.checked)}
                                disabled={loading}
                                className="login-checkbox rounded border-emerald-400"
                            />
                            {t.remember_me}
                        </label>
                        <Link to="/app/forgot-password" className="login-link">{t.forgot_password}</Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="login-glass-btn flex w-full items-center justify-center gap-2 rounded-lg py-3"
                    >
                        {loading ? (
                            <BrandSpinner size="sm" />
                        ) : (
                            <LogIn className="h-5 w-5" />
                        )}
                        <span>{loading ? t.loading : t.sign_in}</span>
                    </button>
                </form>

                <aside className="login-side-panel">
                    <p className="login-side-heading">{t.admin_only_accounts}</p>

                    <div className="login-info-box flex gap-2.5">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{t.approval_notice}</span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs login-text-muted">
                        <p className="font-semibold text-emerald-200/90">Role → path</p>
                        <p>Superadmin → full panel</p>
                        <p>Teacher → Open Class / materials</p>
                        <p>Student → Live + recordings (fee paid)</p>
                    </div>
                </aside>
                </div>
            </AuthShell>

            <AlertModal
                open={!!alert}
                type={alert?.type}
                title={alert?.title ?? ''}
                message={alert?.message}
                confirmText={t.confirm}
                onClose={() => setAlert(null)}
            />
        </>
    );
}
