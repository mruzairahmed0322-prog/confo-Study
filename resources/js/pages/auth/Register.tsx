import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthSelect } from '@/components/auth/AuthSelect';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import {
    Briefcase, Users, ChevronLeft, ChevronRight,
    User, Mail, Phone, MapPin, FileText, Lock, Eye, EyeOff, LogIn, ShieldCheck,
} from 'lucide-react';
import { BrandSpinner } from '@/components/brand/BrandSpinner';
import { cn } from '@/lib/utils';

const ROLES = [
    { value: 'parent', labelKey: 'role_parent' as const, icon: Users },
    { value: 'staff', labelKey: 'role_staff' as const, icon: Briefcase },
] as const;

interface FormData {
    name: string;
    email: string;
    phone: string;
    role: string;
    gender: string;
    address: string;
    registration_note: string;
    password: string;
    password_confirmation: string;
    terms: boolean;
}

const initialForm: FormData = {
    name: '', email: '', phone: '', role: '', gender: 'male',
    address: '', registration_note: '', password: '', password_confirmation: '', terms: false,
};

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="login-field-error">{message}</p>;
}

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(initialForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [startedAt] = useState(() => Math.floor(Date.now() / 1000));
    const { toast } = useToast();
    const { t } = useLocale();
    const navigate = useNavigate();

    const set = (key: keyof FormData, value: string | boolean) => {
        setForm(p => ({ ...p, [key]: value }));
        setErrors(p => ({ ...p, [key]: '' }));
    };

    const validateStep = (): boolean => {
        const e: Record<string, string> = {};
        if (step === 1) {
            if (!form.name.trim()) e.name = `${t.full_name} required`;
            if (!form.email.trim()) e.email = `${t.email} required`;
            if (!form.phone.trim()) e.phone = `${t.phone} required`;
        }
        if (step === 2) {
            if (!form.role) e.role = t.role_select_placeholder;
            if (!form.gender) e.gender = t.gender;
        }
        if (step === 3) {
            if (form.password.length < 8) e.password = 'Min 8 characters';
            if (form.password !== form.password_confirmation) e.password_confirmation = 'Passwords do not match';
            if (!form.terms) e.terms = 'Required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = () => { if (validateStep()) setStep(s => s + 1); };
    const back = () => setStep(s => s - 1);

    const submit = async () => {
        if (!validateStep()) return;
        setLoading(true);
        try {
            await api.post('/register', {
                ...form,
                terms: form.terms ? 1 : 0,
                website: '',
                _form_started: startedAt,
            });
            navigate('/app/register/pending', { state: { email: form.email } });
        } catch (err: unknown) {
            const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
            if (data?.errors) {
                const mapped: Record<string, string> = {};
                Object.entries(data.errors).forEach(([k, v]) => { mapped[k] = v[0]; });
                setErrors(mapped);
                toast(t.fix_errors, 'error');
            } else {
                toast(data?.message || t.registration_failed, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const roleLabel = ROLES.find(r => r.value === form.role);

    return (
        <AuthShell title={t.create_account} subtitle={t.register_hint} horizontal>
            <div className="login-columns">
                <div className="login-form-inner space-y-4">
                    <div className="login-steps">
                        {[1, 2, 3].map(n => (
                            <div
                                key={n}
                                className={cn(
                                    'login-step',
                                    step === n && 'login-step-active',
                                    step > n && 'login-step-done',
                                    step < n && 'login-step-pending',
                                )}
                            >
                                {n}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="login-label block">{t.full_name}</label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                                    <input
                                        id="name"
                                        type="text"
                                        value={form.name}
                                        onChange={e => set('name', e.target.value)}
                                        placeholder={t.full_name_placeholder}
                                        className="login-input w-full rounded-lg ps-10 pe-3"
                                    />
                                </div>
                                <FieldError message={errors.name} />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="email" className="login-label block">{t.email}</label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        onChange={e => set('email', e.target.value)}
                                        placeholder={t.email_placeholder}
                                        className="login-input w-full rounded-lg ps-10 pe-3"
                                    />
                                </div>
                                <FieldError message={errors.email} />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="phone" className="login-label block">{t.phone}</label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => set('phone', e.target.value)}
                                        placeholder={t.phone_placeholder}
                                        className="login-input w-full rounded-lg ps-10 pe-3"
                                    />
                                </div>
                                <FieldError message={errors.phone} />
                            </div>

                            <button type="button" onClick={next} className="login-glass-btn flex w-full items-center justify-center gap-2 rounded-lg py-3">
                                <span>{t.continue_btn}</span>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label htmlFor="role" className="login-label block">{t.account_type}</label>
                                <AuthSelect
                                    id="role"
                                    value={form.role}
                                    onChange={v => set('role', v)}
                                    placeholder={t.role_select_placeholder}
                                    icon={<Users className="h-4 w-4" />}
                                    options={ROLES.map(r => ({
                                        value: r.value,
                                        label: t[r.labelKey],
                                    }))}
                                />
                                <FieldError message={errors.role} />
                            </div>

                            <div className="login-role-grid">
                                {ROLES.map(r => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => set('role', r.value)}
                                        className={cn('login-role-card', form.role === r.value && 'login-role-card-active')}
                                    >
                                        <r.icon className="h-5 w-5" />
                                        <span>{t[r.labelKey]}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="login-info-box flex gap-2 text-xs">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>
                                    Students and teachers are added by the school admin. Register here only as <strong>Parent</strong> or <strong>Staff</strong>.
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="gender" className="login-label block">{t.gender}</label>
                                <AuthSelect
                                    id="gender"
                                    value={form.gender}
                                    onChange={v => set('gender', v)}
                                    options={[
                                        { value: 'male', label: t.male },
                                        { value: 'female', label: t.female },
                                        { value: 'other', label: t.other },
                                    ]}
                                />
                                <FieldError message={errors.gender} />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="address" className="login-label block">{t.address_optional}</label>
                                <div className="relative">
                                    <MapPin className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                                    <input
                                        id="address"
                                        type="text"
                                        value={form.address}
                                        onChange={e => set('address', e.target.value)}
                                        className="login-input w-full rounded-lg ps-10 pe-3"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="note" className="login-label block">{t.note_optional}</label>
                                <div className="relative">
                                    <FileText className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                                    <input
                                        id="note"
                                        type="text"
                                        value={form.registration_note}
                                        onChange={e => set('registration_note', e.target.value)}
                                        placeholder="Students: Roll 2026-1042 (optional)"
                                        className="login-input w-full rounded-lg ps-10 pe-3"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button type="button" onClick={back} className="login-secondary-btn flex-1">
                                    <ChevronLeft className="h-4 w-4" />
                                    <span>{t.back_btn}</span>
                                </button>
                                <button type="button" onClick={next} className="login-glass-btn flex flex-1 items-center justify-center gap-2 rounded-lg py-3">
                                    <span>{t.continue_btn}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-3">
                            <div className="login-review-box">
                                <p className="font-semibold">{t.review}</p>
                                <p className="mt-1"><strong>{form.name}</strong> · {form.email}</p>
                                <p>{form.phone} · {roleLabel ? t[roleLabel.labelKey] : form.role}</p>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="password" className="login-label block">{t.password}</label>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                                    <input
                                        id="password"
                                        type={showPass ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e => set('password', e.target.value)}
                                        placeholder="••••••••"
                                        className="login-input w-full rounded-lg ps-10 pe-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="login-pass-toggle absolute end-1.5 top-1/2 -translate-y-1/2"
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
                                        value={form.password_confirmation}
                                        onChange={e => set('password_confirmation', e.target.value)}
                                        placeholder="••••••••"
                                        className="login-input w-full rounded-lg ps-10 pe-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="login-pass-toggle absolute end-1.5 top-1/2 -translate-y-1/2"
                                    >
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <FieldError message={errors.password_confirmation} />
                            </div>

                            <label className="flex cursor-pointer items-start gap-2 text-sm login-text-muted">
                                <input
                                    type="checkbox"
                                    checked={form.terms}
                                    onChange={e => set('terms', e.target.checked)}
                                    className="login-checkbox mt-0.5 rounded border-emerald-400"
                                />
                                <span>{t.terms_agree}</span>
                            </label>
                            <FieldError message={errors.terms} />

                            <div className="flex gap-2">
                                <button type="button" onClick={back} disabled={loading} className="login-secondary-btn flex-1">
                                    <ChevronLeft className="h-4 w-4" />
                                    <span>{t.back_btn}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={submit}
                                    disabled={loading}
                                    className="login-glass-btn flex flex-1 items-center justify-center gap-2 rounded-lg py-3"
                                >
                                    {loading ? (
                                        <BrandSpinner size="sm" />
                                    ) : null}
                                    <span>{loading ? t.loading : t.submit_registration}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <aside className="login-side-panel">
                    <p className="login-side-heading">{t.have_account}</p>
                    <Link
                        to="/app/login"
                        className={cn(
                            'login-create-btn group flex w-full items-center justify-center gap-2 rounded-lg py-3',
                            loading && 'pointer-events-none opacity-50',
                        )}
                    >
                        <LogIn className="h-5 w-5 transition-transform group-hover:scale-110" />
                        <span>{t.sign_in}</span>
                    </Link>

                    <div className="login-info-box flex gap-2.5">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{t.approval_notice}</span>
                    </div>

                    <div className="login-demo-chip">
                        <span>{t.step_of} {step} {t.of} 3</span>
                    </div>
                </aside>
            </div>
        </AuthShell>
    );
}
