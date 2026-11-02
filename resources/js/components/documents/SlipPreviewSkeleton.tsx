export function SlipPreviewSkeleton({ dual = false }: { dual?: boolean }) {
  const block = (
    <div className="overflow-hidden rounded-xl border border-emerald-500/15 bg-white shadow-lg dark:border-emerald-700/30 dark:bg-emerald-950/20">
      <div className="h-16 animate-pulse bg-gradient-to-r from-emerald-600/30 to-lime-500/30" />
      <div className="h-8 animate-pulse bg-emerald-100/60 dark:bg-emerald-900/20" />
      <div className="space-y-3 p-4">
        <div className="flex gap-3">
          <div className="h-20 flex-1 animate-pulse rounded-lg border border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10" />
          <div className="h-16 w-16 animate-pulse rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-emerald-50/60 dark:bg-emerald-900/10" />
          ))}
        </div>
        <div className="flex gap-3">
          <div className="h-16 flex-1 animate-pulse rounded-lg border border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-900/10" />
          <div className="h-16 w-36 animate-pulse rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10" />
        </div>
      </div>
    </div>
  );

  if (dual) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {block}
        {block}
      </div>
    );
  }

  return block;
}
