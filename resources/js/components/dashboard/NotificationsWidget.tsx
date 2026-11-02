import { Bell, UserPlus, Banknote, Calendar, CheckCircle } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';
import type { DashboardNotification } from './types';

const iconMap: Record<string, React.ElementType> = {
    'user-plus': UserPlus,
    banknote: Banknote,
    calendar: Calendar,
    bell: Bell,
};

interface NotificationsWidgetProps {
    notifications: DashboardNotification[];
}

export function NotificationsWidget({ notifications }: NotificationsWidgetProps) {
    const unread = notifications.filter((n) => !n.read).length;

    return (
        <Card className="admin-widget-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={Bell}
                    title="Recent Notifications"
                    subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
                    accent="from-yellow-500 to-amber-400"
                    badge={unread > 0 ? unread : undefined}
                />
                {notifications.length === 0 ? (
                    <EmptyState
                        title="No notifications"
                        message="You're all caught up. New alerts will appear here."
                    />
                ) : (
                    <div className="space-y-2.5">
                        {notifications.map((n) => {
                            const Icon = iconMap[n.icon] ?? Bell;
                            return (
                                <div
                                    key={n.id}
                                    className={cn(
                                        'flex items-start gap-3 rounded-xl p-3 transition-colors',
                                        n.read ? 'admin-dash-item' : 'admin-dash-item admin-dash-item--yellow',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                                            n.read
                                                ? 'admin-dash-notif-icon'
                                                : 'admin-dash-icon bg-gradient-to-br from-yellow-500 to-amber-400 text-white',
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium admin-page-title">{n.title}</p>
                                        <p className="text-xs admin-page-sub mt-0.5">{n.time}</p>
                                    </div>
                                    {!n.read && (
                                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-yellow-500 animate-pulse" />
                                    )}
                                    {n.read && <CheckCircle className="mt-2 h-4 w-4 shrink-0 text-emerald-500/50" />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
