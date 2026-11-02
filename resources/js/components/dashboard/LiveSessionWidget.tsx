import { Link } from 'react-router-dom';
import { Radio, PlayCircle } from 'lucide-react';
import { DashboardWidgetHeader } from '@/components/dashboard/DashboardWidgetHeader';
import { Button } from '@/components/ui/Button';
import type { LiveSessionCta } from '@/components/dashboard/types';

export function LiveSessionWidget({ session }: { session?: LiveSessionCta | null }) {
    // Fee unpaid → backend returns null → widget hidden (no button, no tease).
    if (!session || (!session.can_join && !session.can_watch)) {
        return null;
    }

    const href = session.can_join
        ? (session.join_url || `/app/live-classes/${session.id}/room`)
        : (session.watch_url || `/app/live-classes/${session.id}/room?mode=recording`);

    const isLive = session.can_join && session.status === 'live';
    const label = session.can_join
        ? (session.status === 'live' ? 'Join Live Class' : 'Open Live Class')
        : 'Watch Recording';

    return (
        <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-stone-950/40 p-4 shadow-sm">
            <DashboardWidgetHeader
                title="Live Class"
                subtitle={isLive ? 'Live now — fee-paid access' : 'Fee-paid students only'}
                icon={Radio}
                accent={isLive ? 'from-red-500 to-orange-500' : 'from-emerald-500 to-lime-500'}
                badge={isLive ? 'LIVE' : undefined}
            />
            <div className="mt-1 space-y-2">
                <p className="font-semibold text-stone-100">{session.title}</p>
                <p className="text-xs text-stone-400">
                    {[session.subject_name, session.class_name, session.scheduled_at].filter(Boolean).join(' · ')}
                </p>
                <Link to={href}>
                    <Button className="mt-2 w-full" size="sm">
                        {session.can_join ? <Radio className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        {label}
                    </Button>
                </Link>
            </div>
        </div>
    );
}
