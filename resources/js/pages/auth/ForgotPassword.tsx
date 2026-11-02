import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { apiPost } from '@/lib/api';
import { Mail, KeyRound, LogIn, ArrowLeft } from 'lucide-react';
import { BrandSpinner } from '@/components/brand/BrandSpinner';

function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
    return data?.message ?? fallback;
}

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { toast } = useToast();
    const { t } = useLocale();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast(t.fill_required, 'error');
            return;
        }

        setLoading(true);
        try {
            await apiPost('/password/email', { email: email.trim() });
            setSent(true);
            toast(t.reset_link_sent);
        } catch (err) {
            toast(extractErrorMessage(err, t.reset_failed), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell title={t.forgot_password_title} subtitle={t.forgot_password_hint}>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="login-label block">{t.email}</label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder={t.email_placeholder}
                            required
                            autoComplete="off"
                            disabled={loading || sent}
                            className="login-input w-full rounded-lg ps-10 pe-3"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || sent}
                    className="login-glass-btn flex w-full items-center justify-center gap-2 rounded-lg py-3"
                >
                    {loading ? (
                        <BrandSpinner size="sm" />
                    ) : (
                        <KeyRound className="h-5 w-5" />
                    )}
                    <span>{loading ? t.loading : t.send_reset_link}</span>
                </button>
            </form>

            <div className="mt-5 flex flex-col items-center gap-3 text-center">
                <Link to="/app/login" className="login-link inline-flex items-center gap-1.5 text-sm">
                    <ArrowLeft className="h-4 w-4" />
                    <span>{t.back_to_login}</span>
                </Link>
                {sent && (
                    <Link
                        to="/app/login"
                        className="login-create-btn inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm"
                    >
                        <LogIn className="h-4 w-4" />
                        <span>{t.sign_in}</span>
                    </Link>
                )}
            </div>
        </AuthShell>
    );
}
