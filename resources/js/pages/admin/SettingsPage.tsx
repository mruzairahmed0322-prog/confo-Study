import { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost, apiPut } from '@/lib/api';

import { Card, CardBody } from '@/components/ui/Card';

import { PageHeader } from '@/components/ui/PageHeader';

import { Button } from '@/components/ui/Button';

import { Input } from '@/components/ui/Input';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import { useToast } from '@/contexts/ToastContext';

import { useAuth } from '@/contexts/AuthContext';

import { Save, Database, AlertTriangle } from 'lucide-react';

import { SlipBrandingPanel } from '@/components/documents/SlipBrandingPanel';

import { mergeBranding, saveSlipBranding, type SlipBrandingSettings } from '@/lib/slipBranding';



export default function SettingsPage() {

    const { toast } = useToast();

    const { isSuperAdmin, user } = useAuth();

    const qc = useQueryClient();

    const [form, setForm] = useState({ school_name: '', school_address: '', school_phone: '', school_email: '' });

    const [slipBranding, setSlipBranding] = useState<SlipBrandingSettings>(mergeBranding());

    const [confirmDummy, setConfirmDummy] = useState(false);



    const { isLoading } = useQuery({

        queryKey: ['settings'],

        queryFn: async () => {

            const data = await apiGet<{

                school_name?: string; school_address?: string;

                school_phone?: string; school_email?: string;

                slip_branding?: Partial<SlipBrandingSettings>;

            }>('/settings');

            setForm({

                school_name: data.school_name ?? '',

                school_address: data.school_address ?? '',

                school_phone: data.school_phone ?? '',

                school_email: data.school_email ?? '',

            });

            const branding = mergeBranding(data.slip_branding);

            setSlipBranding(branding);

            saveSlipBranding(branding, user?.school?.id);

            return data;

        },

    });



    const saveMutation = useMutation({

        mutationFn: () => apiPut('/settings', { ...form, slip_branding: slipBranding }),

        onSuccess: () => {

            qc.invalidateQueries({ queryKey: ['settings'] });

            saveSlipBranding(slipBranding, user?.school?.id);

            toast('Settings saved');

        },

        onError: () => toast('Failed to save settings', 'error'),

    });



    const dummyMutation = useMutation({

        mutationFn: () => apiPost('/settings/reset-dummy-data'),

        onSuccess: () => {

            qc.invalidateQueries();

            toast('Demo data loaded — refresh pages to preview', 'success');

            setConfirmDummy(false);

        },

        onError: () => toast('Failed to load demo data', 'error'),

    });



    return (

        <div className="space-y-6">

            <PageHeader title="Settings" subtitle="General school configuration & invoice branding" />

            <Card>

                <CardBody>

                    {isLoading ? <p className="admin-page-sub">Loading...</p> : (

                        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-6">

                            <div className="max-w-lg space-y-4">

                                <Input label="School Name" value={form.school_name} onChange={e => setForm(p => ({ ...p, school_name: e.target.value }))} />

                                <Input label="Address" value={form.school_address} onChange={e => setForm(p => ({ ...p, school_address: e.target.value }))} />

                                <Input label="Phone" value={form.school_phone} onChange={e => setForm(p => ({ ...p, school_phone: e.target.value }))} />

                                <Input label="Email" type="email" value={form.school_email} onChange={e => setForm(p => ({ ...p, school_email: e.target.value }))} />

                            </div>



                            <SlipBrandingPanel

                                branding={slipBranding}

                                onChange={setSlipBranding}

                            />



                            <Button type="submit" loading={saveMutation.isPending}><Save className="h-4 w-4" /> Save Settings</Button>

                        </form>

                    )}

                </CardBody>

            </Card>



            {isSuperAdmin && (

                <Card>

                    <CardBody className="space-y-4">

                        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">

                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                            <div className="text-sm">

                                <p className="font-semibold admin-page-title">Demo data for client preview</p>

                                <p className="mt-1 admin-page-sub">

                                    Loads sample students, teachers, classes, fees, exams, library, and more.

                                    Your Super Admin login stays the same. All other users and records are replaced with demo content.

                                    Demo logins use password: <strong>password</strong>

                                </p>

                            </div>

                        </div>

                        <Button

                            type="button"

                            variant="secondary"

                            onClick={() => setConfirmDummy(true)}

                            loading={dummyMutation.isPending}

                        >

                            <Database className="h-4 w-4" />

                            Reset / Load Demo Data

                        </Button>

                    </CardBody>

                </Card>

            )}



            <ConfirmDialog

                open={confirmDummy}

                type="warning"

                title="Load demo data?"

                message="This removes current school data (except your Super Admin account) and loads full demo data for all pages. Use before client demos; add real data again after."

                confirmText="Load demo data"

                cancelText="Cancel"

                loading={dummyMutation.isPending}

                onConfirm={() => dummyMutation.mutate()}

                onCancel={() => setConfirmDummy(false)}

            />

        </div>

    );

}

