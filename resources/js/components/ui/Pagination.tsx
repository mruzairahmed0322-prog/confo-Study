import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from './Button';

import { cn } from '@/lib/utils';



interface PaginationMeta {

    current_page: number;

    last_page: number;

    per_page: number;

    total: number;

    from: number | null;

    to: number | null;

}



interface PaginationProps {

    meta: PaginationMeta;

    onPageChange: (page: number) => void;

    className?: string;

}



export function Pagination({ meta, onPageChange, className }: PaginationProps) {

    const { current_page, last_page, total, from, to } = meta;

    if (last_page <= 1) return null;



    const pages: (number | '...')[] = [];

    for (let i = 1; i <= last_page; i++) {

        if (i === 1 || i === last_page || (i >= current_page - 1 && i <= current_page + 1)) {

            pages.push(i);

        } else if (pages[pages.length - 1] !== '...') {

            pages.push('...');

        }

    }



    return (

        <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3', className)}>

            <p className="text-sm admin-page-sub">

                Showing <span className="font-semibold admin-page-title">{from ?? 0}</span> to{' '}

                <span className="font-semibold admin-page-title">{to ?? 0}</span> of{' '}

                <span className="font-semibold admin-page-title">{total}</span>

            </p>

            <div className="flex items-center gap-1">

                <Button variant="secondary" size="sm" disabled={current_page <= 1} onClick={() => onPageChange(current_page - 1)}>

                    <ChevronLeft className="h-4 w-4" />

                </Button>

                {pages.map((p, i) =>

                    p === '...' ? (

                        <span key={`dots-${i}`} className="px-2 admin-page-sub">…</span>

                    ) : (

                        <button

                            key={p}

                            onClick={() => onPageChange(p)}

                            className={cn(

                                'h-8 min-w-8 rounded-lg text-sm font-semibold transition-all duration-200',

                                p === current_page

                                    ? 'admin-pagination-active'

                                    : 'admin-page-sub hover:bg-emerald-50 dark:hover:bg-emerald-900/20',

                            )}

                        >

                            {p}

                        </button>

                    ),

                )}

                <Button variant="secondary" size="sm" disabled={current_page >= last_page} onClick={() => onPageChange(current_page + 1)}>

                    <ChevronRight className="h-4 w-4" />

                </Button>

            </div>

        </div>

    );

}

