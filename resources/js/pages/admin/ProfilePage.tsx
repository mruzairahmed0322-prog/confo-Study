import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiPut } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Save, User } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [form, setForm] = useState({
        name: user?.name ?? '',
        email: user?.email ?? '',
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const saveMutation = useMutation({
        mutationFn: () => apiPut('/profile', form),
        onSuccess: () => { toast('Profile updated'); setForm(p => ({ ...p, current_password: '', password: '', password_confirmation: '' })); },
        onError: () => toast('Failed to update profile', 'error'),
    });

    return (
        <div className="space-y-6">
            <PageHeader title="Profile" subtitle="Manage your account" />
            <Card>
                <CardBody>
                    <div className="mb-6 flex items-center gap-4">
                        <div className="admin-stat-icon flex h-16 w-16 items-center justify-center rounded-2xl">
                            <User className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <p className="text-lg font-bold admin-page-title">{user?.name}</p>
                            <p className="text-sm admin-page-sub capitalize">{user?.role?.replace('-', ' ')}</p>
                        </div>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="max-w-lg space-y-4">
                        <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                        <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                        <hr className="border-emerald-500/10" />
                        <p className="text-sm font-semibold admin-page-title">Change Password</p>
                        <Input label="Current Password" type="password" value={form.current_password} onChange={e => setForm(p => ({ ...p, current_password: e.target.value }))} />
                        <Input label="New Password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                        <Input label="Confirm Password" type="password" value={form.password_confirmation} onChange={e => setForm(p => ({ ...p, password_confirmation: e.target.value }))} />
                        <Button type="submit" loading={saveMutation.isPending}><Save className="h-4 w-4" /> Update Profile</Button>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}
