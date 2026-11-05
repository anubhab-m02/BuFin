import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import Dialog from './ui/dialog';
import AddTransactionForm from './AddTransactionForm';
import { formatSignedMoney } from '../lib/money';
import { cn, parseLocalDate } from '../lib/utils';

const FutureTransactions = () => {
    const { transactions, deleteTransaction, isPrivacyMode } = useFinancial();
    const [editingTransaction, setEditingTransaction] = useState(null);

    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const todayStr = getTodayStr();

    // Compare on the date part only: a full ISO datetime for today ("2026-11-05T12:30...")
    // sorts after the bare "2026-11-05", which wrongly listed today's entries as upcoming.
    const futureTransactions = transactions
        .filter(t => (t.date || '').split('T')[0] > todayStr)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (futureTransactions.length === 0) {
        return (
            <Card className="bg-card h-full">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Upcoming transactions</CardTitle>
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
            <Card className="bg-card h-full flex flex-col overflow-hidden">
                <CardHeader className="flex-shrink-0 pb-2">
                    <CardTitle className="text-base font-semibold">Upcoming transactions</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
                    {futureTransactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between py-3 group">
                            <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{t.description || t.merchant}</p>
                                <p className="text-xs text-muted-foreground">{format(parseLocalDate(t.date), 'MMM d, yyyy')}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 pl-2">
                                <div className={cn('font-semibold text-sm tabular-nums', t.type === 'income' ? 'text-success' : 'text-foreground')}>
                                    {isPrivacyMode ? '••••••' : formatSignedMoney(t.amount, t.type)}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={(e) => { e.stopPropagation(); setEditingTransaction(t); }}
                                        title="Edit"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
