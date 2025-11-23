import React, { useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { addDays, startOfWeek, endOfWeek, isSameDay, format } from 'date-fns';

const CashFlowForecast = () => {
    const { balance, recurringPlans, transactions, debts, isPrivacyMode } = useFinancial();

    const forecast = useMemo(() => {
        let runningBalance = balance;
        const weeks = [];
        const today = new Date();

        // Generate 8 weeks
        for (let i = 0; i < 8; i++) {
            const weekStart = addDays(today, i * 7);
            const weekEnd = addDays(weekStart, 6);
            let weeklyIncome = 0;
            let weeklyExpense = 0;

            // Iterate through each day of the week
            for (let d = 0; d < 7; d++) {
                const currentDay = addDays(weekStart, d);
                const dayOfMonth = currentDay.getDate();
                const month = currentDay.getMonth();
                const year = currentDay.getFullYear();

                // 1. Recurring Plans
                recurringPlans.forEach(plan => {
                    let planDay = parseInt(plan.expectedDate);
                    // Handle special dates
                    if (plan.expectedDate === 'last') {
                        planDay = new Date(year, month + 1, 0).getDate();
                    } else if (plan.expectedDate === 'last-working') {
                        let last = new Date(year, month + 1, 0);
                        while (last.getDay() === 0 || last.getDay() === 6) last.setDate(last.getDate() - 1);
                        planDay = last.getDate();
                    }

                    // Check End Date
                    if (plan.endDate && currentDay > new Date(plan.endDate)) return;

                    if (planDay === dayOfMonth) {
                        if (plan.type === 'income') weeklyIncome += plan.amount;
                        else weeklyExpense += plan.amount;
                    }
                });

                // 2. One-off Transactions (Future)
                transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    if (isSameDay(tDate, currentDay)) {
                        if (t.type === 'income') weeklyIncome += t.amount;
                        else weeklyExpense += t.amount;
                    }
                });

                // 3. Debts (Due Dates)
                debts.forEach(debt => {
                    if (debt.dueDate && debt.status === 'active') {
                        const dDate = new Date(debt.dueDate);
                        if (isSameDay(dDate, currentDay)) {
                            if (debt.direction === 'receivable') weeklyIncome += debt.amount;
                            else weeklyExpense += debt.amount;
                        }
                    }
                });
            }

            runningBalance += (weeklyIncome - weeklyExpense);
            weeks.push({
                weekStart,
                balance: runningBalance,
                income: weeklyIncome,
                expense: weeklyExpense,
                isDanger: runningBalance < 0 || (runningBalance < balance * 0.2) // Danger if negative or drops below 20% of current
            });
        }
        return weeks;
    }, [balance, recurringPlans, transactions, debts]);

    const maxBalance = Math.max(...forecast.map(w => Math.abs(w.balance)), 1);
    const minBalance = Math.min(...forecast.map(w => w.balance));

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '•••';
        return `₹${(amount / 1000).toFixed(1)}k`; // Compact format
    };

    return (
        <Card className="h-full border-none shadow-lg bg-card flex flex-col overflow-hidden relative group/card">
            <CardHeader className="pb-2 pt-4 px-5 flex-shrink-0 z-10">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2 text-foreground/90">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        8-Week Forecast
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold bg-secondary/50 px-2 py-0.5 rounded-full">
                        Net Balance
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-5 pb-4 pt-12 flex items-end justify-between gap-3 relative">
                {/* Background Grid Lines (Optional visual anchor) */}
                <div className="absolute inset-x-5 bottom-8 top-12 flex flex-col justify-between pointer-events-none opacity-10">
                    <div className="w-full h-px bg-foreground" />
                    <div className="w-full h-px bg-foreground" />
                    <div className="w-full h-px bg-foreground" />
                </div>

                {forecast.map((week, idx) => {
                    // Calculate height percentage relative to max absolute value
                    // Ensure a minimum height for visibility
                    const heightPct = Math.max((Math.abs(week.balance) / maxBalance) * 100, 10);

                    return (
                        <div key={idx} className="flex flex-col items-center gap-2 w-full h-full justify-end group relative z-20">
                            {/* Tooltip - Positioned dynamically above the bar */}
                            <div
                                className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-popover/95 backdrop-blur-sm text-popover-foreground text-[10px] p-2.5 rounded-xl shadow-xl border border-border/50 whitespace-nowrap z-50 pointer-events-none scale-95 group-hover:scale-100 origin-bottom mb-2"
                                style={{ bottom: `${heightPct}%` }}
                            >
                                <div className="font-semibold mb-0.5">{format(week.weekStart, 'MMM d')} - {format(addDays(week.weekStart, 6), 'MMM d')}</div>
                                <div className={`text-xs font-bold ${week.balance < 0 ? 'text-red-500' : 'text-primary'}`}>
                                    {isPrivacyMode ? '••••' : `₹${week.balance.toLocaleString()}`}
                                </div>
                                <div className="text-muted-foreground mt-0.5 flex gap-2">
                                    <span className="text-green-500">+{isPrivacyMode ? '••' : (week.income / 1000).toFixed(1)}k</span>
                                    <span className="text-red-500">-{isPrivacyMode ? '••' : (week.expense / 1000).toFixed(1)}k</span>
                                </div>
                                {/* Tooltip Arrow */}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-popover/95 border-r border-b border-border/50 rotate-45"></div>
                            </div>

                            {/* Bar */}
                            <div
                                className={`w-full rounded-t-lg transition-all duration-500 relative overflow-hidden ${week.balance < 0 ? 'bg-gradient-to-t from-red-500/80 to-red-400' :
                                        week.isDanger ? 'bg-gradient-to-t from-yellow-500/80 to-yellow-400' :
                                            'bg-gradient-to-t from-primary/80 to-primary/40'
                                    } group-hover:brightness-110 group-hover:shadow-[0_0_15px_rgba(var(--primary),0.3)]`}
                                style={{ height: `${heightPct}%` }}
                            >
                                {/* Shine Effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Label */}
                            <span className={`text-[10px] font-medium transition-colors ${idx === 0 ? 'text-primary font-bold' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                {idx === 0 ? 'Now' : `W${idx + 1}`}
                            </span>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};

export default CashFlowForecast;
