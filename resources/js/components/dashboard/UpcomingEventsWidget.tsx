import { Calendar } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';

interface Event {
    title: string;
    date: string;
}

interface UpcomingEventsWidgetProps {
    events: Event[];
}

export function UpcomingEventsWidget({ events }: UpcomingEventsWidgetProps) {
    return (
        <Card className="admin-widget-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={Calendar}
                    title="Upcoming Events"
                    subtitle="School calendar"
                    accent="from-blue-500 to-cyan-400"
                    badge={events.length > 0 ? events.length : undefined}
                />
                {events.length === 0 ? (
                    <EmptyState
                        title="No upcoming events"
                        message="School events and holidays will be listed here."
                    />
                ) : (
                    <div className="space-y-2">
                        {events.map((e, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between admin-dash-item admin-dash-item--blue px-3.5 py-3"
                            >
                                <p className="text-sm font-medium admin-page-title">{e.title}</p>
                                <span className="admin-dash-chip admin-dash-chip--blue shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold">
                                    {e.date}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
