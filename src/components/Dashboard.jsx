import React, { useMemo, useState } from 'react';
import { parseLocalDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { ThresholdProgress } from './ui/progress';
import { CHART_COLORS, chartTooltipStyle } from '../lib/chartTheme';
import { formatMoney } from '../lib/money';

export const BudgetSummaryCard = () => {
    const { budgets, transactions, isDataLoading } = useFinancial();
    const navigate = useNavigate();

    const now = new Date();
    const withSpend = budgets.map(b => {
        const spent = transactions
            .filter(t => {
                if (t.type !== 'expense' || t.category !== b.category) return false;
                const d = parseLocalDate(t.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((acc, t) => acc + t.amount, 0);
        return { ...b, spent, pct: b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0 };
    });

    const overBudget = withSpend.filter(b => b.pct >= 100).sort((a, b) => b.pct - a.pct);

    if (isDataLoading) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Budgets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => navigate('/budgets')}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Budgets</CardTitle>
            </CardHeader>
            <CardContent>
                {budgets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No budgets set — tap to add category limits.</p>
                ) : overBudget.length === 0 ? (
                    <p className="text-sm text-success font-medium">All {budgets.length} categories on track this month.</p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                            {overBudget.length} of {budgets.length} categor{overBudget.length === 1 ? 'y' : 'ies'} over budget
                        </p>
                        {overBudget.slice(0, 2).map(b => (
                            <div key={b.id} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="font-medium">{b.category}</span>
                                    <span className="text-destructive tabular-nums">{Math.round(b.pct)}%</span>
                                </div>
                                <ThresholdProgress value={b.pct} className="h-2" />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export const FinancialSummaryCard = () => {
    const { balance, income, expense, isDataLoading, isPrivacyMode } = useFinancial();
    const mask = '••••••';

    if (isDataLoading) {
        return (
            <Card className="h-full">
                <CardContent className="h-full flex flex-col justify-between p-5">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardContent className="h-full flex flex-col justify-between p-5">
                <div>
                    <p className="text-sm text-muted-foreground">Net balance</p>
                    <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                        {isPrivacyMode ? mask : formatMoney(balance)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                        <p className="text-xs text-muted-foreground">Income</p>
                        <div className="text-lg font-semibold text-success tabular-nums">
                            {isPrivacyMode ? mask : `+${formatMoney(income)}`}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Expense</p>
                        <div className="text-lg font-semibold tabular-nums">
                            {isPrivacyMode ? mask : `-${formatMoney(expense)}`}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Spending by category as a ranked list; the biggest category carries the one data hue.
// Clicking a category opens its six-month trend, with a back button to return to the list.
export const ExpenseBreakdown = () => {
    const { transactions, isDataLoading, isPrivacyMode } = useFinancial();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const formatCurrency = (amount) => (isPrivacyMode ? '••••••' : formatMoney(amount));

    // Group all expense transactions by category, largest first.
    const chartData = useMemo(() => {
        return transactions
            .filter((t) => t.type === 'expense')
            .reduce((acc, curr) => {
                const category = curr.category || 'Other';
                const existing = acc.find((item) => item.name === category);
                const amount = Number(curr.amount) || 0;
                if (existing) {
                    existing.value += amount;
                } else {
                    acc.push({ name: category, value: amount });
                }
                return acc;
            }, [])
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    const totalSpend = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

    // Build a six-month spending history for the selected category.
    const trendData = useMemo(() => {
        if (!selectedCategory) return [];

        const now = new Date();

        return Array.from({ length: 6 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
            const month = date.getMonth();
            const year = date.getFullYear();

            // Sum expenses belonging to the selected category for this month.
            const amount = transactions
                .filter((transaction) => {
                    if (transaction.type !== 'expense' || (transaction.category || 'Other') !== selectedCategory) {
                        return false;
                    }
                    const transactionDate = parseLocalDate(transaction.date);
                    return transactionDate.getMonth() === month && transactionDate.getFullYear() === year;
                })
                .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);

            return { month: date.toLocaleDateString('en-US', { month: 'short' }), amount };
        });
    }, [transactions, selectedCategory]);

    const selectedCategoryTotal = useMemo(() => {
        if (!selectedCategory) return 0;
        return chartData.find((item) => item.name === selectedCategory)?.value || 0;
    }, [chartData, selectedCategory]);

    return (
        <Card className="h-[420px] flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    {selectedCategory && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setSelectedCategory(null)}
                            aria-label="Back to expense breakdown"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <CardTitle className="text-base font-semibold">
                            {selectedCategory ? `${selectedCategory} spending` : 'Expense breakdown'}
                        </CardTitle>
                        {selectedCategory && <p className="text-xs text-muted-foreground mt-1">Last 6 months</p>}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 p-2 overflow-y-auto">
                {isDataLoading ? (
                    <div className="space-y-4 px-3 py-2">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-1.5 w-full" />
                            </div>
                        ))}
                    </div>
                ) : selectedCategory ? (
                    <div className="h-full w-full flex flex-col">
                        <div className="px-3 pb-2">
                            <p className="text-xs text-muted-foreground">Total spending</p>
                            <p className="text-2xl font-bold tabular-nums">{formatCurrency(selectedCategoryTotal)}</p>
                        </div>

                        {trendData.some((item) => item.amount > 0) ? (
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData} margin={{ top: 10, right: 20, left: 5, bottom: 5 }}>
                                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                            axisLine={{ stroke: 'var(--border)' }}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) => (isPrivacyMode ? '•••' : `₹${value}`)}
                                        />
                                        <Tooltip
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [formatCurrency(value), 'Spending']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="amount"
                                            stroke={CHART_COLORS[0]}
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: CHART_COLORS[0] }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                                No spending data available.
                            </div>
                        )}
                    </div>
                ) : chartData.length > 0 ? (
                    <ul className="space-y-1">
                        {chartData.map((item, index) => {
                            const share = totalSpend > 0 ? (item.value / totalSpend) * 100 : 0;
                            return (
                                <li key={item.name}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategory(item.name)}
                                        className="w-full rounded-md px-3 py-2 text-left transition-colors duration-fast hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label={`${item.name}, ${formatCurrency(item.value)}, ${Math.round(share)}% of spending. Open six-month trend`}
                                    >
                                        <div className="flex items-baseline justify-between gap-3 text-sm">
                                            <span className="truncate font-medium">{item.name}</span>
                                            <span className="shrink-0 tabular-nums">
                                                {formatCurrency(item.value)}
                                                <span className="ml-2 text-xs text-muted-foreground">{Math.round(share)}%</span>
                                            </span>
                                        </div>
                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                                            <div
                                                className={index === 0 ? 'h-full rounded-full bg-data' : 'h-full rounded-full bg-muted-foreground/40'}
                                                style={{ width: `${share}%` }}
                                            />
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        No expenses yet
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
