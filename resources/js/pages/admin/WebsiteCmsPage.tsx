import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'general' | 'images' | 'stats' | 'faculty' | 'gallery' | 'faqs' | 'programs';

interface CmsOverview {
    settings?: { tagline?: string; about?: string; admission_badge?: string };
    images?: { hero?: string; classroom?: string; students?: string; school?: string; about?: string };
    stats?: Array<{ id: number; label: string; value: string }>;
    faculty?: Array<{ id: number; name: string; subject: string; classes?: string; image_url?: string }>;
    gallery?: Array<{ id: number; title?: string; image_url: string }>;
    faqs?: Array<{ id: number; question: string; answer: string }>;
    programs?: Array<{ id: number; name: string; type?: string; class?: string; image_url?: string }>;
    guest_home_mode?: 'wordpress' | 'cms';
    wordpress_home_url?: string;
}

const TABS: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'images', label: 'Images' },
    { id: 'stats', label: 'Stats' },
    { id: 'faculty', label: 'Faculty' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'programs', label: 'Courses' },
];

export default function WebsiteCmsPage() {
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const qc = useQueryClient();
    const canEdit = hasPermission('cms.edit');
    const [tab, setTab] = useState<Tab>('general');
    const [settings, setSettings] = useState({
        tagline: '',
        about: '',
        admission_badge: '',
        guest_home_mode: 'cms' as 'wordpress' | 'cms',
        wordpress_home_url: 'https://confostudy.com/',
    });
    const [images, setImages] = useState({ hero: '', classroom: '', students: '', school: '', about: '' });

    const { data, isLoading } = useQuery({
        queryKey: ['cms-website'],
        queryFn: async () => {
            const res = await apiGet<CmsOverview>('/cms/website');
            setSettings({
                tagline: res.settings?.tagline ?? '',
                about: res.settings?.about ?? '',
                admission_badge: res.settings?.admission_badge ?? '',
                guest_home_mode: res.guest_home_mode === 'wordpress' ? 'wordpress' : 'cms',
                wordpress_home_url: res.wordpress_home_url || 'https://confostudy.com/',
            });
            setImages({
                hero: res.images?.hero ?? '',
                classroom: res.images?.classroom ?? '',
                students: res.images?.students ?? '',
                school: res.images?.school ?? '',
                about: res.images?.about ?? '',
            });
            return res;
        },
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: ['cms-website'] });

    const saveSettings = useMutation({
        mutationFn: () => apiPut('/cms/settings', settings),
        onSuccess: () => { invalidate(); toast('Website settings saved'); },
        onError: () => toast('Save failed', 'error'),
    });

    const saveImages = useMutation({
        mutationFn: () => apiPut('/cms/images', images),
        onSuccess: () => { invalidate(); toast('Images saved'); },
        onError: () => toast('Save failed', 'error'),
    });

    const addStat = useMutation({
        mutationFn: (body: { label: string; value: string }) => apiPost('/cms/stats', body),
        onSuccess: () => { invalidate(); toast('Stat added'); },
    });

    const addFaculty = useMutation({
        mutationFn: (body: Record<string, string>) => apiPost('/cms/faculty', body),
        onSuccess: () => { invalidate(); toast('Faculty added'); },
    });

    const addGallery = useMutation({
        mutationFn: (body: Record<string, string>) => apiPost('/cms/gallery', body),
        onSuccess: () => { invalidate(); toast('Gallery image added'); },
    });

    const addFaq = useMutation({
        mutationFn: (body: { question: string; answer: string }) => apiPost('/cms/faqs', body),
        onSuccess: () => { invalidate(); toast('FAQ added'); },
    });

    const addProgram = useMutation({
        mutationFn: (body: Record<string, string>) => apiPost('/cms/programs', body),
        onSuccess: () => { invalidate(); toast('Course added'); },
    });

    const remove = async (path: string) => {
        await apiDelete(path);
        invalidate();
        toast('Deleted');
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Website CMS"
                subtitle="Manage guest app & marketing content (synced with mobile app guest mode)"
            />

            <div className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={cn(
                            'rounded-xl px-4 py-2 text-sm font-semibold transition',
                            tab === t.id ? 'bg-emerald-600 text-white' : 'bg-white/80 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {isLoading ? <p className="admin-page-sub">Loading...</p> : (
                <Card>
                    <CardBody className="space-y-4">
                        {tab === 'general' && (
                            <>
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100">
                                    <p className="font-semibold">Mobile Guest Home</p>
                                    <p className="mt-1 text-xs opacity-90">
                                        <strong>CMS (recommended)</strong> = mobile Home / Courses / Explore / More
                                        Super Admin ke Faculty, Courses, Boards, Gallery dikhate hain.
                                        <strong> WordPress</strong> = sirf confostudy.com WebView (site down ho to timeout / Domain undefined).
                                    </p>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium">Guest home source</label>
                                    <select
                                        className="admin-input w-full px-3 py-2 text-sm"
                                        value={settings.guest_home_mode}
                                        disabled={!canEdit}
                                        onChange={(e) => setSettings((p) => ({ ...p, guest_home_mode: e.target.value as 'wordpress' | 'cms' }))}
                                    >
                                        <option value="cms">CMS — Super Admin data in app (recommended)</option>
                                        <option value="wordpress">WordPress website WebView</option>
                                    </select>
                                </div>
                                <Input
                                    label="WordPress Home URL"
                                    value={settings.wordpress_home_url}
                                    onChange={(e) => setSettings((p) => ({ ...p, wordpress_home_url: e.target.value }))}
                                    disabled={!canEdit}
                                    placeholder="https://confostudy.com/"
                                />
                                <Input label="Tagline" value={settings.tagline} onChange={(e) => setSettings((p) => ({ ...p, tagline: e.target.value }))} disabled={!canEdit} />
                                <Input label="Admission Badge" value={settings.admission_badge} onChange={(e) => setSettings((p) => ({ ...p, admission_badge: e.target.value }))} disabled={!canEdit} />
                                <label className="block text-sm font-medium admin-page-title">About</label>
                                <textarea className="admin-input min-h-32 w-full" value={settings.about} onChange={(e) => setSettings((p) => ({ ...p, about: e.target.value }))} disabled={!canEdit} />
                                {canEdit && <Button onClick={() => saveSettings.mutate()} loading={saveSettings.isPending}><Save className="h-4 w-4" /> Save</Button>}
                            </>
                        )}

                        {tab === 'images' && (
                            <>
                                {(['hero', 'classroom', 'students', 'school', 'about'] as const).map((key) => (
                                    <Input key={key} label={key} value={images[key]} onChange={(e) => setImages((p) => ({ ...p, [key]: e.target.value }))} disabled={!canEdit} />
                                ))}
                                {canEdit && <Button onClick={() => saveImages.mutate()} loading={saveImages.isPending}><Save className="h-4 w-4" /> Save Images</Button>}
                            </>
                        )}

                        {tab === 'stats' && <ListSection
                            items={data?.stats ?? []}
                            canEdit={canEdit}
                            onAdd={() => addStat.mutate({ label: 'New Stat', value: '100+' })}
                            onDelete={(id) => remove(`/cms/stats/${id}`)}
                            render={(item) => <span>{item.label}: <strong>{item.value}</strong></span>}
                        />}

                        {tab === 'faculty' && <ListSection
                            items={data?.faculty ?? []}
                            canEdit={canEdit}
                            onAdd={() => addFaculty.mutate({ name: 'New Teacher', subject: 'Subject', classes: 'IX–X' })}
                            onDelete={(id) => remove(`/cms/faculty/${id}`)}
                            render={(item) => <span>{item.name} — {item.subject}</span>}
                        />}

                        {tab === 'gallery' && <ListSection
                            items={data?.gallery ?? []}
                            canEdit={canEdit}
                            onAdd={() => addGallery.mutate({ title: 'New Image', image_url: 'https://' })}
                            onDelete={(id) => remove(`/cms/gallery/${id}`)}
                            render={(item) => <span>{item.title || 'Image'}</span>}
                        />}

                        {tab === 'faqs' && <ListSection
                            items={data?.faqs ?? []}
                            canEdit={canEdit}
                            onAdd={() => addFaq.mutate({ question: 'New question?', answer: 'Answer here.' })}
                            onDelete={(id) => remove(`/cms/faqs/${id}`)}
                            render={(item) => <span>{item.question}</span>}
                        />}

                        {tab === 'programs' && <ListSection
                            items={data?.programs ?? []}
                            canEdit={canEdit}
                            onAdd={() => addProgram.mutate({ name: 'New Course', type: 'Course', class: 'All boards' })}
                            onDelete={(id) => remove(`/cms/programs/${id}`)}
                            render={(item) => <span>{item.name} ({item.type})</span>}
                        />}
                    </CardBody>
                </Card>
            )}
        </div>
    );
}

function ListSection<T extends { id: number }>({
    items, canEdit, onAdd, onDelete, render,
}: {
    items: T[];
    canEdit: boolean;
    onAdd: () => void;
    onDelete: (id: number) => void;
    render: (item: T) => React.ReactNode;
}) {
    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="text-sm admin-page-sub">{render(item)}</div>
                    {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    )}
                </div>
            ))}
            {canEdit && (
                <Button variant="secondary" onClick={onAdd}><Plus className="h-4 w-4" /> Add</Button>
            )}
        </div>
    );
}
