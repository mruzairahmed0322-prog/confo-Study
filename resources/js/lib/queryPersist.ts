const CACHE_KEY = 'sms_query_cache_v3';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
    data: unknown;
    updatedAt: number;
}

interface CacheStore {
    version: number;
    entries: Record<string, CacheEntry>;
}

function readStore(): CacheStore {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return { version: 1, entries: {} };
        const parsed = JSON.parse(raw) as CacheStore;
        if (!parsed.entries) return { version: 1, entries: {} };
        return parsed;
    } catch {
        return { version: 1, entries: {} };
    }
}

function writeStore(store: CacheStore) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(store));
    } catch {
        // Storage full — trim oldest entries
        const keys = Object.keys(store.entries).sort(
            (a, b) => store.entries[a].updatedAt - store.entries[b].updatedAt,
        );
        keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => delete store.entries[k]);
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(store));
        } catch { /* ignore */ }
    }
}

export function queryKeyToString(key: readonly unknown[]): string {
    return JSON.stringify(key);
}

export function getCachedQueryEntry(key: readonly unknown[]): CacheEntry | undefined {
    const store = readStore();
    const entry = store.entries[queryKeyToString(key)];
    if (!entry) return undefined;
    if (Date.now() - entry.updatedAt > MAX_AGE_MS) return undefined;
    return entry;
}

export function getCachedQueryData<T>(key: readonly unknown[]): T | undefined {
    return getCachedQueryEntry(key)?.data as T | undefined;
}

function shouldPersistKey(key: readonly unknown[]): boolean {
    return key[0] !== 'youtube-status';
}

export function setCachedQueryData(key: readonly unknown[], data: unknown) {
    if (!shouldPersistKey(key)) return;
    const store = readStore();
    store.entries[queryKeyToString(key)] = { data, updatedAt: Date.now() };
    writeStore(store);
}

export function hydrateQueryCache(
    setQueryData: (key: readonly unknown[], data: unknown) => void,
) {
    const store = readStore();
    const now = Date.now();
    for (const [keyStr, entry] of Object.entries(store.entries)) {
        if (now - entry.updatedAt > MAX_AGE_MS) continue;
        try {
            const key = JSON.parse(keyStr) as unknown[];
            if (!shouldPersistKey(key)) continue;
            setQueryData(key, entry.data);
        } catch { /* ignore bad keys */ }
    }
}

export function clearQueryCache() {
    localStorage.removeItem(CACHE_KEY);
}
