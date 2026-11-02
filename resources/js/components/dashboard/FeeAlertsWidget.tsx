import { AlertTriangle } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';

interface FeeAlert {
    student: string;
    class: string;
    amount: number;
    due: string;
}

interface FeeAlertsWidgetProps {
    alerts: FeeAlert[];
    title?: string;
    subtitle?: string;
}

export function FeeAlertsWidget({
    alerts,
    title = 'Fee Alerts',
    subtitle = 'Outstanding payments',
}: FeeAlertsWidgetProps) {
    return (
        <Card className="admin-widget-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={AlertTriangle}
                    title={title}
                    subtitle={subtitle}
                    accent="from-red-500 to-orange-400"
                    badge={alerts.length > 0 ? alerts.length : undefined}
                />
                {alerts.length === 0 ? (
                    <EmptyState
                        title="No pending fees"
                        message="All fee payments are up to date."
                    />
                ) : (
                    <div className="space-y-2">
                        {alerts.map((a, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between admin-dash-item admin-dash-item--red px-3.5 py-3"
                            >
                                <div>
                                    <p className="text-sm font-medium admin-page-title">{a.student}</p>
                                    <p className="text-xs admin-page-sub mt-0.5">{a.class}</p>
                                </div>
                                <div className="text-end">
                                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(a.amount)}</p>
                                    <p className="text-xs admin-page-sub mt-0.5">Due: {a.due}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
