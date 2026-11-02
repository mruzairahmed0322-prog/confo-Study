import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { useInstantQuery } from '@/lib/useInstantQuery';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Save, Settings2, Play, Link2, Unlink } from 'lucide-react';
import { PageContentSkeleton } from '@/components/ui/PageContentSkeleton';

interface SystemSettings {
    academic_year: string;
    timezone: string;
    registration_open: boolean;
    max_students_per_class: number;
    attendance_threshold: number;
    fee_due_day: number;
}

interface YouTubeStatus {
    configured: boolean;
    connected: boolean;
    auto_stream_enabled: boolean;
    multiple_live_class_mode?: boolean;
    channel_title: string | null;
    channel_id: string | null;
}

const TIMEZONE_OPTIONS = [
    { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
];

export default function SystemSettingsPage() {
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const qc = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const canEdit = hasPermission('system-settings.edit');
    const [form, setForm] = useState<SystemSettings>({
        academic_year: '', timezone: 'Asia/Karachi', registration_open: true,
        max_students_per_class: 40, attendance_threshold: 75, fee_due_day: 10,
    });
    const [autoStream, setAutoStream] = useState(false);
    const [multipleLiveMode, setMultipleLiveMode] = useState(false);

    useEffect(() => {
        const yt = searchParams.get('youtube');
        if (yt === 'connected') {
            toast('YouTube channel connected successfully!', 'success');
            qc.removeQueries({ queryKey: ['youtube-status'] });
            void qc.refetchQueries({ queryKey: ['youtube-status'] });
            setSearchParams({}, { replace: true });
        } else if (yt === 'error' || yt === 'denied') {
            toast('YouTube connection failed. Please try again.', 'error');
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams, toast, qc]);

    if (!hasPermission('system-settings.view')) {
        return <Navigate to="/app" replace />;
    }

    const { isInitialLoading } = useInstantQuery({
        queryKey: ['system-settings'],
        queryFn: async () => {
            const data = await apiGet<SystemSettings>('/system-settings');
            setForm(data);
            return data;
        },
    });

    const { data: youtubeStatus, isLoading: ytLoading } = useQuery({
        queryKey: ['youtube-status'],
        queryFn: async () => {
            const data = await apiGet<YouTubeStatus>('/integrations/youtube/status');
            setAutoStream(data.auto_stream_enabled);
            setMultipleLiveMode(data.multiple_live_class_mode ?? false);
            return data;
        },
        enabled: canEdit,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
        placeholderData: undefined,
        initialData: undefined,
    });

    const saveMutation = useMutation({
        mutationFn: () => apiPut('/system-settings', form),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['system-settings'] });
            toast('System settings saved successfully', 'success');
        },
        onError: () => toast('Failed to save settings. Please try again.', 'error'),
    });

    const connectMutation = useMutation({
        mutationFn: () => apiGet<{ url: string }>('/integrations/youtube/connect-url'),
        onSuccess: (data) => { window.location.href = data.url; },
        onError: () => toast('Could not start YouTube connection. Check .env credentials.', 'error'),
    });

    const disconnectMutation = useMutation({
        mutationFn: () => apiPost('/integrations/youtube/disconnect'),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['youtube-status'] });
            setAutoStream(false);
            toast('YouTube disconnected', 'success');
        },
    });

    const youtubeSettingsMutation = useMutation({
        mutationFn: (payload: { youtube_auto_stream?: boolean; multiple_live_class_mode?: boolean }) =>
            apiPut('/integrations/youtube/settings', payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['youtube-status'] });
            toast('YouTube live settings saved', 'success');
        },
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="System Settings"
                subtitle="School-owner configuration"
                badge="Superadmin"
                actions={canEdit && (
                    <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
                        <Save className="h-4 w-4" /> Save Changes
                    </Button>
                )}
            />

            <Card>
                <CardBody className="p-4 sm:p-6">
                    {isInitialLoading ? (
                        <PageContentSkeleton />
                    ) : (
                        <form onSubmit={e => { e.preventDefault(); if (canEdit) saveMutation.mutate(); }} className="space-y-6">
                            <div className="admin-form-section">
                                <p className="admin-form-section-title">
                                    <Settings2 className="inline h-3.5 w-3.5 me-1" /> Academic Settings
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Input
                                        label="Academic Year"
                                        value={form.academic_year}
                                        onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))}
                                        placeholder="2025-2026"
                                        required
                                        disabled={!canEdit}
                                    />
                                    <Select
                                        label="Timezone"
                                        value={form.timezone}
                                        onChange={v => setForm(p => ({ ...p, timezone: v }))}
                                        options={TIMEZONE_OPTIONS}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>

                            <div className="admin-form-section">
                                <p className="admin-form-section-title">Limits & Thresholds</p>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <Input
                                        label="Max Students Per Class"
                                        type="number"
                                        value={String(form.max_students_per_class)}
                                        onChange={e => setForm(p => ({ ...p, max_students_per_class: Number(e.target.value) }))}
                                        disabled={!canEdit}
                                    />
                                    <Input
                                        label="Attendance Threshold (%)"
                                        type="number"
                                        value={String(form.attendance_threshold)}
                                        onChange={e => setForm(p => ({ ...p, attendance_threshold: Number(e.target.value) }))}
                                        disabled={!canEdit}
                                    />
                                    <Input
                                        label="Fee Due Day (of month)"
                                        type="number"
                                        value={String(form.fee_due_day)}
                                        onChange={e => setForm(p => ({ ...p, fee_due_day: Number(e.target.value) }))}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>

                            <div className="admin-form-section">
                                <p className="admin-form-section-title">Registration</p>
                                <Toggle
                                    label="Registration Open"
                                    description="Allow new user registrations on the platform"
                                    checked={form.registration_open}
                                    onChange={v => setForm(p => ({ ...p, registration_open: v }))}
                                    disabled={!canEdit}
                                />
                            </div>

                            {canEdit && (
                                <div className="flex justify-end">
                                    <Button type="submit" loading={saveMutation.isPending}>
                                        <Save className="h-4 w-4" /> Save System Settings
                                    </Button>
                                </div>
                            )}
                        </form>
                    )}
                </CardBody>
            </Card>

            {canEdit && (
                <Card>
                    <CardBody className="p-4 sm:p-6">
                        <div className="admin-form-section">
                            <p className="admin-form-section-title">
                                <Play className="inline h-3.5 w-3.5 me-1" /> YouTube Live (Auto)
                            </p>
                            <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
                                Connect once — har class automatic: Unlisted YouTube stream + auto recording + student notifications. OBS ya manual link ki zaroorat nahi.
                            </p>

                            {ytLoading ? (
                                <div className="h-16 animate-pulse rounded-xl bg-emerald-500/5" />
                            ) : (
                                <div className="space-y-4">
                                    {!youtubeStatus?.configured && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                            Add <code className="text-xs">GOOGLE_CLIENT_ID</code> and <code className="text-xs">GOOGLE_CLIENT_SECRET</code> to your <code className="text-xs">.env</code> file (Google Cloud Console → YouTube Data API v3).
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-800/50">
                                        <div>
                                            <p className="font-medium text-stone-900 dark:text-stone-100">
                                                {youtubeStatus?.connected
                                                    ? `Connected: ${youtubeStatus.channel_title ?? 'YouTube Channel'}`
                                                    : 'Not connected'}
                                            </p>
                                            <p className="text-xs text-stone-500">
                                                {youtubeStatus?.connected
                                                    ? 'Ready for automatic live stream creation'
                                                    : 'Connect your YouTube channel to enable auto-scheduling'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {youtubeStatus?.connected ? (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => disconnectMutation.mutate()}
                                                    loading={disconnectMutation.isPending}
                                                >
                                                    <Unlink className="h-4 w-4" /> Disconnect
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => connectMutation.mutate()}
                                                    loading={connectMutation.isPending}
                                                    disabled={!youtubeStatus?.configured}
                                                >
                                                    <Link2 className="h-4 w-4" /> Connect YouTube
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <Toggle
                                        label="Auto-create YouTube streams + recordings"
                                        description="ON by default — schedule class and everything happens automatically (Unlisted stream, recording sync, notifications)"
                                        checked={autoStream}
                                        onChange={v => {
                                            setAutoStream(v);
                                            youtubeSettingsMutation.mutate({ youtube_auto_stream: v });
                                        }}
                                        disabled={!youtubeStatus?.connected || youtubeSettingsMutation.isPending}
                                    />

                                    <Toggle
                                        label="Multiple Live Class Mode"
                                        description="OFF (default): multiple subjects = one live session, teacher switches subject during class. ON: each subject gets its own independent live session."
                                        checked={multipleLiveMode}
                                        onChange={v => {
                                            setMultipleLiveMode(v);
                                            youtubeSettingsMutation.mutate({ multiple_live_class_mode: v });
                                        }}
                                        disabled={youtubeSettingsMutation.isPending}
                                    />
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
