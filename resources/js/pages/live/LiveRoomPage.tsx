import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/brand/BrandLoader';
import {
    ArrowLeft, Copy, Radio, Video, BookOpen, FileText,
    ClipboardList, MessageSquare, Activity, CircleStop, Monitor,
    ChevronLeft, ChevronRight, Camera, LayoutGrid, HelpCircle,
} from 'lucide-react';
import {
    useLiveClassStatus,
    useLiveClassMonitor,
    useLiveClassMutations,
    useLiveClassResources,
    useDebouncedValue,
    type LiveSubject,
} from '@/hooks/useLiveClass';

interface JoinConfig {
    platform: 'youtube' | 'jitsi';
    mode: 'live' | 'recording';
    video_id?: string;
    domain?: string;
    room?: string;
    display_name?: string;
    title: string;
    is_moderator?: boolean;
    heartbeat_interval_seconds?: number;
    can_monitor?: boolean;
    youtube_studio_url?: string | null;
    class_name?: string;
    subject_name?: string;
    active_subject_id?: number;
    active_subject_name?: string;
    subjects?: LiveSubject[];
    teacher_name?: string;
    status?: string;
    ends_at?: string | null;
    school_class_id?: number;
    interactive_classroom_ready?: boolean;
    youtube_student_controls?: { mic: boolean; camera: boolean; raise_hand: boolean };
}

interface ObsData {
    rtmp_url: string | null;
    stream_key: string | null;
    studio_url: string | null;
}

interface MaterialRow {
    id: number;
    title?: string;
    name?: string;
    view_url?: string | null;
    can_open?: boolean;
    mime_type?: string | null;
}

type TeacherTab = 'overview' | 'attendance' | 'materials' | 'quiz' | 'obs' | 'activity';

declare global {
    interface Window {
        JitsiMeetExternalAPI?: new (
            domain: string,
            options: Record<string, unknown>
        ) => { dispose: () => void };
    }
}

async function authFetchBlob(url: string): Promise<Blob> {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(url.startsWith('http') ? url : url, {
        headers: {
            Accept: '*/*',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Requested-With': 'XMLHttpRequest',
        },
    });
    if (!res.ok) throw new Error('Failed to load file');
    return res.blob();
}

