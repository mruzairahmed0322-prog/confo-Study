/** Normalize API list responses — plain arrays or paginated `{ data: T[] }`. */
export function asList<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
        return (value as { data: T[] }).data;
    }
    return [];
}

/** True when dashboard cache is missing the sections map (legacy persisted entries). */
export function hasDashboardSections(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const sections = (value as { sections?: Record<string, boolean> }).sections;
    return !!sections && Object.values(sections).some(Boolean);
}
