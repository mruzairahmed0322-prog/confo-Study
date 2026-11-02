import { NavLink } from 'react-router-dom';

import {
    LayoutDashboard, Users, BookOpen, Layers, Book, Calendar, ClipboardCheck,
    FileText, BarChart3, Wallet, Receipt, Banknote, TrendingDown,
    PieChart, Settings, Shield, Activity, GraduationCap, Video,
    FileBadge, UserCheck, ChevronDown, PanelLeftClose, PanelLeftOpen, Library, LogIn,
    Bell, Archive, Search, X,
} from 'lucide-react';

import { useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

import { useTheme } from '@/contexts/ThemeContext';

import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/brand';
import { BrandIcon } from '@/components/brand/BrandIcon';
import { prefetchRouteChunk } from '@/lib/routePrefetch';

const iconMap: Record<string, React.ElementType> = {
    'layout-dashboard': LayoutDashboard, users: Users, 'book-open': BookOpen,
    layers: Layers, book: Book, calendar: Calendar, 'clipboard-check': ClipboardCheck,
    'file-text': FileText, 'bar-chart-3': BarChart3, wallet: Wallet, receipt: Receipt,
    banknote: Banknote, 'trending-down': TrendingDown, 'pie-chart': PieChart,
    settings: Settings, shield: Shield, activity: Activity,
    'graduation-cap': GraduationCap, video: Video, 'file-badge': FileBadge,
    'user-check': UserCheck, home: LayoutDashboard, library: Library, 'log-in': LogIn,
    bell: Bell, archive: Archive,
};

interface MenuItem { label: string; path: string; icon: string; permission?: string }
interface MenuGroup { label: string; icon: string; items: MenuItem[] }

function buildMenuGroups(): MenuGroup[] {
    return [
        { label: 'Dashboard', icon: 'layout-dashboard', items: [{ label: 'Overview', path: '/app', icon: 'home' }] },
        {
            label: 'Superadmin', icon: 'shield', items: [
                { label: 'User Approvals', path: '/app/approvals', icon: 'user-check' },
                { label: 'User Accounts', path: '/app/users', icon: 'users' },
                { label: 'Archives', path: '/app/archives', icon: 'archive' },
                { label: 'Activity Logs', path: '/app/activity-logs', icon: 'activity', permission: 'activity-logs.view' },
                { label: 'Login Logs', path: '/app/login-logs', icon: 'log-in', permission: 'login-logs.view' },
                { label: 'Audit Logs', path: '/app/audit-logs', icon: 'activity', permission: 'audit-logs.view' },
                { label: 'System Settings', path: '/app/system-settings', icon: 'shield', permission: 'system-settings.view' },
                { label: 'Roles & Permissions', path: '/app/roles', icon: 'shield', permission: 'roles.view' },
            ],
        },
        { label: 'Academics', icon: 'graduation-cap', items: [
            { label: 'Students', path: '/app/students', icon: 'users', permission: 'students.view' },
            { label: 'Teachers', path: '/app/teachers', icon: 'book-open', permission: 'teachers.view' },
            { label: 'Parents', path: '/app/parents', icon: 'users', permission: 'parents.view' },
            { label: 'Classes', path: '/app/classes', icon: 'layers', permission: 'classes.view' },
            { label: 'Subjects', path: '/app/subjects', icon: 'book', permission: 'subjects.view' },
            { label: 'Timetable', path: '/app/timetable', icon: 'calendar', permission: 'timetable.view' },
        ]},
        { label: 'Attendance', icon: 'clipboard-check', items: [
            { label: 'Attendance', path: '/app/attendance', icon: 'user-check', permission: 'attendance.view' },
        ]},
        { label: 'Live Classes', icon: 'video', items: [
            { label: 'Live Classes', path: '/app/live-classes', icon: 'video', permission: 'live-classes.view' },
            { label: 'Recordings', path: '/app/recordings', icon: 'video', permission: 'recordings.view' },
            { label: 'Assignments', path: '/app/assignments', icon: 'file-text', permission: 'assignments.view' },
            { label: 'Homework', path: '/app/homework', icon: 'file-text', permission: 'homework.view' },
            { label: 'Study Materials', path: '/app/materials', icon: 'file-text', permission: 'materials.view' },
        ]},
        { label: 'Exams & Results', icon: 'file-badge', items: [
            { label: 'Exams', path: '/app/exams', icon: 'file-text', permission: 'exams.view' },
            { label: 'Results', path: '/app/results', icon: 'bar-chart-3', permission: 'results.view' },
        ]},
        { label: 'Fees & Finance', icon: 'wallet', items: [
            { label: 'Fee Invoices', path: '/app/fees', icon: 'receipt', permission: 'fees.view' },
            { label: 'Fee Receipts (Paid Slips)', path: '/app/fees/receipts', icon: 'file-text', permission: 'fees.view' },
            { label: 'Collect Fees', path: '/app/fees/collect', icon: 'wallet', permission: 'fees.collect' },
            { label: 'Payment Proofs', path: '/app/payment-proofs', icon: 'banknote', permission: 'fees.collect' },
            { label: 'Salary Slips', path: '/app/salary', icon: 'banknote', permission: 'expenses.view' },
            { label: 'Expenses', path: '/app/expenses', icon: 'trending-down', permission: 'expenses.view' },
        ]},
        { label: 'Reports', icon: 'pie-chart', items: [
            { label: 'All Reports', path: '/app/reports', icon: 'pie-chart', permission: 'reports.view' },
        ]},
        { label: 'Library', icon: 'library', items: [
            { label: 'Books', path: '/app/library', icon: 'book', permission: 'library.view' },
            { label: 'Certificates', path: '/app/certificates', icon: 'file-badge', permission: 'certificates.view' },
        ]},
        { label: 'Settings', icon: 'settings', items: [
            { label: 'General', path: '/app/settings', icon: 'settings', permission: 'settings.edit' },
            { label: 'Notifications', path: '/app/notifications', icon: 'bell', permission: 'settings.edit' },
            { label: 'Profile', path: '/app/profile', icon: 'users' },
        ]},
    ];
}

export function Sidebar() {
    const { user, hasPermission, isSuperAdmin } = useAuth();
    const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useTheme();

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        Dashboard: true,
        Superadmin: true,
        Academics: true,
        'Live Classes': true,
    });
    const [menuSearch, setMenuSearch] = useState('');

    const menuGroups = buildMenuGroups();
    const searchQ = menuSearch.trim().toLowerCase();
    const canSeeItem = (item: MenuItem) => !item.permission || hasPermission(item.permission);

    const filteredGroups = useMemo(() => {
        return menuGroups
            .map((group) => {
                if (group.label === 'Superadmin' && !isSuperAdmin) return null;
                const visibleItems = group.items.filter(canSeeItem);
                if (!visibleItems.length) return null;
                if (!searchQ) return { ...group, items: visibleItems };
                const matched = visibleItems.filter((item) =>
                    item.label.toLowerCase().includes(searchQ)
                    || group.label.toLowerCase().includes(searchQ),
                );
                if (!matched.length) return null;
                return { ...group, items: matched };
            })
            .filter(Boolean) as MenuGroup[];
    }, [menuGroups, searchQ, isSuperAdmin, hasPermission]);

    const portalLabel = isSuperAdmin
        ? 'Superadmin Panel'
        : user?.role === 'student'
          ? 'Student Portal'
          : user?.role === 'teacher'
            ? 'Teacher Portal'
            : user?.role === 'parent'
              ? 'Parent Portal'
              : 'Admin Panel';

    const toggleGroup = (label: string) => setOpenGroups(p => ({ ...p, [label]: !p[label] }));
    const closeMobileSidebar = () => setMobileSidebarOpen(false);

    return (
        <>
            {/* Mobile backdrop */}
            {mobileSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={closeMobileSidebar}
                    aria-label="Close sidebar backdrop"
                />
            )}

            <aside className={cn(
                'admin-sidebar fixed inset-y-0 start-0 z-50 flex flex-col transition-transform duration-200 lg:transition-all shadow-2xl',
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                sidebarCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
                'w-64 max-w-[85vw]',
            )}>
                <div className="flex h-16 items-center gap-3 border-b border-lime-400/20 px-3">
                    <NavLink
                        to="/app"
                        end
                        title="Dashboard"
                        onClick={closeMobileSidebar}
                        onMouseEnter={() => prefetchRouteChunk('/app')}
                        className={cn(
                            'flex min-w-0 flex-1 items-center gap-3 rounded-xl transition-colors hover:bg-white/8',
                            sidebarCollapsed && 'flex-none justify-center',
                        )}
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1">
                            <BrandIcon size="sm" />
                        </div>

                        {(!sidebarCollapsed || mobileSidebarOpen) && (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-white">{BRAND_NAME}</p>
                                <p className="text-[11px] text-lime-200/90">{portalLabel}</p>
                            </div>
                        )}
                    </NavLink>

                    <button
                        onClick={toggleSidebar}
                        className="hidden rounded-lg p-1.5 text-lime-100/80 hover:bg-white/10 hover:text-white lg:block"
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                    </button>

                    <button
                        onClick={closeMobileSidebar}
                        className="rounded-lg p-1.5 text-lime-100/80 hover:bg-white/10 hover:text-white lg:hidden"
                        title="Close sidebar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {(!sidebarCollapsed || mobileSidebarOpen) && (
                    <div className="border-b border-lime-400/20 px-2 py-2">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-lime-100/70" />
                            <input
                                type="search"
                                value={menuSearch}
                                onChange={(e) => setMenuSearch(e.target.value)}
                                placeholder="Search menu..."
                                className="w-full rounded-lg border border-lime-400/20 bg-white/5 py-2 ps-8 pe-2 text-xs text-white placeholder:text-lime-100/50 outline-none focus:border-lime-300/50 focus:bg-white/10"
                            />
                        </label>
                    </div>
                )}

                <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
                    {filteredGroups.length === 0 && (!sidebarCollapsed || mobileSidebarOpen) ? (
                        <p className="px-3 py-2 text-xs text-lime-100/70">No menu match</p>
                    ) : null}

                    {filteredGroups.map(group => {
                        const GroupIcon = iconMap[group.icon] ?? LayoutDashboard;
                        const visibleItems = group.items;
                        const isOpen = searchQ ? true : (openGroups[group.label] ?? false);
                        const isExpanded = !sidebarCollapsed || mobileSidebarOpen;

                        return (
                            <div key={group.label}>
                                <button
                                    onClick={() => isExpanded && toggleGroup(group.label)}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 hover:bg-white/8',
                                        !isExpanded && 'justify-center',
                                        group.label === 'Superadmin' && 'bg-yellow-500/10',
                                    )}
                                >
                                    <span className={cn(
                                        'flex h-7 w-7 items-center justify-center rounded-lg',
                                        group.label === 'Superadmin' ? 'bg-yellow-500/20' : 'bg-white/10',
                                    )}>
                                        <GroupIcon className={cn('h-4 w-4', group.label === 'Superadmin' ? 'text-yellow-200' : 'text-lime-100')} />
                                    </span>

                                    {isExpanded && (
                                        <>
                                            <span className="flex-1 text-start text-white">{group.label}</span>
                                            <ChevronDown className={cn('h-3.5 w-3.5 text-lime-100/80 transition-transform', isOpen && 'rotate-180')} />
                                        </>
                                    )}
                                </button>

                                {isOpen && isExpanded && (
                                    <div className="ms-3 mt-0.5 space-y-0.5 border-s-2 border-lime-300/30 ps-2">
                                        {visibleItems.map(item => {
                                            const ItemIcon = iconMap[item.icon] ?? Users;

                                            return (
                                                <NavLink
                                                    key={item.path}
                                                    to={item.path}
                                                    end={item.path === '/app'}
                                                    onClick={closeMobileSidebar}
                                                    onMouseEnter={() => prefetchRouteChunk(item.path)}
                                                    className={({ isActive }) => cn(
                                                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150',
                                                        isActive ? 'admin-nav-active font-medium' : 'admin-sidebar-link hover:bg-white/8',
                                                    )}
                                                >
                                                    <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="truncate">{item.label}</span>
                                                </NavLink>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="border-t border-lime-400/20 p-3 space-y-1.5">
                    <div className={cn('flex items-center gap-3 rounded-xl bg-white/5 p-2.5', sidebarCollapsed && !mobileSidebarOpen && 'justify-center')}>
                        <div className="admin-stat-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                            {user?.name?.charAt(0) ?? 'U'}
                        </div>

                        {(!sidebarCollapsed || mobileSidebarOpen) && (
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                                <span className="text-[10px] font-semibold text-lime-200/90 capitalize">{isSuperAdmin ? 'Superadmin' : user?.role?.replace('-', ' ')}</span>
                            </div>
                        )}
                    </div>

                    {(!sidebarCollapsed || mobileSidebarOpen) && (
                        <p className="text-center text-[10.5px] font-medium text-lime-200/90 tracking-wide">
                            Powered by <span className="font-bold text-white">GMS</span>
                        </p>
                    )}
                </div>
            </aside>
        </>
    );
}