function StatusBadge({ status }: { status?: string }) {
    const colors: Record<string, string> = {
        live: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
        scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
        completed: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
        cancelled: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    };
    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${colors[status ?? ''] ?? colors.scheduled}`}>
            {status ?? 'unknown'}
        </span>
    );
}

function PanelResizeHandle({ onDrag }: { onDrag: (dx: number) => void }) {
    return (
        <div
            role="separator"
            aria-orientation="vertical"
            className="group relative z-10 w-2 shrink-0 cursor-col-resize bg-stone-800/80 hover:bg-emerald-600"
            onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const move = (ev: MouseEvent) => onDrag(ev.clientX - startX);
                const up = () => {
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', up);
                };
                // Accumulate from last frame — reset start each move via closure update
                let last = startX;
                const moveAcc = (ev: MouseEvent) => {
                    onDrag(ev.clientX - last);
                    last = ev.clientX;
                };
                window.addEventListener('mousemove', moveAcc);
                window.addEventListener('mouseup', up);
            }}
        >
            <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-stone-500 group-hover:bg-white" />
        </div>
    );
}

function WebcamPreview({ enabled }: { enabled: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) {
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            return;
        }
        let cancelled = false;
        navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
            .then((stream) => {
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setError(null);
            })
            .catch(() => setError('Camera permission chahiye (OBS / Superadmin preview).'));

        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
    }, [enabled]);

    if (!enabled) {
        return (
            <div className="flex h-full items-center justify-center bg-stone-950 text-xs text-stone-500">
                Webcam off
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center bg-stone-950 p-3 text-center text-xs text-amber-400">
                {error}
            </div>
        );
    }

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
        />
    );
}

export default function LiveRoomPage() {
    const { id } = useParams<{ id: string }>();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<{ dispose: () => void } | null>(null);
    const [scriptReady, setScriptReady] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [teacherTab, setTeacherTab] = useState<TeacherTab>('overview');
    const [attendancePage, setAttendancePage] = useState(1);
    const [attendanceSearch, setAttendanceSearch] = useState('');
    const debouncedSearch = useDebouncedValue(attendanceSearch);
    const mode = params.get('mode') === 'recording' ? 'recording' : 'live';

    // Multi-panel widths (% of main stage) — video | material | webcam
    const [videoPct, setVideoPct] = useState(50);
    const [materialPct, setMaterialPct] = useState(30);
    const [showMaterialPanel, setShowMaterialPanel] = useState(true);
    const [showWebcamPanel, setShowWebcamPanel] = useState(true);
    const [webcamOn, setWebcamOn] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<MaterialRow | null>(null);
    const [materialPreviewUrl, setMaterialPreviewUrl] = useState<string | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['live-class-join', id, mode],
        queryFn: () => apiGet<JoinConfig>(`/live-classes/${id}/join`, { mode }),
        enabled: !!id,
        retry: false,
        staleTime: 30_000,
    });

    const isTeacher = !!data?.can_monitor && mode !== 'recording';
    const { data: status } = useLiveClassStatus(id, isTeacher);
    const { data: monitor } = useLiveClassMonitor(id, {
        enabled: isTeacher && (teacherTab === 'attendance' || teacherTab === 'overview'),
        page: attendancePage,
        search: debouncedSearch,
        perPage: 80,
    });
    const { setActiveSubject, endClass } = useLiveClassMutations(id);
    const activeSubjectId = status?.active_subject_id ?? data?.active_subject_id;
    const classId = data?.school_class_id;

    const resourcesEnabled = !!classId && (isTeacher || !!data);
    const { assignments, exams, materials, quizzes } = useLiveClassResources(
        classId,
        activeSubjectId ?? undefined,
        id ? Number(id) : undefined,
        resourcesEnabled && (isTeacher ? ['materials', 'quiz', 'overview'].includes(teacherTab) || showMaterialPanel : showMaterialPanel),
    );

    const { data: obs } = useQuery({
        queryKey: ['live-class-obs', id],
        queryFn: () => apiGet<ObsData>(`/live-classes/${id}/obs`),
        enabled: !!id && isTeacher && (teacherTab === 'obs' || teacherTab === 'overview'),
        staleTime: 120_000,
    });

    const openMaterialInPanel = useCallback(async (row: MaterialRow) => {
        if (!row.view_url || !row.can_open) return;
        setSelectedMaterial(row);
        setShowMaterialPanel(true);
        if (materialPreviewUrl) URL.revokeObjectURL(materialPreviewUrl);
        setMaterialPreviewUrl(null);
        try {
            const blob = await authFetchBlob(row.view_url);
            setMaterialPreviewUrl(URL.createObjectURL(blob));
        } catch {
            setMaterialPreviewUrl(null);
        }
    }, [materialPreviewUrl]);

    useEffect(() => () => {
        if (materialPreviewUrl) URL.revokeObjectURL(materialPreviewUrl);
    }, [materialPreviewUrl]);

    useEffect(() => {
        if (data?.platform !== 'jitsi') return;
        if (document.getElementById('jitsi-external-api')) {
            setScriptReady(true);
            return;
        }
        const script = document.createElement('script');
        script.id = 'jitsi-external-api';
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => setScriptReady(true);
        document.body.appendChild(script);
    }, [data?.platform]);

    useEffect(() => {
        if (!data || data.platform !== 'jitsi' || !scriptReady || !containerRef.current || !window.JitsiMeetExternalAPI) {
            return;
        }

        apiRef.current?.dispose();
        containerRef.current.innerHTML = '';

        apiRef.current = new window.JitsiMeetExternalAPI(data.domain!, {
            roomName: data.room,
            parentNode: containerRef.current,
            userInfo: { displayName: data.display_name },
            configOverwrite: {
                startWithAudioMuted: !data.is_moderator,
                startWithVideoMuted: false,
                prejoinPageEnabled: true,
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                MOBILE_APP_PROMO: false,
            },
        });

        return () => {
            apiRef.current?.dispose();
            apiRef.current = null;
        };
    }, [data, scriptReady]);

    useEffect(() => {
        if (!id || !data) return;
        const seconds = data.heartbeat_interval_seconds ?? 30;
        const tick = () => {
            apiPost(`/live-classes/${id}/heartbeat`, { seconds, device: 'web' }).catch(() => undefined);
        };
        tick();
        const timer = window.setInterval(tick, seconds * 1000);
        return () => window.clearInterval(timer);
    }, [id, data]);

    // Auto-enable teacher webcam panel for Open Class composition
    useEffect(() => {
        if (isTeacher) {
            setShowWebcamPanel(true);
            setShowMaterialPanel(true);
        }
    }, [isTeacher]);

    const copy = async (label: string, value: string) => {
        await navigator.clipboard.writeText(value);
        setCopied(label);
        window.setTimeout(() => setCopied(null), 1500);
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <BrandLoader size="lg" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
                <p className="text-stone-600 dark:text-stone-400">Cannot join this class. Fee payment may be required.</p>
                <Button onClick={() => navigate('/app/live-classes')}>
                    <ArrowLeft className="h-4 w-4" /> Back to Live Classes
                </Button>
            </div>
        );
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const embedSrc = data.platform === 'youtube' && data.video_id
        ? `https://www.youtube-nocookie.com/embed/${data.video_id}?autoplay=1&modestbranding=1&rel=0&disablekb=1&playsinline=1&origin=${encodeURIComponent(origin)}`
        : null;

    const subjects = status?.subjects ?? data.subjects ?? [];
    const currentSubject = status?.active_subject_name ?? data.active_subject_name ?? data.subject_name;
    const liveStatus = status?.status ?? data.status;
    const presentNames = monitor?.present_names ?? status?.present_names ?? [];
    const materialRows = ((materials.data as { data?: MaterialRow[] })?.data ?? []) as MaterialRow[];
    const quizRows = ((quizzes.data as { data?: Array<{ id: number; title?: string; name?: string }> })?.data ?? []);

    const webcamPct = showWebcamPanel ? Math.max(12, 100 - videoPct - (showMaterialPanel ? materialPct : 0)) : 0;
    const matPct = showMaterialPanel ? materialPct : 0;
    const vidPct = showWebcamPanel || showMaterialPanel ? videoPct : 100;

    const teacherTabs: { key: TeacherTab; label: string; icon: typeof Radio }[] = [
        { key: 'overview', label: 'Live', icon: Radio },
        { key: 'attendance', label: 'Attendance', icon: Activity },
        { key: 'materials', label: 'Materials', icon: BookOpen },
        { key: 'quiz', label: 'Quiz', icon: HelpCircle },
        { key: 'obs', label: 'OBS', icon: Monitor },
        { key: 'activity', label: 'Activity', icon: MessageSquare },
    ];

    return (
        <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex min-h-[calc(100vh-8rem)] min-w-0 flex-1 flex-col gap-3">
                <PageHeader
                    title={data.title}
                    subtitle={[
                        currentSubject,
                        data.class_name,
                        data.mode === 'recording' ? 'Recording' : 'Open Class',
                    ].filter(Boolean).join(' · ')}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {(isTeacher || showMaterialPanel) && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowMaterialPanel(v => !v)}
                                    title="Toggle materials panel"
                                >
                                    <LayoutGrid className="h-4 w-4" /> Materials
                                </Button>
                            )}
                            {isTeacher && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setShowWebcamPanel(v => !v);
                                        if (!webcamOn) setWebcamOn(true);
                                    }}
                                >
                                    <Camera className="h-4 w-4" /> Webcam
                                </Button>
                            )}
                            <Link to={data.mode === 'recording' ? '/app/recordings' : '/app/live-classes'}>
                                <Button variant="secondary" size="sm">
                                    <ArrowLeft className="h-4 w-4" /> Exit
                                </Button>
                            </Link>
                        </div>
                    }
                />

                {subjects.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900">
                        <span className="text-stone-500">Current subject:</span>
                        {subjects.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                disabled={!isTeacher || setActiveSubject.isPending}
                                onClick={() => isTeacher && setActiveSubject.mutate(s.id)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                    s.id === activeSubjectId
                                        ? 'bg-emerald-600 text-white'
                                        : isTeacher
                                            ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200'
                                            : 'bg-stone-100 text-stone-500 dark:bg-stone-800'
                                }`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}

                {isTeacher && data.youtube_studio_url && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
                        <Video className="me-1 inline h-4 w-4" />
                        Phone live: <a className="font-semibold underline" href={data.youtube_studio_url} target="_blank" rel="noopener noreferrer">YouTube Studio</a>
                        {' · '}OBS: sidebar → OBS tab · Screen pe Video + Material + Webcam resize karke rakho.
                    </div>
                )}

                {/* Triple panel stage: Video | Material | Webcam */}
                <div className="flex min-h-[420px] flex-1 overflow-hidden rounded-xl border border-stone-200 bg-black dark:border-stone-700">
                    <div style={{ width: `${vidPct}%` }} className="relative min-w-[20%] shrink-0">
                        {embedSrc ? (
                            <iframe
                                title={data.title}
                                src={embedSrc}
                                className="h-full min-h-[420px] w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                referrerPolicy="strict-origin-when-cross-origin"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                        ) : (
                            <div ref={containerRef} className="h-full min-h-[420px] w-full" />
                        )}
                        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Video</span>
                    </div>

                    {showMaterialPanel && (
                        <>
                            <PanelResizeHandle onDrag={(dx) => {
                                setVideoPct(p => Math.min(70, Math.max(25, p + (dx / window.innerWidth) * 100)));
                                setMaterialPct(p => Math.min(50, Math.max(15, p - (dx / window.innerWidth) * 100)));
                            }} />
                            <div style={{ width: `${matPct}%` }} className="flex min-w-[15%] flex-col bg-stone-950">
                                <div className="flex items-center justify-between border-b border-stone-800 px-2 py-1.5">
                                    <span className="text-[10px] font-semibold uppercase text-stone-300">Material</span>
                                    <button type="button" className="text-[10px] text-stone-500 hover:text-white" onClick={() => setShowMaterialPanel(false)}>Hide</button>
                                </div>
                                {materialPreviewUrl ? (
                                    <iframe title="Material preview" src={materialPreviewUrl} className="min-h-0 flex-1 w-full bg-white" />
                                ) : (
                                    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
                                        <p className="mb-1 text-[10px] text-stone-500">Teacher-uploaded notes / PDF — click to open on screen</p>
                                        {materialRows.length === 0 && (
                                            <p className="text-xs text-stone-500">No materials yet. Upload from Materials module.</p>
                                        )}
                                        {materialRows.map(m => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                disabled={!m.can_open || !m.view_url}
                                                onClick={() => void openMaterialInPanel(m)}
                                                className="rounded-lg border border-stone-800 bg-stone-900 px-2 py-1.5 text-left text-xs text-stone-200 hover:border-emerald-600 disabled:opacity-40"
                                            >
                                                <FileText className="me-1 inline h-3 w-3" />
                                                {m.title ?? m.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedMaterial && materialPreviewUrl && (
                                    <button
                                        type="button"
                                        className="border-t border-stone-800 px-2 py-1 text-[10px] text-emerald-400"
                                        onClick={() => {
                                            setSelectedMaterial(null);
                                            if (materialPreviewUrl) URL.revokeObjectURL(materialPreviewUrl);
                                            setMaterialPreviewUrl(null);
                                        }}
                                    >
                                        ← Back to list ({selectedMaterial.title})
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {isTeacher && showWebcamPanel && (
                        <>
                            <PanelResizeHandle onDrag={(dx) => {
                                setMaterialPct(p => Math.min(50, Math.max(15, p + (dx / window.innerWidth) * 100)));
                            }} />
                            <div style={{ width: `${webcamPct}%` }} className="relative flex min-w-[12%] flex-col bg-stone-950">
                                <div className="flex items-center justify-between border-b border-stone-800 px-2 py-1.5">
                                    <span className="text-[10px] font-semibold uppercase text-stone-300">Webcam</span>
                                    <button
                                        type="button"
                                        className="text-[10px] text-emerald-400"
                                        onClick={() => setWebcamOn(v => !v)}
                                    >
                                        {webcamOn ? 'Stop' : 'Start'}
                                    </button>
                                </div>
                                <div className="min-h-0 flex-1">
                                    <WebcamPreview enabled={webcamOn} />
                                </div>
                                <p className="border-t border-stone-800 px-2 py-1 text-[10px] text-stone-500">
                                    Local preview — students YouTube/OBS se dekhte hain
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <p className="text-xs text-stone-500">
                    Drag vertical bars to resize Video · Material · Webcam. OBS se stream push karo; portal Open Class se control + attendance.
                </p>
            </div>

            {isTeacher && (
                <aside className="w-full shrink-0 space-y-3 lg:w-96">
                    <div className="flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900">
                        {teacherTabs.map(t => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setTeacherTab(t.key)}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                                    teacherTab === t.key
                                        ? 'bg-emerald-600 text-white'
                                        : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                                }`}
                            >
                                <t.icon className="h-3.5 w-3.5" /> {t.label}
                            </button>
                        ))}
                    </div>

                    {teacherTab === 'overview' && (
                        <div className="space-y-3">
                            <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold">Live status</p>
                                    <StatusBadge status={liveStatus} />
                                </div>
                                <dl className="mt-3 space-y-2 text-sm">
                                    <div className="flex justify-between"><dt className="text-stone-500">Subject</dt><dd>{currentSubject}</dd></div>
                                    <div className="flex justify-between"><dt className="text-stone-500">Active students</dt><dd>{status?.expected ?? '—'} total</dd></div>
                                    <div className="flex justify-between"><dt className="text-stone-500">Joined now</dt><dd className="font-semibold text-emerald-600">{status?.present_now ?? '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-stone-500">Attendance</dt><dd>{status?.attended ?? '—'} joined · {status?.absent ?? '—'} absent</dd></div>
                                    <div className="flex justify-between"><dt className="text-stone-500">Ends</dt><dd>{status?.ends_at ?? data.ends_at ?? '—'}</dd></div>
                                </dl>
                                {presentNames.length > 0 && (
                                    <div className="mt-3 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20">
                                        <p className="mb-1 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">Present now</p>
                                        <p className="text-xs text-emerald-900 dark:text-emerald-100">{presentNames.join(', ')}</p>
                                    </div>
                                )}
                                {liveStatus !== 'completed' && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="mt-4 w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                                        loading={endClass.isPending}
                                        onClick={() => {
                                            if (window.confirm('End this live class for all students?')) {
                                                endClass.mutate(undefined, { onSuccess: () => navigate('/app/live-classes') });
                                            }
                                        }}
                                    >
                                        <CircleStop className="h-4 w-4" /> End Class
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {teacherTab === 'attendance' && (
                        <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                            <p className="mb-2 flex items-center gap-1 font-semibold">
                                <Radio className="h-4 w-4 text-red-600" /> Active students
                            </p>
                            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20"><p className="text-lg font-bold">{monitor?.present_now ?? status?.present_now ?? 0}</p>Now</div>
                                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20"><p className="text-lg font-bold">{monitor?.attended ?? status?.attended ?? 0}</p>Joined</div>
                                <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20"><p className="text-lg font-bold">{monitor?.absent ?? status?.absent ?? 0}</p>Absent</div>
                            </div>
                            <input
                                type="search"
                                placeholder="Search name / roll…"
                                value={attendanceSearch}
                                onChange={e => { setAttendanceSearch(e.target.value); setAttendancePage(1); }}
                                className="admin-input mb-2 w-full px-2 py-1.5 text-xs"
                            />
                            <ul className="max-h-[50vh] space-y-1 overflow-y-auto text-xs">
                                {(monitor?.students ?? []).map(s => (
                                    <li
                                        key={s.student_id}
                                        className={`flex items-center justify-between gap-2 rounded-md border-b border-stone-100 px-1 py-1.5 dark:border-stone-800 ${
                                            s.status === 'present' ? 'bg-emerald-50/80 dark:bg-emerald-900/20' : ''
                                        }`}
                                    >
                                        <span className="font-medium text-stone-800 dark:text-stone-100">
                                            {s.roll_no ? `${s.roll_no} · ` : ''}{s.name}
                                            {s.fee_cleared === false && (
                                                <span className="ms-1 text-[10px] text-amber-600">fee due</span>
                                            )}
                                        </span>
                                        <span className={s.status === 'present' ? 'font-semibold text-emerald-600' : s.status === 'absent' ? 'text-amber-600' : 'text-stone-500'}>
                                            {s.status} · {s.minutes_attended}m
                                        </span>
                                    </li>
                                ))}
                                {!monitor?.students?.length && (
                                    <li className="py-4 text-center text-stone-500">Active student names load ho rahe hain…</li>
                                )}
                            </ul>
                            {monitor?.pagination && monitor.pagination.last_page > 1 && (
                                <div className="mt-2 flex items-center justify-between text-xs">
                                    <button type="button" disabled={attendancePage <= 1} onClick={() => setAttendancePage(p => p - 1)} className="flex items-center gap-1 disabled:opacity-40">
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </button>
                                    <span>Page {monitor.pagination.current_page} / {monitor.pagination.last_page}</span>
                                    <button type="button" disabled={attendancePage >= monitor.pagination.last_page} onClick={() => setAttendancePage(p => p + 1)} className="flex items-center gap-1 disabled:opacity-40">
                                        Next <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {teacherTab === 'materials' && (
                        <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                            <p className="font-semibold"><BookOpen className="me-1 inline h-4 w-4" /> Class materials</p>
                            <p className="text-xs text-stone-500">Click to show on the middle screen panel.</p>
                            <ul className="max-h-48 space-y-1 overflow-y-auto">
                                {materialRows.map(m => (
                                    <li key={m.id}>
                                        <button
                                            type="button"
                                            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                            onClick={() => void openMaterialInPanel(m)}
                                        >
                                            <FileText className="me-1 inline h-3.5 w-3.5" />{m.title ?? m.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div>
                                <p className="mb-1 flex items-center gap-1 text-xs font-medium"><ClipboardList className="h-3.5 w-3.5" /> Homework</p>
                                <ul className="space-y-1 text-xs">
                                    {(((assignments.data as { data?: Array<{ id: number; title?: string }> })?.data) ?? []).map(a => (
                                        <li key={a.id}><Link to="/app/homework" className="text-emerald-700 underline dark:text-emerald-400">{a.title}</Link></li>
                                    ))}
                                </ul>
                            </div>
                            <Link to="/app/materials" className="block text-xs text-emerald-700 underline">+ Upload notes / PDF</Link>
                        </div>
                    )}

                    {teacherTab === 'quiz' && (
                        <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                            <p className="font-semibold"><HelpCircle className="me-1 inline h-4 w-4" /> Live quiz</p>
                            <p className="text-xs text-stone-500">Open / create quiz for this class while class is running.</p>
                            <ul className="space-y-1">
                                {quizRows.map(q => (
                                    <li key={q.id}>
                                        <Link
                                            to={`/app/quizzes/${q.id}/attempt`}
                                            className="block rounded-lg px-2 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                                        >
                                            {q.title ?? q.name ?? `Quiz #${q.id}`}
                                        </Link>
                                    </li>
                                ))}
                                {!quizRows.length && <li className="text-xs text-stone-500">No quiz yet for this class/subject.</li>}
                            </ul>
                            <Link to="/app/quizzes" className="block text-xs text-emerald-700 underline">+ Create / manage quizzes</Link>
                            <div>
                                <p className="mb-1 text-xs font-medium">Exams</p>
                                <ul className="space-y-1 text-xs">
                                    {(((exams.data as { data?: Array<{ id: number; name?: string }> })?.data) ?? []).map(e => (
                                        <li key={e.id}><Link to="/app/exams" className="text-emerald-700 underline">{e.name}</Link></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {teacherTab === 'obs' && obs && (
                        <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm dark:border-stone-700 dark:bg-stone-900">
                            <p className="mb-2 font-semibold">OBS Live Stream</p>
                            <p className="mb-3 text-xs text-stone-500">
                                OBS scenes: Camera, Mic, PDF, Screen, PowerPoint. Portal pe Video+Material+Webcam pehle se compose kar sakte ho.
                            </p>
                            {obs.rtmp_url && (
                                <div className="mb-2">
                                    <p className="text-xs text-stone-500">Server (RTMP URL)</p>
                                    <button type="button" className="flex w-full items-center justify-between gap-2 break-all text-left" onClick={() => copy('rtmp', obs.rtmp_url!)}>
                                        <span>{obs.rtmp_url}</span><Copy className="h-3.5 w-3.5 shrink-0" />
                                    </button>
                                </div>
                            )}
                            {obs.stream_key && (
                                <div>
                                    <p className="text-xs text-stone-500">Stream key</p>
                                    <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => copy('key', obs.stream_key!)}>
                                        <span className="truncate font-mono">••••••••</span><Copy className="h-3.5 w-3.5 shrink-0" />
                                    </button>
                                </div>
                            )}
                            {copied && <p className="mt-2 text-xs text-emerald-600">Copied {copied}</p>}
                        </div>
                    )}

                    {teacherTab === 'activity' && (
                        <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                            <p className="font-semibold"><MessageSquare className="me-1 inline h-4 w-4" /> Activity</p>
                            <p className="text-xs text-stone-500">
                                Fee-paid students ko hi live/recording notification jati hai. Unpaid dashboard pe Live button nahi dikhta.
                            </p>
                            {presentNames.length > 0 && (
                                <p className="text-xs"><span className="font-semibold">Online:</span> {presentNames.join(', ')}</p>
                            )}
                        </div>
                    )}
                </aside>
            )}
        </div>
    );
}
