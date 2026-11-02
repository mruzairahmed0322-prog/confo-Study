import { AdvancedFilters, type FilterFieldConfig } from '@/components/filters/AdvancedFilters';
import { usePagedList } from '@/hooks/usePagedList';

export const FILTER_PRESETS = {
    students: [
        { type: 'name', key: 'name', label: 'Student Name' },
        { type: 'status', key: 'status', statusPreset: 'student' },
        { type: 'class', key: 'class_id' },
        { type: 'dateFrom', key: 'from', label: 'Admitted From' },
        { type: 'dateTo', key: 'to', label: 'Admitted To' },
    ] as FilterFieldConfig[],
    parents: [
        { type: 'name', key: 'name', label: 'Parent Name' },
        { type: 'loginStatus', key: 'login_status' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
    classes: [
        { type: 'name', key: 'name', label: 'Class Name' },
        { type: 'status', key: 'status', statusPreset: 'active' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
    users: [
        { type: 'name', key: 'name', label: 'User Name' },
        { type: 'role', key: 'role' },
        { type: 'loginStatus', key: 'login_status' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
    teachers: [
        { type: 'name', key: 'name', label: 'Teacher Name' },
        { type: 'status', key: 'status', statusPreset: 'active' },
        { type: 'subject', key: 'subject_id' },
        { type: 'dateFrom', key: 'from', label: 'Joined From' },
        { type: 'dateTo', key: 'to', label: 'Joined To' },
    ] as FilterFieldConfig[],
    subjects: [
        { type: 'name', key: 'name', label: 'Subject Name' },
        { type: 'class', key: 'class_id' },
        { type: 'status', key: 'status', statusPreset: 'active' },
    ] as FilterFieldConfig[],
    assignments: [
        { type: 'name', key: 'name', label: 'Title' },
        { type: 'status', key: 'status', statusPreset: 'homework' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'dateFrom', key: 'from', label: 'Due From' },
        { type: 'dateTo', key: 'to', label: 'Due To' },
    ] as FilterFieldConfig[],
    quizzes: [
        { type: 'name', key: 'name', label: 'Quiz Title' },
        { type: 'status', key: 'status', statusPreset: 'quiz' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
    ] as FilterFieldConfig[],
    liveClasses: [
        { type: 'name', key: 'name', label: 'Class Title' },
        { type: 'status', key: 'status', statusPreset: 'live' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'dateFrom', key: 'from', label: 'Scheduled From' },
        { type: 'dateTo', key: 'to', label: 'Scheduled To' },
    ] as FilterFieldConfig[],
    recordings: [
        { type: 'name', key: 'name', label: 'Recording Title' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
    materials: [
        { type: 'name', key: 'name', label: 'Title' },
        { type: 'select', key: 'status', label: 'Status', options: [
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
        ]},
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'select', key: 'type', label: 'Type', options: [
            { value: 'notes', label: 'Notes' },
            { value: 'pdf', label: 'PDF' },
            { value: 'book', label: 'Book' },
            { value: 'magazine', label: 'Magazine' },
            { value: 'document', label: 'Document' },
            { value: 'study_material', label: 'Study Material' },
            { value: 'image', label: 'Image' },
            { value: 'other', label: 'Other' },
        ]},
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
    exams: [
        { type: 'name', key: 'name', label: 'Exam Name' },
        { type: 'status', key: 'status', statusPreset: 'exam' },
        { type: 'class', key: 'class_id' },
        { type: 'dateFrom', key: 'from', label: 'Start From' },
        { type: 'dateTo', key: 'to', label: 'Start To' },
    ] as FilterFieldConfig[],
    results: [
        { type: 'name', key: 'name', label: 'Student Name' },
        { type: 'exam', key: 'exam_id' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'student', key: 'student_id' },
    ] as FilterFieldConfig[],
    fees: [
        { type: 'name', key: 'name', label: 'Student Name' },
        { type: 'status', key: 'status', statusPreset: 'fee' },
        { type: 'class', key: 'class_id' },
        { type: 'dateFrom', key: 'from', label: 'Due From' },
        { type: 'dateTo', key: 'to', label: 'Due To' },
    ] as FilterFieldConfig[],
    feeReceipts: [
        { type: 'name', key: 'name', label: 'Student Name' },
        { type: 'status', key: 'status', statusPreset: 'fee' },
        { type: 'class', key: 'class_id' },
        { type: 'dateFrom', key: 'from', label: 'Paid From' },
        { type: 'dateTo', key: 'to', label: 'Paid To' },
    ] as FilterFieldConfig[],
    paymentProofs: [
        { type: 'name', key: 'name', label: 'Student Name' },
        { type: 'status', key: 'status', statusPreset: 'paymentProof' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
    homework: [
        { type: 'name', key: 'name', label: 'Title' },
        { type: 'status', key: 'status', statusPreset: 'homework' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'dateFrom', key: 'from', label: 'Due From' },
        { type: 'dateTo', key: 'to', label: 'Due To' },
    ] as FilterFieldConfig[],
    certificates: [
        { type: 'name', key: 'name', label: 'Certificate Title' },
        { type: 'status', key: 'status', statusPreset: 'cert' },
        { type: 'class', key: 'class_id' },
        { type: 'select', key: 'type', label: 'Type', options: [
            { value: 'completion', label: 'Completion' },
            { value: 'achievement', label: 'Achievement' },
            { value: 'participation', label: 'Participation' },
            { value: 'merit', label: 'Merit' },
        ]},
        { type: 'dateFrom', key: 'from', label: 'Issued From' },
        { type: 'dateTo', key: 'to', label: 'Issued To' },
    ] as FilterFieldConfig[],
    library: [
        { type: 'name', key: 'name', label: 'Book Title' },
        { type: 'status', key: 'status', statusPreset: 'library' },
        { type: 'category', key: 'category', options: [
            { value: 'General', label: 'General' },
            { value: 'Fiction', label: 'Fiction' },
            { value: 'Non-Fiction', label: 'Non-Fiction' },
            { value: 'Science', label: 'Science' },
            { value: 'Mathematics', label: 'Mathematics' },
            { value: 'History', label: 'History' },
            { value: 'Reference', label: 'Reference' },
        ]},
    ] as FilterFieldConfig[],
    timetable: [
        { type: 'day', key: 'day' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
    ] as FilterFieldConfig[],
    salary: [
        { type: 'name', key: 'name', label: 'Employee Name' },
        { type: 'status', key: 'status', statusPreset: 'salary' },
        { type: 'month', key: 'month' },
        { type: 'year', key: 'year' },
    ] as FilterFieldConfig[],
    expenses: [
        { type: 'name', key: 'name', label: 'Title' },
        { type: 'category', key: 'category' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
    activityLogs: [
        { type: 'action', key: 'action' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
    auditLogs: [
        { type: 'event', key: 'event' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
    loginLogs: [
        { type: 'status', key: 'status', statusPreset: 'login' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ] as FilterFieldConfig[],
} as const;

type FilterDefaults<T extends FilterFieldConfig[]> = Record<T[number]['key'], string>;

export function emptyFilterValues<T extends FilterFieldConfig[]>(fields: T): FilterDefaults<T> {
    return Object.fromEntries(fields.map(f => [f.key, ''])) as FilterDefaults<T>;
}

export function ListFilters({
    preset,
    values,
    onChange,
}: {
    preset: keyof typeof FILTER_PRESETS;
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
}) {
    return (
        <AdvancedFilters
            fields={FILTER_PRESETS[preset]}
            values={values}
            onChange={onChange}
        />
    );
}

export { usePagedList };
