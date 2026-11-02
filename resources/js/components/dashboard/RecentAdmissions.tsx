import { UserPlus } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';

interface Admission {
    name: string;
    class: string;
    date: string;
}

interface RecentAdmissionsProps {
    admissions: Admission[];
}

export function RecentAdmissions({ admissions }: RecentAdmissionsProps) {
    return (
        <Card className="lg:col-span-2 admin-widget-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={UserPlus}
                    title="Recent Admissions"
                    subtitle="Newly enrolled students"
                    accent="from-lime-600 to-emerald-500"
                    badge={admissions.length > 0 ? admissions.length : undefined}
                />
                {admissions.length === 0 ? (
                    <EmptyState
                        title="No recent admissions"
                        message="New student admissions will appear here."
                    />
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table min-w-full">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-start text-xs font-bold uppercase admin-page-sub">Name</th>
                                    <th className="px-4 py-3 text-start text-xs font-bold uppercase admin-page-sub">Class</th>
                                    <th className="px-4 py-3 text-start text-xs font-bold uppercase admin-page-sub">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admissions.map((a, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3 text-sm font-medium admin-page-title">{a.name}</td>
                                        <td className="px-4 py-3 text-sm admin-page-sub">{a.class}</td>
                                        <td className="px-4 py-3 text-sm admin-page-sub">{a.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
