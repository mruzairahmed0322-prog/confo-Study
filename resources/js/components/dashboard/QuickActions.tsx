import { NavLink } from 'react-router-dom';
import { UserPlus, ClipboardCheck, Banknote, FileText, Zap } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';

interface QuickAction {
    label: string;
    path: string;
    icon: React.ElementType;
    permission: string;
    color: string;
}

const ACTIONS: QuickAction[] = [
    { label: 'Students', path: '/app/students', icon: UserPlus, permission: 'students.create', color: 'from-indigo-500 to-blue-400' },
    { label: 'Attendance', path: '/app/attendance', icon: ClipboardCheck, permission: 'attendance.mark', color: 'from-emerald-500 to-teal-400' },
    { label: 'Fees', path: '/app/fees/collect', icon: Banknote, permission: 'fees.collect', color: 'from-amber-500 to-yellow-400' },
    { label: 'Assignments', path: '/app/assignments', icon: FileText, permission: 'assignments.view', color: 'from-violet-500 to-purple-400' },
    { label: 'Approvals', path: '/app/approvals', icon: UserPlus, permission: 'roles.view', color: 'from-yellow-500 to-orange-400' },
];

export function QuickActions() {
    const { hasPermission } = useAuth();
    const visible = ACTIONS.filter((a) => hasPermission(a.permission));

    if (visible.length === 0) return null;

    return (
        <Card className="admin-widget-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={Zap}
                    title="Quick Actions"
                    subtitle="Jump to common tasks"
                    accent="from-violet-500 to-fuchsia-400"
                />
                <div className="grid grid-cols-2 gap-3">
                    {visible.map(({ label, path, icon: Icon, color }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className="group flex flex-col items-center gap-2.5 rounded-xl p-4 text-center admin-dash-action hover:-translate-y-0.5"
                        >
                            <span className={`admin-dash-icon flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color}`}>
                                <Icon className="h-5 w-5 text-white" />
                            </span>
                            <span className="text-xs font-semibold admin-page-title">{label}</span>
                        </NavLink>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
}
