import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Sparkles, Send, Save, ToggleLeft, ToggleRight, UserPlus, GraduationCap, Calendar, FileBadge, Banknote } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalForm } from '@/components/ui/Modal';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useSuccessPopup } from '@/components/ui/SuccessPopup';
import { cn } from '@/lib/utils';

interface Template {
    id: number;
    type: string;
    name: string;
    title_template: string;
    body_template: string;
    audience: string[];
    icon: string;
    is_active: boolean;
    is_system: boolean;
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    new_student: { label: 'New Student', icon: UserPlus, color: 'text-emerald-500' },
    new_teacher: { label: 'New Teacher', icon: GraduationCap, color: 'text-blue-500' },
    upcoming_event: { label: 'Upcoming Event', icon: Calendar, color: 'text-purple-500' },
    upcoming_exam: { label: 'Upcoming Exam', icon: FileBadge, color: 'text-orange-500' },
    fee_overdue: { label: 'Fee Overdue', icon: Banknote, color: 'text-red-500' },
};

const AUDIENCE_OPTIONS = ['admin', 'staff', 'teacher', 'student', 'parent'];

const PLACEHOLDERS: Record<string, string[]> = {
    new_student: ['{student_name}', '{class_name}', '{roll_no}', '{admission_date}'],
    new_teacher: ['{teacher_name}', '{employee_id}', '{subject}'],
    upcoming_event: ['{event_title}', '{event_date}', '{location}'],
    upcoming_exam: ['{exam_name}', '{exam_date}', '{class_name}'],
    fee_overdue: ['{student_name}', '{amount}', '{due_date}'],
};

