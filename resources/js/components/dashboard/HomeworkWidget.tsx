import { FileText } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';

interface HomeworkItem {
    title: string;
    class: string;
    due: string;
    marks: number;
}

interface HomeworkWidgetProps {
    items: HomeworkItem[];
}

export function HomeworkWidget({ items }: HomeworkWidgetProps) {
    return (
        <Card className="admin-widget-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={FileText}
                    title="Pending Homework"
                    subtitle="Assignments due soon"
                    accent="from-violet-500 to-purple-400"
                    badge={items.length > 0 ? items.length : undefined}
                />
                {items.length === 0 ? (
                    <EmptyState
                        title="All caught up"
                        message="No pending assignments at the moment."
                    />
                ) : (
                    <div className="space-y-2">
                        {items.map((item, i) => (
                            <div
                                key={i}
                                className="admin-dash-item admin-dash-item--violet px-3.5 py-3"
                            >
                                <p className="text-sm font-medium admin-page-title">{item.title}</p>
                                <p className="text-xs admin-page-sub mt-0.5">
                                    {item.class} · Due {item.due} · {item.marks} marks
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
