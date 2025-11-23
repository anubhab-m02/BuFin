import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CalendarClock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';

const FutureTransactions = () => {
    const { transactions } = useFinancial();

    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const todayStr = getTodayStr();

    const futureTransactions = transactions
        .filter(t => t.date > todayStr)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (futureTransactions.length === 0) {
        return (
            <Card className="border-none shadow-lg rounded-2xl bg-card h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <CalendarClock className="h-5 w-5 text-primary" />
                        Upcoming Transactions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No upcoming one-off transactions scheduled.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg rounded-2xl bg-card h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    Upcoming Transactions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {futureTransactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {t.type === 'income' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div>
                                <p className="font-medium text-sm">{t.description || t.merchant}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                            </div>
                        </div>
                        <div className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export default FutureTransactions;
