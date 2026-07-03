import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { cn, resolveExpectedDay } from '../lib/utils';
import Dialog from './ui/dialog';
import SegmentedControl from './ui/segmented-control';

// Pure function so it can be used both by the month grid (paginated by currentDate) and the
// agenda view (which always scans forward from today, independent of the month being browsed).
const computeItemsForDate = (date, recurringPlans, debts, transactions) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const items = [];

    recurringPlans.forEach(plan => {
        const planDay = resolveExpectedDay(plan.expectedDate, year, month);
        if (plan.endDate) {
            const end = new Date(plan.endDate);
            const current = new Date(year, month, planDay);
            if (current > end) return;
        }
        if (planDay === day) {
            items.push({ id: plan.id, name: plan.name, amount: plan.amount, type: plan.type === 'income' ? 'income' : 'expense', isRecurring: true, category: 'Recurring' });
        }
    });

    debts.forEach(debt => {
        if (debt.dueDate) {
            const due = new Date(debt.dueDate);
            if (due.getDate() === day && due.getMonth() === month && due.getFullYear() === year) {
                items.push({ id: debt.id, name: `Debt: ${debt.personName}`, amount: debt.amount, type: debt.direction === 'receivable' ? 'income' : 'expense', isDebt: true, category: 'Debt' });
            }
        }
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate >= tomorrow && tDate.getDate() === day && tDate.getMonth() === month && tDate.getFullYear() === year) {
            items.push({ id: t.id, name: t.description || t.merchant, amount: t.amount, type: t.type, isTransaction: true, category: t.category });
        }
    });

    return items;
};

const AGENDA_DAYS_AHEAD = 21;

const AgendaView = ({ recurringPlans, debts, transactions }) => {
    const days = Array.from({ length: AGENDA_DAYS_AHEAD }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    const dayLabel = (d, i) => {
        if (i === 0) return 'Today';
        if (i === 1) return 'Tomorrow';
        return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    const agenda = days
        .map((d, i) => ({ date: d, label: dayLabel(d, i), items: computeItemsForDate(d, recurringPlans, debts, transactions) }))
        .filter(day => day.items.length > 0);

    if (agenda.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-12">
                Nothing scheduled in the next {AGENDA_DAYS_AHEAD} days.
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto divide-y divide-border">
            {agenda.map(({ date, label, items }) => (
                <div key={date.toISOString()} className="py-3 first:pt-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                    <div className="space-y-1.5">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30">
                                <span className="text-sm font-medium truncate pr-2">{item.name}</span>
                                <span className={cn('text-sm font-semibold tabular-nums shrink-0', item.type === 'income' ? 'text-success' : 'text-destructive')}>
                                    {item.type === 'income' ? '+' : '-'}₹{item.amount.toFixed(0)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const FiscalCalendar = () => {
    const { recurringPlans, debts, transactions } = useFinancial();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [view, setView] = useState('agenda');

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Helper to find items for a specific day (delegates to the shared pure function)
    const getItemsForDay = (day) => {
        return computeItemsForDate(new Date(year, month, day), recurringPlans, debts, transactions);
    };

    const handleCellClick = (day, items) => {
        setSelectedDate({ day, items });
        setIsDialogOpen(true);
    };

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const totalSlots = blanks.length + days.length;
    const rows = Math.ceil(totalSlots / 7);

    return (
        <>
            <Card className="sticky top-6 shadow-lg bg-card flex flex-col min-h-[60vh] overflow-hidden">
                <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 flex-shrink-0 border-b border-border/30">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            {view === 'agenda' ? <List className="h-4 w-4 text-primary" /> : <CalendarIcon className="h-4 w-4 text-primary" />}
                            {view === 'agenda' ? 'Upcoming' : 'Fiscal Calendar'}
                        </CardTitle>
                        <SegmentedControl
                            options={[{ value: 'agenda', label: 'Agenda' }, { value: 'month', label: 'Month' }]}
                            value={view}
                            onChange={setView}
                            className="w-40"
                        />
                    </div>
                    {view === 'month' && (
                        <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[100px] text-center">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 p-4">
                    {view === 'agenda' ? (
                        <AgendaView recurringPlans={recurringPlans} debts={debts} transactions={transactions} />
                    ) : (
                        <>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2 flex-shrink-0">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <div key={d} className="py-1">{d}</div>
                        ))}
                    </div>
                    <div
                        className="grid grid-cols-7 gap-0.5 flex-1 min-h-0 overflow-auto"
                        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
                    >
                        {blanks.map(i => (
                            <div key={`blank-${i}`} className="bg-secondary/5 rounded border border-border/10" />
                        ))}
                        {days.map(day => {
                            const items = getItemsForDay(day);
                            const isToday =
                                day === new Date().getDate() &&
                                month === new Date().getMonth() &&
                                year === new Date().getFullYear();

                            return (
                                <div
                                    key={day}
                                    onClick={() => handleCellClick(day, items)}
                                    className={cn(
                                        "p-1.5 rounded border border-border/20 bg-background flex flex-col gap-1 overflow-hidden transition-all hover:border-border/40 hover:shadow-sm cursor-pointer active:scale-95",
                                        isToday && "ring-1 ring-primary/50 bg-primary/5 border-primary/30"
                                    )}
                                >
                                    <span className={cn(
                                        "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0",
                                        isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                    )}>
                                        {day}
                                    </span>
                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        {items.slice(0, 1).map((item, idx) => (
                                            <div
                                                key={`${day}-${idx}`}
                                                className={cn(
                                                    "text-[10px] px-1 py-0.5 rounded truncate flex justify-between items-center flex-shrink-0",
                                                    item.type === 'income'
                                                        ? "bg-success/10 text-success"
                                                        : "bg-destructive/10 text-destructive"
                                                )}
                                                title={`${item.name} - ₹${item.amount}`}
                                            >
                                                <span className="truncate flex-1">{item.name}</span>
                                            </div>
                                        ))}
                                        {items.length > 1 && (
                                            <div className="text-[9px] text-center text-muted-foreground font-medium bg-secondary/50 rounded px-1">
                                                +{items.length - 1} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                title={selectedDate ? `${selectedDate.day} ${currentDate.toLocaleString('default', { month: 'long' })}` : 'Details'}
            >
                <div className="space-y-4">
                    {selectedDate?.items.length > 0 ? (
                        <div className="space-y-2">
                            {selectedDate.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/10">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{item.name}</span>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider",
                                                item.isRecurring ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                                                    item.isDebt ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" :
                                                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                            )}>
                                                {item.isRecurring ? 'Recurring' : item.isDebt ? 'Debt' : 'Transaction'}
                                            </span>
                                            <span>{item.category}</span>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "font-bold text-sm tabular-nums",
                                        item.type === 'income' ? "text-success" : "text-destructive"
                                    )}>
                                        {item.type === 'income' ? '+' : '-'}₹{item.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No activity for this day.</p>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default FiscalCalendar;
