import { Link, useLocation } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';

export default function RegisterPendingPage() {
    const location = useLocation();
    const email = (location.state as { email?: string })?.email;

    return (
        <AuthShell title="Registration Submitted" subtitle="Your account is pending approval">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-sm text-slate-300">
                    {email ? (
                        <>We received your registration for <strong className="text-white">{email}</strong>.</>
                    ) : (
                        <>We received your registration.</>
                    )}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                    A school administrator will review your application. You will be able to sign in once approved and fees are cleared.
                </p>
                <Link to="/app/login" className="mt-6 inline-block">
                    <Button className="w-full min-w-[200px]">Back to Sign In</Button>
                </Link>
            </div>
        </AuthShell>
    );
}
