import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

// Compares this month's spend per category against the user's OWN historical average for
// that category (not a fabricated "average user" benchmark - there's no real user base to
// compare against, and presenting made-up numbers as data would be actively misleading).
export const SpendingComparisonWidget = () => {
    const { transactions } = useFinancial();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthSpending = {};
    const historyByCategory = {};

    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            const d = new Date(t.date);
            const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                currentMonthSpending[t.category] = (currentMonthSpending[t.category] || 0) + t.amount;
            } else {
                if (!historyByCategory[t.category]) historyByCategory[t.category] = {};
                historyByCategory[t.category][monthKey] = (historyByCategory[t.category][monthKey] || 0) + t.amount;
            }
        });

    const comparisons = Object.entries(currentMonthSpending)
        .map(([category, user]) => {
            const pastMonths = Object.values(historyByCategory[category] || {});
            if (pastMonths.length === 0) return null; // no history yet to compare against
            const avg = pastMonths.reduce((a, b) => a + b, 0) / pastMonths.length;
            const diff = user - avg;
            const percent = avg === 0 ? 100 : Math.round((diff / avg) * 100);
            return { category, user, avg, diff, percent };
        })
        .filter(Boolean)
        .sort((a, b) => b.user - a.user)
        .slice(0, 3);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" /> This Month vs. Your Average
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {comparisons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not enough history yet - comparisons appear once a category has at least one prior month of spending.</p>
                ) : (
                    comparisons.map((item) => (
                        <div key={item.category} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">{item.category}</span>
                                <span className={item.diff > 0 ? "text-destructive" : "text-success"}>
                                    {item.diff > 0 ? `+${item.percent}% higher` : `${Math.abs(item.percent)}% lower`}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${Math.min(100, (item.user / (item.user + item.avg)) * 100)}%` }}
                                />
                                <div
                                    className="h-full bg-muted-foreground/30"
                                    style={{ width: `${Math.min(100, (item.avg / (item.user + item.avg)) * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                                <span>You: ₹{item.user.toFixed(0)}</span>
                                <span>Your avg: ₹{item.avg.toFixed(0)}</span>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
};

export const TrendPredictionWidget = () => {
    const { transactions } = useFinancial();

    // 1. Group expenses by month (last 3 months)
    const monthlyExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`; // "2023-10"
            acc[key] = (acc[key] || 0) + t.amount;
            return acc;
        }, {});

    const months = Object.keys(monthlyExpenses).sort();
    const last3Months = months.slice(-3);

    // 2. Calculate Average
    const totalLast3 = last3Months.reduce((sum, m) => sum + monthlyExpenses[m], 0);
    const average = last3Months.length > 0 ? totalLast3 / last3Months.length : 0;

    // 3. Predict Next Month (Simple Moving Average + 5% inflation buffer)
    const prediction = average * 1.05;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Next Month Forecast
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-4">
                    <span className="text-3xl font-bold">₹{prediction.toFixed(0)}</span>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                        Predicted spending for next month based on your recent trends (+5% buffer).
                    </p>
                </div>
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">3-Month Avg</span>
                        <span>₹{average.toFixed(0)}</span>
                    </div>
                    {last3Months.map(m => {
                        const [y, monthIdx] = m.split('-');
                        const monthName = new Date(y, monthIdx).toLocaleString('default', { month: 'short' });
                        return (
                            <div key={m} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{monthName}</span>
                                <span>₹{monthlyExpenses[m].toFixed(0)}</span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
