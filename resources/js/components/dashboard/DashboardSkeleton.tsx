import { Card, CardBody } from '@/components/ui/Card';

function StatCardSkeleton() {
    return (
        <div className="admin-stat-card-modern">
            <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-emerald-500/10" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-emerald-500/10" />
                    <div className="h-8 w-20 animate-pulse rounded-lg bg-emerald-500/10" />
                </div>
            </div>
            <div className="mt-4 flex h-5 items-end gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="w-1.5 animate-pulse rounded-full bg-emerald-500/10" style={{ height: `${30 + i * 8}%` }} />
                ))}
            </div>
        </div>
    );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {Array.from({ length: count }).map((_, i) => (
                <StatCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function ChartSkeleton() {
    return (
        <Card className="admin-chart-card">
            <CardBody>
                <div className="mb-5 flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-emerald-500/10" />
                    <div className="space-y-2">
                        <div className="h-4 w-32 animate-pulse rounded bg-emerald-500/10" />
                        <div className="h-3 w-20 animate-pulse rounded bg-emerald-500/10" />
                    </div>
                </div>
                <div className="h-[220px] animate-pulse rounded-xl bg-emerald-500/5" />
            </CardBody>
        </Card>
    );
}

export function TableSkeleton() {
    return (
        <Card className="admin-widget-card">
            <CardBody>
                <div className="mb-5 flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-emerald-500/10" />
                    <div className="h-4 w-36 animate-pulse rounded bg-emerald-500/10" />
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded-xl bg-emerald-500/5" />
                    ))}
                </div>
            </CardBody>
        </Card>
    );
}
