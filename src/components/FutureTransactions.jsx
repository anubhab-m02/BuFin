import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CalendarClock, ArrowUpRight, ArrowDownLeft, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import Dialog from './ui/dialog';
import AddTransactionForm from './AddTransactionForm';

const FutureTransactions = () => {
    const { transactions, deleteTransaction } = useFinancial();
    const [editingTransaction, setEditingTransaction] = useState(null);

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
        <>
            <Card className="border-none shadow-lg rounded-2xl bg-card h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <CalendarClock className="h-5 w-5 text-primary" />
                        Upcoming Transactions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {futureTransactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {t.type === 'income' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{t.description || t.merchant}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        onClick={(e) => { e.stopPropagation(); setEditingTransaction(t); }}
                                        title="Edit"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                        onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }}
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Dialog
                isOpen={!!editingTransaction}
                onClose={() => setEditingTransaction(null)}
                title="Edit Transaction"
            >
                {editingTransaction && (
                    <AddTransactionForm
                        initialData={editingTransaction}
                        mode="edit"
                        onSuccess={() => setEditingTransaction(null)}
                    />
                )}
            </Dialog>
        </>
    );
};

export default FutureTransactions;
