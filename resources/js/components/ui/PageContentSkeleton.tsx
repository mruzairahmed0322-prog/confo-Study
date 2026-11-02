export function PageContentSkeleton() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-emerald-500/10" />
                <div className="h-4 w-72 max-w-full animate-pulse rounded bg-emerald-500/5" />
            </div>
            <div className="rounded-2xl border border-emerald-500/10 bg-white/50 p-4 dark:bg-white/5">
                <div className="mb-4 flex gap-3">
                    <div className="h-10 w-64 animate-pulse rounded-xl bg-emerald-500/10" />
                    <div className="h-10 w-28 animate-pulse rounded-xl bg-emerald-500/10" />
                </div>
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded-xl bg-emerald-500/5" />
                    ))}
                </div>
            </div>
        </div>
    );
}
