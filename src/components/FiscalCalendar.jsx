import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';

const FiscalCalendar = () => {
    const { recurringPlans, debts } = useFinancial();
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Helper to find items for a specific day
    const getItemsForDay = (day) => {
        const items = [];

        // Recurring Plans
        recurringPlans.forEach(plan => {
            let planDay = parseInt(plan.expectedDate);

            // Handle "last day of month" logic
            if (plan.expectedDate === 'last') {
                planDay = daysInMonth;
            } else if (plan.expectedDate === 'last-working') {
                // Calculate last working day (Mon-Fri)
                let d = new Date(year, month, daysInMonth);
                while (d.getDay() === 0 || d.getDay() === 6) { // 0=Sun, 6=Sat
                    d.setDate(d.getDate() - 1);
                }
                planDay = d.getDate();
            }

            // Check End Date
            if (plan.endDate) {
                const end = new Date(plan.endDate);
                const current = new Date(year, month, planDay);
                if (current > end) return; // Skip if past end date
            }

            if (planDay === day) {
                items.push({
                    id: plan.id,
                    name: plan.name,
                    amount: plan.amount,
                    type: plan.type === 'income' ? 'income' : 'expense',
                    isRecurring: true
                });
            }
        });

        // Debts (Due Dates)
        debts.forEach(debt => {
            if (debt.dueDate) {
                const due = new Date(debt.dueDate);
                if (due.getDate() === day && due.getMonth() === month && due.getFullYear() === year) {
                    items.push({
                        id: debt.id,
                        name: `Debt: ${debt.personName}`,
                        amount: debt.amount,
                        type: debt.direction === 'receivable' ? 'income' : 'expense',
                        isDebt: true
                    });
                }
            }
        });

        return items;
    };

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const totalSlots = blanks.length + days.length;
    const rows = Math.ceil(totalSlots / 7);

    return (
        <Card className="sticky top-6 border-none shadow-lg rounded-2xl bg-card flex flex-col min-h-[60vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 flex-shrink-0 border-b border-border/30">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Fiscal Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
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
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
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
                                className={cn(
                                    "p-1.5 rounded border border-border/20 bg-background flex flex-col gap-1 overflow-hidden transition-all hover:border-border/40 hover:shadow-sm",
                                    isToday && "ring-1 ring-primary/50 bg-primary/5 border-primary/30"
                                )}
                            >
                                <span className={cn(
                                    "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0",
                                    isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                )}>
                                    {day}
                                </span>
                                <div className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar min-h-0">
                                    {items.map((item, idx) => (
                                        <div
                                            key={`${day}-${idx}`}
                                            className={cn(
                                                "text-[10px] px-1 py-0.5 rounded truncate flex justify-between items-center flex-shrink-0",
                                                item.type === 'income'
                                                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                                            )}
                                            title={`${item.name} - ₹${item.amount}`}
                                        >
                                            <span className="truncate flex-1">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default FiscalCalendar;
