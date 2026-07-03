import React, { useMemo } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp } from 'lucide-react';
import { addDays, isSameDay, format } from 'date-fns';
import { resolveExpectedDay } from '../lib/utils';
import { chartTooltipStyle } from '../lib/chartTheme';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    Cell,
} from 'recharts';

const ForecastTooltip = ({ active, payload, isPrivacyMode }) => {
    if (!active || !payload?.length) return null;
    const week = payload[0].payload;
    return (
        <div style={chartTooltipStyle} className="p-2.5">
            <div className="font-semibold mb-0.5">
                {format(week.weekStart, 'MMM d')} - {format(addDays(week.weekStart, 6), 'MMM d')}
            </div>
            <div className={`text-xs font-bold tabular-nums ${week.balance < 0 ? 'text-destructive' : 'text-primary'}`}>
                {isPrivacyMode ? '••••' : `₹${week.balance.toLocaleString()}`}
            </div>
            <div className="text-muted-foreground mt-0.5 flex gap-2 tabular-nums text-xs">
                <span className="text-success">+{isPrivacyMode ? '••' : (week.income / 1000).toFixed(1)}k</span>
                <span className="text-destructive">-{isPrivacyMode ? '••' : (week.expense / 1000).toFixed(1)}k</span>
            </div>
        </div>
    );
};

const CashFlowForecast = () => {
    const { balance, recurringPlans, transactions, debts, isPrivacyMode } = useFinancial();

    const forecast = useMemo(() => {
        let runningBalance = balance;
        const weeks = [];
        const today = new Date();

        // Generate 8 weeks
        for (let i = 0; i < 8; i++) {
            const weekStart = addDays(today, i * 7);
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
                    const planDay = resolveExpectedDay(plan.expectedDate, year, month);

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
                label: i === 0 ? 'Now' : `W${i + 1}`,
                weekStart,
                balance: runningBalance,
                income: weeklyIncome,
                expense: weeklyExpense,
                isDanger: runningBalance < 0 || (runningBalance < balance * 0.2),
            });
        }
        return weeks;
    }, [balance, recurringPlans, transactions, debts]);

    const barColor = (week) => week.balance < 0 ? 'var(--destructive)' : week.isDanger ? 'var(--warning)' : 'var(--primary)';

    return (
        <Card className="h-full border-none shadow-lg bg-card flex flex-col overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-5 flex-shrink-0">
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
            <CardContent className="flex-1 min-h-0 p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecast} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                            tickFormatter={(v) => isPrivacyMode ? '•••' : `₹${(v / 1000).toFixed(0)}k`}
                            width={48}
                        />
                        <ReferenceLine y={0} stroke="var(--border)" />
                        <Tooltip content={<ForecastTooltip isPrivacyMode={isPrivacyMode} />} cursor={{ fill: 'var(--secondary)', opacity: 0.4 }} />
                        <Bar dataKey="balance" radius={[6, 6, 0, 0]} maxBarSize={40}>
                            {forecast.map((week, idx) => (
                                <Cell key={idx} fill={barColor(week)} fillOpacity={idx === 0 ? 1 : 0.75} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default CashFlowForecast;
