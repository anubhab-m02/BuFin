import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Trash2 } from 'lucide-react';
import JargonBuster from './JargonBuster';
import { Button } from './ui/button';
import EmptyState from './EmptyState';

export const FinancialSummaryCard = () => {
    const { balance, income, expense } = useFinancial();
    return (
        <Card className="h-full shadow-sm">
            <CardContent className="h-full flex flex-col justify-between p-5">
                {/* Balance */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-xs font-semibold uppercase tracking-wider">Net Balance</span>
                        <Wallet className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-3xl font-bold tracking-tight">₹{balance.toFixed(0)}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    {/* Income */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <div className="p-1 rounded-full bg-green-500/10">
                                <TrendingUp className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="text-[10px] font-semibold uppercase">Income</span>
                        </div>
                        <div className="text-lg font-semibold text-green-600 dark:text-green-400">+₹{income.toFixed(0)}</div>
                    </div>

                    {/* Expenses */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <div className="p-1 rounded-full bg-red-500/10">
                                <TrendingDown className="h-3 w-3 text-red-600" />
                            </div>
                            <span className="text-[10px] font-semibold uppercase">Expense</span>
                        </div>
                        <div className="text-lg font-semibold text-red-600 dark:text-red-400">-₹{expense.toFixed(0)}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export const ExpenseBreakdown = () => {
    const { transactions } = useFinancial();
    const chartData = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => {
            const existing = acc.find(item => item.name === curr.category);
            if (existing) {
                existing.value += curr.amount;
            } else {
                acc.push({ name: curr.category, value: curr.amount });
            }
            return acc;
        }, []);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-2">
                {chartData.length > 0 ? (
                    <div className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        No expenses yet
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export const RecentTransactions = () => {
    const { transactions, deleteTransaction } = useFinancial();
    const navigate = useNavigate();

    // Robust sort: Date descending, then ID descending (for same-day items)
    const sortedTransactions = [...transactions].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
        return b.id - a.id; // Fallback to ID if dates are equal
    });

    return (
        <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="py-4 px-5 flex flex-row items-center justify-between border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Transactions</CardTitle>
                <Button variant="ghost" className="h-auto p-0 text-xs font-medium text-primary hover:text-primary/80" onClick={() => navigate('/ledger')}>
                    View All
                </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="px-5 py-2 space-y-1">
                    {sortedTransactions.slice(0, 3).map((t) => (
                        <div key={t.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 group">
                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                <p className="font-medium truncate text-sm">{t.category}</p>
                                <p className="text-xs text-muted-foreground truncate">{t.description || t.merchant}</p>
                            </div>
                            <div className="flex items-center gap-3 pl-2 shrink-0">
                                <div className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(0)}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50"
                                    onClick={() => deleteTransaction(t.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {transactions.length === 0 && (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                            <div className="p-3 rounded-full bg-muted mb-3">
                                <Wallet className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Your latest transactions will appear here.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const Dashboard = () => {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-1">
                <FinancialSummaryCard />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <ExpenseBreakdown />
                <RecentTransactions />
            </div>
        </div>
    );
};

export default Dashboard;
