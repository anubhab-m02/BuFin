import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Trash2, Edit2, UserPlus } from 'lucide-react';
import Dialog from './ui/dialog';
import AddTransactionForm from './AddTransactionForm';
import { AddDebtForm } from './PlannerForms';
import EmptyState from './EmptyState';

const TransactionTable = () => {
    const { transactions, deleteTransaction, isPrivacyMode } = useFinancial();
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [splitTransaction, setSplitTransaction] = useState(null);

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'Unknown Date';
        return new Date(isoString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Date</th>
                                    <th className="px-4 py-3">Merchant</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Remarks</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3 rounded-tr-lg text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-4">
                                            <EmptyState
                                                title="No transactions yet"
                                                description="Start tracking your income and expenses to see them here."
                                                actionLabel="Add Transaction"
                                                onAction={() => document.querySelector('button[type="submit"]')?.click()} // Hacky but works for now, better to lift state
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((t) => (
                                        <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3 font-medium">{formatDate(t.date)}</td>
                                            <td className="px-4 py-3">{t.merchant || '-'}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={t.remarks}>
                                                {t.remarks || '-'}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => setEditingTransaction(t)}
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => setSplitTransaction(t)}
                                                        title="Split Bill (Create Debt)"
                                                    >
                                                        <UserPlus className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                        onClick={() => deleteTransaction(t.id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
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

            <Dialog
                isOpen={!!splitTransaction}
                onClose={() => setSplitTransaction(null)}
                title="Split Bill / Add Debt"
            >
                {splitTransaction && (
                    <AddDebtForm
                        initialData={{
                            amount: splitTransaction.amount,
                            direction: 'receivable', // Usually if I paid, they owe me
                            personName: ''
                        }}
                        onSuccess={() => setSplitTransaction(null)}
                    />
                )}
            </Dialog>
        </>
    );
};

export default TransactionTable;
