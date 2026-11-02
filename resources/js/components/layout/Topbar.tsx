import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCachedQueryData } from '@/lib/queryPersist';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Menu, Sun, Moon, Bell, LogOut, User, Settings, Zap, UserPlus, Banknote,
    Calendar, ClipboardCheck, FileText, GraduationCap, FileBadge, CheckCheck,
} from 'lucide-react';
import { BRAND_NAME } from '@/lib/brand';
import { BrandIcon } from '@/components/brand/BrandIcon';
import { apiGet, apiPost } from '@/lib/api';
import type { DashboardData } from '@/components/dashboard/types';

interface NotificationItem {
    id: string;
    title: string;
    body?: string;
    time: string;
    read: boolean;
    icon: string;
    link?: string;
}

const notifIcons: Record<string, React.ElementType> = {
    'user-plus': UserPlus,
    banknote: Banknote,
    calendar: Calendar,
    bell: Bell,
    'graduation-cap': GraduationCap,
    'file-badge': FileBadge,
};

export function Topbar() {
    const { user, logout } = useAuth();
    const { dark, toggle, toggleSidebar } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: dashData } = useQuery<DashboardData>({
        queryKey: ['dashboard'],
        queryFn: () => apiGet('/dashboard'),
        staleTime: 10 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        placeholderData: () => getCachedQueryData<DashboardData>(['dashboard']),
    });

    const { data: notifData } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => apiGet<{ data: NotificationItem[] }>('/notifications', { per_page: 15 }),
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const markAllMutation = useMutation({
        mutationFn: () => apiPost('/notifications/mark-all-read'),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });

    const notifications: NotificationItem[] = notifData?.data ?? dashData?.notifications ?? [];
    const unreadCount = notifications.filter(n => !n.read).length;

    const handleLogout = async () => {
        await logout();
        navigate('/app/login');
    };

    const openNotif = (n: NotificationItem) => {
        if (n.link) navigate(n.link);
        setNotifOpen(false);
    };

    return (
        <header className="admin-topbar sticky top-0 z-30">
            <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
                <div className="flex items-center gap-3">
                    <button onClick={toggleSidebar} className="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50 dark:text-lime-300 dark:hover:bg-emerald-900/20 lg:hidden">
                        <Menu className="h-5 w-5" />
                    </button>
                    <NavLink to="/app" end title="Dashboard" className="flex items-center gap-2.5 rounded-xl transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                        <BrandIcon size="sm" className="hidden sm:block" />
                        <div>
                            <h1 className="admin-page-title text-lg">{BRAND_NAME}</h1>
                            <p className="text-xs admin-page-sub">Welcome, {user?.name?.split(' ')[0]}</p>
                        </div>
                    </NavLink>
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="relative">
                        <button
                            onClick={() => { setQuickOpen(!quickOpen); setNotifOpen(false); }}
                            className="hidden rounded-xl p-2 text-emerald-600 hover:bg-emerald-50 dark:text-lime-300 dark:hover:bg-emerald-900/20 sm:block"
                            title="Quick Actions"
                        >
                            <Zap className="h-5 w-5" />
                        </button>
                        {quickOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setQuickOpen(false)} />
                                <div className="admin-modal absolute end-0 top-full z-50 mt-2 w-56 py-1 animate-fade-in-up" style={{ maxHeight: 'none', overflow: 'visible' }}>
                                    <div className="border-b border-emerald-500/10 px-4 py-3">
                                        <p className="text-sm font-semibold admin-page-title">Quick Actions</p>
                                    </div>
                                    {[
                                        { label: 'Students', path: '/app/students', icon: UserPlus },
                                        { label: 'Attendance', path: '/app/attendance', icon: ClipboardCheck },
                                        { label: 'Collect Fees', path: '/app/fees/collect', icon: Banknote },
                                        { label: 'Assignments', path: '/app/assignments', icon: FileText },
                                    ].map(action => (
                                        <NavLink key={action.path} to={action.path} onClick={() => setQuickOpen(false)}
                                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm admin-page-title hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                            <action.icon className="h-4 w-4 text-emerald-500" />
                                            {action.label}
                                        </NavLink>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => { setNotifOpen(!notifOpen); setQuickOpen(false); }}
                            className="relative rounded-xl p-2 text-emerald-600 hover:bg-emerald-50 dark:text-lime-300 dark:hover:bg-emerald-900/20"
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute end-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[9px] font-bold text-white animate-pulse">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {notifOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                                <div className="admin-modal absolute end-0 top-full z-50 mt-2 w-96 py-1 animate-fade-in-up" style={{ maxHeight: 'none', overflow: 'visible' }}>
                                    <div className="flex items-center justify-between border-b border-emerald-500/10 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-semibold admin-page-title">Notifications</p>
                                            {unreadCount > 0 && (
                                                <p className="text-xs text-yellow-600 dark:text-yellow-400">{unreadCount} unread</p>
                                            )}
                                        </div>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={() => markAllMutation.mutate()}
                                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-lime-300"
                                            >
                                                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto scrollbar-thin">
                                        {notifications.length === 0 ? (
                                            <p className="px-4 py-8 text-center text-sm admin-page-sub">No notifications yet</p>
                                        ) : (
                                            notifications.map(n => {
                                                const Icon = notifIcons[n.icon] ?? Bell;
                                                return (
                                                    <button
                                                        key={n.id}
                                                        type="button"
                                                        onClick={() => openNotif(n)}
                                                        className={`flex w-full items-start gap-3 px-4 py-3 text-start transition-colors ${
                                                            !n.read ? 'bg-yellow-500/5' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                        }`}
                                                    >
                                                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${!n.read ? 'bg-yellow-500/15' : 'bg-emerald-500/10'}`}>
                                                            <Icon className={`h-4 w-4 ${!n.read ? 'text-yellow-500' : 'text-emerald-500'}`} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium admin-page-title">{n.title}</p>
                                                            {n.body && <p className="mt-0.5 text-xs admin-page-sub line-clamp-2">{n.body}</p>}
                                                            <p className="mt-1 text-xs admin-page-sub opacity-70">{n.time}</p>
                                                        </div>
                                                        {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-yellow-500" />}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="border-t border-emerald-500/10 px-4 py-2">
                                        <button onClick={() => { navigate('/app/notifications'); setNotifOpen(false); }}
                                            className="w-full text-center text-xs text-emerald-600 hover:text-emerald-700 dark:text-lime-300 py-1">
                                            Manage Templates →
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <button onClick={toggle} className="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50 dark:text-lime-300 dark:hover:bg-emerald-900/20 transition-colors">
                        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>

                    <div className="relative">
                        <button onClick={() => setMenuOpen(!menuOpen)}
                            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                            <div className="admin-stat-icon flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">
                                {user?.name?.charAt(0)}
                            </div>
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                <div className="admin-modal absolute end-0 top-full z-50 mt-2 w-52 py-1 animate-fade-in-up" style={{ maxHeight: 'none', overflow: 'visible' }}>
                                    <div className="border-b border-emerald-500/10 px-4 py-3">
                                        <p className="text-sm font-semibold admin-page-title">{user?.name}</p>
                                        <p className="text-xs admin-page-sub capitalize">{user?.role?.replace('-', ' ')}</p>
                                    </div>
                                    <button onClick={() => { navigate('/app/profile'); setMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm admin-page-title hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                        <User className="h-4 w-4 text-emerald-500" /> Profile
                                    </button>
                                    <button onClick={() => { navigate('/app/settings'); setMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm admin-page-title hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                        <Settings className="h-4 w-4 text-emerald-500" /> Settings
                                    </button>
                                    <div className="my-1 border-t border-emerald-500/10" />
                                    <button onClick={handleLogout}
                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                                        <LogOut className="h-4 w-4" /> Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
