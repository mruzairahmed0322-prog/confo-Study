import { Award } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';

interface ChildResult {
    student: string;
    exam: string;
    subject: string;
    marks: number;
    total: number;
    grade: string;
}

interface ChildResultsWidgetProps {
    results: ChildResult[];
    title?: string;
    subtitle?: string;
}

export function ChildResultsWidget({
    results,
    title = 'Child Results',
    subtitle = 'Latest exam scores',
}: ChildResultsWidgetProps) {
    return (
        <Card className="admin-widget-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={Award}
                    title={title}
                    subtitle={subtitle}
                    accent="from-amber-500 to-yellow-400"
                    badge={results.length > 0 ? results.length : undefined}
                />
                {results.length === 0 ? (
                    <EmptyState
                        title="No results yet"
                        message="Exam results will appear here once published."
                    />
                ) : (
                    <div className="space-y-2">
                        {results.map((r, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between admin-dash-item admin-dash-item--amber px-3.5 py-3"
                            >
                                <div>
                                    <p className="text-sm font-medium admin-page-title">{r.student} — {r.subject}</p>
                                    <p className="text-xs admin-page-sub mt-0.5">{r.exam}</p>
                                </div>
                                <div className="text-end">
                                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{r.marks}/{r.total}</p>
                                    <p className="text-xs admin-page-sub mt-0.5">Grade {r.grade}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
