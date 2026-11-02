import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';

import { Topbar } from './Topbar';

import { useTheme } from '@/contexts/ThemeContext';

import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/brand';
import { PageContentSkeleton } from '@/components/ui/PageContentSkeleton';

export function AppLayout() {

    const { sidebarCollapsed } = useTheme();

    return (

        <div className="admin-shell flex min-h-screen">

            <Sidebar />

            <div className={cn(

                'flex min-w-0 flex-1 flex-col transition-all duration-200',

                sidebarCollapsed ? 'lg:ps-[4.5rem]' : 'lg:ps-64',

            )}>

                <Topbar />

                <main className="flex-1 p-4 sm:p-6">

                    <div className="mx-auto max-w-7xl animate-fade-in-up">

                        <Suspense fallback={<PageContentSkeleton />}>

                            <Outlet />

                        </Suspense>

                    </div>

                </main>

                <footer className="admin-topbar px-6 py-3 text-xs admin-page-sub flex flex-col sm:flex-row items-center justify-between gap-2">

                    <p>© {new Date().getFullYear()} {BRAND_NAME} — All rights reserved</p>
                    <p className="font-semibold text-emerald-600 dark:text-lime-400">Powered by GMS</p>

                </footer>

            </div>

        </div>

    );

}
