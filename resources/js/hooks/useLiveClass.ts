import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

export interface LiveSubject {
    id: number;
    name: string;
}

export interface LiveClassStatus {
    live_class_id: number;
    status: string;
    active_subject_id: number | null;
    active_subject_name: string | null;
    subjects: LiveSubject[];
    expected: number;
    present_now: number;
    attended: number;
    absent: number;
    present_names?: string[];
    ends_at: string | null;
    recording_url: string | null;
    has_recording: boolean;
    can_manage?: boolean;
}

export interface LiveMonitorStudent {
    student_id: number;
    name: string;
    roll_no: string | null;
    minutes_attended: number;
    status: 'present' | 'left' | 'absent';
    fee_cleared?: boolean;
    last_seen_at: string | null;
}

export interface LiveMonitorData {
    live_class_id: number;
    title: string;
    status: string;
    class_name?: string;
    subject_name?: string;
    active_subject_id?: number;
    active_subject_name?: string;
    subjects?: LiveSubject[];
    expected: number;
    present_now: number;
    attended: number;
    absent: number;
    present_names?: string[];
    youtube_concurrent_viewers: number | null;
    recording_url?: string | null;
    has_recording?: boolean;
    students: LiveMonitorStudent[];
    pagination?: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
    };
}

export function useLiveClassStatus(id: string | undefined, enabled = true) {
    return useQuery({
        queryKey: ['live-class-status', id],
        queryFn: () => apiGet<LiveClassStatus>(`/live-classes/${id}/status`),
        enabled: !!id && enabled,
        refetchInterval: 20_000,
        staleTime: 10_000,
    });
}

export function useLiveClassMonitor(
    id: string | undefined,
    options: { enabled?: boolean; page?: number; search?: string; perPage?: number } = {},
) {
    const { enabled = true, page = 1, search = '', perPage = 50 } = options;

    return useQuery({
        queryKey: ['live-class-monitor', id, page, search, perPage],
        queryFn: () => apiGet<LiveMonitorData>(`/live-classes/${id}/monitor`, {
            page,
            per_page: perPage,
            ...(search ? { search } : {}),
        }),
        enabled: !!id && enabled,
        placeholderData: (prev) => prev,
        staleTime: 5_000,
        refetchInterval: enabled ? 10_000 : false,
    });
}

export function useLiveClassMutations(id: string | undefined) {
    const qc = useQueryClient();

    const invalidate = () => {
        void qc.invalidateQueries({ queryKey: ['live-classes'] });
        void qc.invalidateQueries({ queryKey: ['live-class-status', id] });
        void qc.invalidateQueries({ queryKey: ['live-class-monitor', id] });
        void qc.invalidateQueries({ queryKey: ['live-class-join', id] });
    };

    const setActiveSubject = useMutation({
        mutationFn: (subjectId: number) =>
            apiPost(`/live-classes/${id}/active-subject`, { subject_id: subjectId }),
        onSuccess: () => invalidate(),
    });

    const endClass = useMutation({
        mutationFn: () => apiPost(`/live-classes/${id}/end`),
        onSuccess: () => invalidate(),
    });

    return { setActiveSubject, endClass, invalidate };
}

export function useDebouncedValue<T>(value: T, delayMs = 350): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timer);
    }, [value, delayMs]);
    return debounced;
}

export function useLiveClassResources(classId?: number, subjectId?: number, liveClassId?: number, enabled = false) {
    // Class materials for Open Class screen — do not require live_class_id match
    // so already-uploaded notes/PDFs for the class still appear.
    const params = { class_id: classId, subject_id: subjectId, per_page: 20 };
    void liveClassId;

    const assignments = useQuery({
        queryKey: ['live-resources-assignments', classId, subjectId],
        queryFn: () => apiGet('/assignments', params),
        enabled: enabled && !!classId && !!subjectId,
        staleTime: 60_000,
    });

    const exams = useQuery({
        queryKey: ['live-resources-exams', classId, subjectId],
        queryFn: () => apiGet('/exams', params),
        enabled: enabled && !!classId && !!subjectId,
        staleTime: 60_000,
    });

    const materials = useQuery({
        queryKey: ['live-resources-materials', classId, subjectId],
        queryFn: () => apiGet('/materials', params),
        enabled: enabled && !!classId,
        staleTime: 30_000,
    });

    const quizzes = useQuery({
        queryKey: ['live-resources-quizzes', classId, subjectId],
        queryFn: () => apiGet('/quizzes', { class_id: classId, subject_id: subjectId, per_page: 20 }),
        enabled: enabled && !!classId,
        staleTime: 30_000,
    });

    return { assignments, exams, materials, quizzes };
}
