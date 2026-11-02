import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { asList } from '@/lib/listUtils';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
    AUDIT_EVENTS,
    CERT_TYPES,
    EXPENSE_CATEGORIES,
    LIBRARY_CATEGORIES,
    MONTHS,
    USER_ROLES,
    WEEKDAYS,
    statusOptions,
    type FilterOption,
    type StatusPreset,
} from '@/lib/filterOptions';

export type FilterFieldType =
    | 'status'
    | 'class'
    | 'subject'
    | 'exam'
    | 'student'
    | 'dateFrom'
    | 'dateTo'
    | 'day'
    | 'month'
    | 'year'
    | 'category'
    | 'role'
    | 'loginStatus'
    | 'event'
    | 'action'
    | 'name'
    | 'select'
    | 'text';

export interface FilterFieldConfig {
    type: FilterFieldType;
    key: string;
    label?: string;
    placeholder?: string;
    options?: FilterOption[];
    statusPreset?: StatusPreset;
}

interface AdvancedFiltersProps {
    fields: FilterFieldConfig[];
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
}

function useLookupOptions(types: Set<FilterFieldType>) {
    const needClasses = types.has('class');
    const needSubjects = types.has('subject');
    const needExams = types.has('exam');
    const needStudents = types.has('student');

    const { data: classes = [] } = useQuery({
        queryKey: ['classes-list'],
        queryFn: () => apiGet('/students/classes'),
        staleTime: 60_000,
        select: asList<{ id: number; name: string }>,
        enabled: needClasses,
    });

    const { data: subjectsData } = useQuery({
        queryKey: ['subjects-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/subjects', { per_page: 100 }),
        staleTime: 60_000,
        enabled: needSubjects,
    });

    const { data: examsData } = useQuery({
        queryKey: ['exams-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/exams', { per_page: 100 }),
        staleTime: 60_000,
        enabled: needExams,
    });

    const { data: studentsData } = useQuery({
        queryKey: ['students-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/students', { per_page: 100 }),
        staleTime: 60_000,
        enabled: needStudents,
    });

    return useMemo(() => ({
        classes: classes.map(c => ({ value: String(c.id), label: c.name })),
        subjects: (subjectsData?.data ?? []).map(s => ({ value: String(s.id), label: s.name })),
        exams: (examsData?.data ?? []).map(e => ({ value: String(e.id), label: e.name })),
        students: (studentsData?.data ?? []).map(s => ({ value: String(s.id), label: s.name })),
    }), [classes, subjectsData, examsData, studentsData]);
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: FilterOption[] = Array.from({ length: 6 }, (_, i) => {
    const y = String(CURRENT_YEAR - i);
    return { value: y, label: y };
});

function renderField(
    field: FilterFieldConfig,
    value: string,
    onChange: (key: string, value: string) => void,
    lookups: ReturnType<typeof useLookupOptions>,
) {
    const key = field.key;
    const set = (v: string) => onChange(key, v);

    switch (field.type) {
        case 'status':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Status'}
                    value={value}
                    onChange={set}
                    placeholder="All Status"
                    options={field.statusPreset ? statusOptions(field.statusPreset) : (field.options ?? statusOptions('active'))}
                />
            );
        case 'class':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Class'}
                    value={value}
                    onChange={set}
                    placeholder="All Classes"
                    options={lookups.classes}
                />
            );
        case 'subject':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Subject'}
                    value={value}
                    onChange={set}
                    placeholder="All Subjects"
                    options={lookups.subjects}
                />
            );
        case 'exam':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Exam'}
                    value={value}
                    onChange={set}
                    placeholder="All Exams"
                    options={lookups.exams}
                />
            );
        case 'student':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Student'}
                    value={value}
                    onChange={set}
                    placeholder="All Students"
                    options={lookups.students}
                />
            );
        case 'dateFrom':
            return (
                <Input
                    key={key}
                    label={field.label ?? 'From Date'}
                    type="date"
                    value={value}
                    onChange={e => set(e.target.value)}
                />
            );
        case 'dateTo':
            return (
                <Input
                    key={key}
                    label={field.label ?? 'To Date'}
                    type="date"
                    value={value}
                    onChange={e => set(e.target.value)}
                />
            );
        case 'day':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Day'}
                    value={value}
                    onChange={set}
                    placeholder="All Days"
                    options={field.options ?? WEEKDAYS}
                />
            );
        case 'month':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Month'}
                    value={value}
                    onChange={set}
                    placeholder="All Months"
                    options={field.options ?? MONTHS}
                />
            );
        case 'year':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Year'}
                    value={value}
                    onChange={set}
                    placeholder="All Years"
                    options={field.options ?? YEAR_OPTIONS}
                />
            );
        case 'category':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Category'}
                    value={value}
                    onChange={set}
                    placeholder="All Categories"
                    options={field.options ?? EXPENSE_CATEGORIES}
                />
            );
        case 'role':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Role'}
                    value={value}
                    onChange={set}
                    placeholder="All Roles"
                    options={field.options ?? USER_ROLES}
                />
            );
        case 'loginStatus':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Login Status'}
                    value={value}
                    onChange={set}
                    placeholder="All Login Status"
                    options={field.options ?? statusOptions('loginAccount')}
                />
            );
        case 'event':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Event'}
                    value={value}
                    onChange={set}
                    placeholder="All Events"
                    options={field.options ?? AUDIT_EVENTS}
                />
            );
        case 'action':
            return (
                <Input
                    key={key}
                    label={field.label ?? 'Action'}
                    placeholder={field.placeholder ?? 'Filter by action...'}
                    value={value}
                    onChange={e => set(e.target.value)}
                />
            );
        case 'name':
            return (
                <Input
                    key={key}
                    label={field.label ?? 'Name'}
                    placeholder={field.placeholder ?? 'Filter by name...'}
                    value={value}
                    onChange={e => set(e.target.value)}
                />
            );
        case 'text':
            return (
                <Input
                    key={key}
                    label={field.label ?? 'Filter'}
                    placeholder={field.placeholder}
                    value={value}
                    onChange={e => set(e.target.value)}
                />
            );
        case 'select':
            return (
                <Select
                    key={key}
                    label={field.label ?? 'Filter'}
                    value={value}
                    onChange={set}
                    placeholder={field.placeholder ?? 'All'}
                    options={field.options ?? []}
                />
            );
        default:
            return null;
    }
}

export function AdvancedFilters({ fields, values, onChange }: AdvancedFiltersProps) {
    const lookupTypes = useMemo(
        () => new Set(fields.map(f => f.type)),
        [fields],
    );
    const lookups = useLookupOptions(lookupTypes);

    if (!fields.length) return null;

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {fields.map(field => renderField(field, values[field.key] ?? '', onChange, lookups))}
        </div>
    );
}

export { EXPENSE_CATEGORIES, LIBRARY_CATEGORIES, CERT_TYPES };
