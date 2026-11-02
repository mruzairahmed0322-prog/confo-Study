import { Activity } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';
import type { DashboardActivity } from './types';

interface RecentActivityWidgetProps {
    activities: DashboardActivity[];
}

export function RecentActivityWidget({ activities }: RecentActivityWidgetProps) {
    return (
        <Card className="admin-widget-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={Activity}
                    title="Recent Activity"
                    subtitle="Latest system actions"
                    accent="from-indigo-500 to-violet-400"
                    badge={activities.length > 0 ? activities.length : undefined}
                />
                {activities.length === 0 ? (
                    <EmptyState
                        title="No recent activity"
                        message="System activity will be logged here."
                    />
                ) : (
                    <div className="space-y-2.5">
                        {activities.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-start gap-3 admin-dash-item p-3"
                            >
                                <span className="admin-dash-icon mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-400 text-xs font-bold text-white">
                                    {a.user?.name?.charAt(0) ?? '?'}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm admin-page-title">
                                        <span className="font-semibold">{a.user?.name ?? 'System'}</span>
                                        {' '}{a.action}
                                    </p>
                                    <p className="text-xs admin-page-sub mt-0.5">{a.created_at}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
