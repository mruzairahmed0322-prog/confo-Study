import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { apiPost } from '@/lib/api';
import { Mail, Lock, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { BrandSpinner } from '@/components/brand/BrandSpinner';

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="login-field-error">{message}</p>;
}

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
    if (data?.errors) {
        const first = Object.values(data.errors)[0]?.[0];
        if (first) return first;
    }
    return data?.message ?? fallback;
}

export default function ResetPasswordPage() {
    const { token = '' } = useParams<{ token: string }>();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { t } = useLocale();
    const navigate = useNavigate();

    const validate = (): boolean => {
        const next: Record<string, string> = {};
        if (!email.trim()) next.email = `${t.email} required`;
        if (password.length < 8) next.password = 'Min 8 characters';
        if (password !== passwordConfirmation) next.password_confirmation = 'Passwords do not match';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            toast(t.fill_required, 'error');
            return;
        }

        setLoading(true);
        try {
            await apiPost('/password/reset', {
                token,
                email: email.trim(),
                password,
                password_confirmation: passwordConfirmation,
            });
            toast(t.password_reset_success);
            navigate('/app/login', { replace: true });
        } catch (err) {
            toast(extractErrorMessage(err, t.reset_failed), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell title={t.reset_password_title} subtitle={t.reset_password_hint}>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="login-label block">{t.email}</label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                            placeholder={t.email_placeholder}
                            required
                            autoComplete="off"
                            disabled={loading}
                            className="login-input w-full rounded-lg ps-10 pe-3"
                        />
                    </div>
                    <FieldError message={errors.email} />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="login-label block">{t.new_password}</label>
                    <div className="relative">
                        <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                        <input
                            id="password"
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                            required
                            autoComplete="new-password"
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
                    <FieldError message={errors.password} />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="confirm" className="login-label block">{t.confirm_password}</label>
                    <div className="relative">
                        <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                        <input
                            id="confirm"
                            type={showConfirm ? 'text' : 'password'}
                            value={passwordConfirmation}
                            onChange={e => { setPasswordConfirmation(e.target.value); setErrors(p => ({ ...p, password_confirmation: '' })); }}
                            required
                            autoComplete="new-password"
                            placeholder="••••••••"
                            disabled={loading}
                            className="login-input w-full rounded-lg ps-10 pe-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="login-pass-toggle absolute end-1.5 top-1/2 -translate-y-1/2"
                            title={showConfirm ? t.hide_password : t.show_password}
                            disabled={loading}
                        >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <FieldError message={errors.password_confirmation} />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="login-glass-btn flex w-full items-center justify-center gap-2 rounded-lg py-3"
                >
                    {loading ? (
                        <BrandSpinner size="sm" />
                    ) : (
                        <KeyRound className="h-5 w-5" />
                    )}
                    <span>{loading ? t.loading : t.reset_password_btn}</span>
                </button>
            </form>

            <div className="mt-5 text-center">
                <Link to="/app/login" className="login-link inline-flex items-center gap-1.5 text-sm">
                    <ArrowLeft className="h-4 w-4" />
                    <span>{t.back_to_login}</span>
                </Link>
            </div>
        </AuthShell>
    );
}
