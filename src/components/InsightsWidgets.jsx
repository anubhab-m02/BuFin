import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export const SpendingComparisonWidget = () => {
    const { transactions, categories } = useFinancial();

    // 1. Calculate User's Spending by Category for THIS Month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const userSpending = transactions
        .filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
        })
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

    // 2. Dummy "Average User" Data (Benchmarks)
    const averageUserSpending = {
        'Food': 5000,
        'Transport': 2000,
        'Shopping': 3000,
        'Utilities': 1500,
        'Entertainment': 1000,
        'Health': 500,
        'Education': 1000,
        'Travel': 0,
        'Savings': 0,
        'Housing': 8000
    };

    // 3. Compare Top 3 Categories
    const comparisons = Object.keys(userSpending)
        .map(cat => {
            const user = userSpending[cat] || 0;
            const avg = averageUserSpending[cat] || 2000; // Default fallback
            const diff = user - avg;
            const percent = avg === 0 ? 100 : ((diff / avg) * 100).toFixed(0);
            return { category: cat, user, avg, diff, percent };
        })
        .sort((a, b) => b.user - a.user) // Sort by highest user spending
        .slice(0, 3);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" /> You vs. Average BuFin User
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {comparisons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Add expenses to see comparisons.</p>
                ) : (
                    comparisons.map((item) => (
                        <div key={item.category} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">{item.category}</span>
                                <span className={item.diff > 0 ? "text-red-500" : "text-green-500"}>
                                    {item.diff > 0 ? `+${item.percent}% higher` : `${Math.abs(item.percent)}% lower`}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                                {/* Visualizing User vs Avg is tricky in one bar. Let's just show User bar relative to max? 
                                    Actually, let's do a simple text comparison for now as requested.
                                */}
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${Math.min(100, (item.user / (item.user + item.avg)) * 100)}%` }}
                                />
                                <div
                                    className="h-full bg-muted-foreground/30"
                                    style={{ width: `${Math.min(100, (item.avg / (item.user + item.avg)) * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>You: ₹{item.user}</span>
                                <span>Avg: ₹{item.avg}</span>
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
