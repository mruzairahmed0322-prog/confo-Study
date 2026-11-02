import { CalendarDays, Plus, Pencil, Trash2 } from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';

export interface TimetableSlot {
    id?: string | number;
    subject: string;
    teacher: string;
    class: string;
    time: string;
    room: string;
}

interface TimetableWidgetProps {
    slots: TimetableSlot[];
    onAdd?: () => void;
    onEdit?: (slot: TimetableSlot) => void;
    onDelete?: (slot: TimetableSlot) => void;
}

export function TimetableWidget({ slots, onAdd, onEdit, onDelete }: TimetableWidgetProps) {
    return (
        <Card className="admin-widget-card">
            <CardBody>
                {/* Header with Add New Button */}
                <div className="flex items-center justify-between mb-4">
                    <DashboardWidgetHeader
                        icon={CalendarDays}
                        title="Today's Timetable"
                        subtitle="Scheduled classes"
                        accent="from-blue-500 to-indigo-400"
                        badge={slots.length > 0 ? slots.length : undefined}
                    />
                    {onAdd && (
                        <button
                            onClick={onAdd}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add New</span>
                        </button>
                    )}
                </div>

                {slots.length === 0 ? (
                    <EmptyState
                        title="No classes today"
                        message="No scheduled classes for today. Check back tomorrow."
                    />
                ) : (
                    <div className="space-y-2">
                        {slots.map((slot, i) => (
                            <div
                                key={slot.id || i}
                                className="flex items-center justify-between admin-dash-item admin-dash-item--blue px-3.5 py-3"
                            >
                                <div>
                                    <p className="text-sm font-medium admin-page-title">{slot.subject}</p>
                                    <p className="text-xs admin-page-sub mt-0.5">
                                        {slot.teacher} · {slot.class} · {slot.room}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="admin-dash-chip admin-dash-chip--blue shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold">
                                        {slot.time}
                                    </span>

                                    {(onEdit || onDelete) && (
                                        <div className="flex items-center gap-1 ml-1">
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(slot)}
                                                    className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={() => onDelete(slot)}
                                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}