export default function NotificationsPage() {
    const { toast } = useToast();
    const { showSuccess } = useSuccessPopup();
    const qc = useQueryClient();
    const [editTpl, setEditTpl] = useState<Template | null>(null);
    const [tone, setTone] = useState<'professional' | 'friendly' | 'formal'>('professional');

    const { data: templates, isLoading } = useQuery({
        queryKey: ['notification-templates'],
        queryFn: () => apiGet<Template[]>('/notifications/templates'),
    });

    const saveMutation = useMutation({
        mutationFn: (body: Partial<Template> & { id: number }) =>
            apiPut(`/notifications/templates/${body.id}`, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notification-templates'] });
            showSuccess('Template Saved', 'Notification template updated successfully');
            setEditTpl(null);
        },
        onError: () => toast('Failed to save template', 'error'),
    });

    const generateMutation = useMutation({
        mutationFn: (type: string) =>
            apiPost<{ title_template: string; body_template: string; audience: string[]; icon: string }>(
                '/notifications/templates/generate',
                { type, tone },
            ),
        onSuccess: (data) => {
            if (editTpl) {
                setEditTpl({
                    ...editTpl,
                    title_template: data.title_template,
                    body_template: data.body_template,
                    audience: data.audience,
                    icon: data.icon,
                });
            }
            toast('AI template generated! Review and save.', 'info');
        },
        onError: () => toast('Generation failed', 'error'),
    });

    const testMutation = useMutation({
        mutationFn: (type: string) => apiPost<{ sent: number }>('/notifications/test', { type }),
        onSuccess: (data) => {
            showSuccess('Test Sent!', `Notification delivered to ${data.sent} user(s)`);
        },
        onError: () => toast('Test send failed', 'error'),
    });

    const toggleAudience = (role: string) => {
        if (!editTpl) return;
        const aud = editTpl.audience.includes(role)
            ? editTpl.audience.filter(a => a !== role)
            : [...editTpl.audience, role];
        setEditTpl({ ...editTpl, audience: aud });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Notification Templates"
                subtitle="Manage automated notifications for students, teachers, staff & events"
            />

            {isLoading ? (
                <div className="admin-card p-8 text-center admin-page-sub">Loading templates...</div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {(templates ?? []).map(tpl => {
                        const meta = TYPE_META[tpl.type] ?? { label: tpl.name, icon: Bell, color: 'text-emerald-500' };
                        const Icon = meta.icon;
                        return (
                            <div key={tpl.id} className="admin-card p-5 flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10', meta.color)}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold admin-page-title">{meta.label}</h3>
                                            <p className="text-xs admin-page-sub">{tpl.is_system ? 'System template' : 'Custom'}</p>
                                        </div>
                                    </div>
                                    {tpl.is_active ? (
                                        <span className="admin-badge-green text-xs px-2 py-0.5 rounded-full">Active</span>
                                    ) : (
                                        <span className="admin-badge-muted text-xs px-2 py-0.5 rounded-full">Inactive</span>
                                    )}
                                </div>
                                <p className="text-sm admin-page-sub line-clamp-2">{tpl.title_template}</p>
                                <div className="flex flex-wrap gap-1">
                                    {tpl.audience.map(a => (
                                        <span key={a} className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs capitalize text-emerald-700 dark:text-emerald-300">
                                            {a}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-auto pt-2">
                                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditTpl({ ...tpl })}>
                                        Edit
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => testMutation.mutate(tpl.type)} loading={testMutation.isPending}>
                                        <Send className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal open={!!editTpl} onClose={() => setEditTpl(null)} title={`Edit: ${editTpl?.name}`} size="xl">
                {editTpl && (
                    <ModalForm
                        onSubmit={e => { e.preventDefault(); saveMutation.mutate(editTpl); }}
                        actions={
                            <>
                                <Button type="button" variant="secondary" onClick={() => setEditTpl(null)}>Cancel</Button>
                                <Button type="submit" loading={saveMutation.isPending}>
                                    <Save className="h-4 w-4" /> Save Template
                                </Button>
                            </>
                        }
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Template Name" value={editTpl.name} onChange={e => setEditTpl(p => p ? { ...p, name: e.target.value } : p)} />
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">AI Tone</label>
                                <select value={tone} onChange={e => setTone(e.target.value as typeof tone)} className="admin-input w-full px-3 py-2 text-sm">
                                    <option value="professional">Professional</option>
                                    <option value="friendly">Friendly</option>
                                    <option value="formal">Formal</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <Sparkles className="h-5 w-5 text-emerald-500 shrink-0" />
                            <p className="flex-1 text-sm admin-page-sub">Generate notification text with AI based on template type and tone.</p>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                loading={generateMutation.isPending}
                                onClick={() => generateMutation.mutate(editTpl.type)}
                            >
                                <Sparkles className="h-4 w-4" /> AI Generate
                            </Button>
                        </div>

                        <Input
                            label="Title Template"
                            value={editTpl.title_template}
                            onChange={e => setEditTpl(p => p ? { ...p, title_template: e.target.value } : p)}
                        />

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Body Template</label>
                            <textarea
                                value={editTpl.body_template}
                                onChange={e => setEditTpl(p => p ? { ...p, body_template: e.target.value } : p)}
                                rows={3}
                                className="admin-input w-full px-3 py-2 text-sm resize-none"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
                                Placeholders: {(PLACEHOLDERS[editTpl.type] ?? []).join(', ')}
                            </label>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Send To (Audience)</label>
                            <div className="flex flex-wrap gap-2">
                                {AUDIENCE_OPTIONS.map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => toggleAudience(role)}
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors',
                                            editTpl.audience.includes(role)
                                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                : 'border-emerald-500/20 admin-page-sub hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                                        )}
                                    >
                                        {editTpl.audience.includes(role) ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium admin-page-title">Active</label>
                            <button
                                type="button"
                                onClick={() => setEditTpl(p => p ? { ...p, is_active: !p.is_active } : p)}
                                className={cn('rounded-lg p-1', editTpl.is_active ? 'text-emerald-500' : 'text-stone-400')}
                            >
                                {editTpl.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                            </button>
                        </div>
                    </ModalForm>
                )}
            </Modal>
        </div>
    );
}
