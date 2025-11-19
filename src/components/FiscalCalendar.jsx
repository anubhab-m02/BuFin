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

    return (
        <Card className="h-full border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
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
            <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="py-1">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {blanks.map(i => (
                        <div key={`blank-${i}`} className="h-20 bg-secondary/10 rounded-md border border-transparent" />
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
                                    "h-20 p-1 rounded-md border border-border bg-background flex flex-col gap-1 overflow-hidden transition-colors hover:bg-secondary/20",
                                    isToday && "ring-1 ring-primary bg-primary/5"
                                )}
                            >
                                <span className={cn(
                                    "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                                    isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                )}>
                                    {day}
                                </span>
                                <div className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
                                    {items.map((item, idx) => (
                                        <div
                                            key={`${day}-${idx}`}
                                            className={cn(
                                                "text-[10px] px-1 py-0.5 rounded truncate flex justify-between items-center",
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
