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
    const { transactions, deleteTransaction, isPrivacyMode, debts, categories } = useFinancial();
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [splitTransaction, setSplitTransaction] = useState(null);
    const [viewingTransaction, setViewingTransaction] = useState(null);

    // Filters & Sorting
    const [filterType, setFilterType] = useState('all'); // all, income, expense, debt
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

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
        });
    };

    // Combine Data Sources if needed, or switch based on filter
    const getDataSource = () => {
        if (filterType === 'debt') {
            return debts.map(d => ({
                ...d,
                date: d.dueDate || new Date().toISOString(), // Use dueDate or now
                merchant: d.personName,
                category: 'Debt',
                description: d.direction === 'receivable' ? 'Owes me' : 'I owe', // Map remarks/desc
                type: d.direction === 'receivable' ? 'income' : 'expense', // Map for color coding (Receivable = Green/Income-like)
                isDebt: true
            }));
        }
        return transactions;
    };

    const rawData = getDataSource();

    // Filter
    const filteredData = rawData.filter(item => {
        // Always filter out future transactions from the Ledger
        // Use LOCAL time for "today" to match user's perspective
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const itemDate = item.date.split('T')[0];
        if (itemDate > todayStr) return false;

        if (filterType === 'all') return true;
        if (filterType === 'debt') return true; // Already switched source
        return item.type === filterType;
    });

    // Sort
    const sortedData = [...filteredData].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'amount') {
            aValue = parseFloat(aValue);
            bValue = parseFloat(bValue);
        } else if (sortConfig.key === 'date') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Calculate Running Balance (Net Balance)
    const dataWithBalance = (() => {
        // Sort chronologically ascending to calc balance
        const chrono = [...sortedData].sort((a, b) => new Date(a.date) - new Date(b.date));
        let running = 0;
        const withBal = chrono.map(item => {
            const amt = item.type === 'income' ? item.amount : -item.amount;
            running += amt;
            return { ...item, balance: running };
        });

        // Now re-sort to match user's sort config
        if (sortConfig.key === 'date' && sortConfig.direction === 'desc') {
            return withBal.reverse();
        }
        return withBal.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            if (sortConfig.key === 'amount') { aValue = parseFloat(aValue); bValue = parseFloat(bValue); }
            if (sortConfig.key === 'date') { aValue = new Date(aValue); bValue = new Date(bValue); }
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    })();

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Transaction History</CardTitle>
                    <div className="flex gap-2">
                        <select
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">All Transactions</option>
                            <option value="income">Income Only</option>
                            <option value="expense">Expense Only</option>
                            <option value="debt">Debts (Owed)</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg cursor-pointer hover:text-foreground" onClick={() => handleSort('date')}>
                                        Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3">Merchant / Person</th>
                                    <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('category')}>
                                        Category
                                    </th>
                                    <th className="px-4 py-3">Title</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('amount')}>
                                        Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-right">Net Bal</th>
                                    <th className="px-4 py-3 rounded-tr-lg text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataWithBalance.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-4">
                                            <EmptyState
                                                title="No records found"
                                                description="Try adjusting your filters or add a new transaction."
                                                actionLabel="Add Transaction"
                                                onAction={() => document.querySelector('button[type="submit"]')?.click()}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    dataWithBalance.map((t) => (
                                        <tr
                                            key={t.id}
                                            className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                                            onClick={() => setViewingTransaction(t)}
                                        >
                                            <td className="px-4 py-3 font-medium whitespace-nowrap">{formatDate(t.date)}</td>
                                            <td className="px-4 py-3">{t.merchant || t.personName || '-'}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate" title={t.description}>
                                                {t.description || '-'}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-muted-foreground font-mono text-xs">
                                                {formatCurrency(t.balance)}
                                            </td>
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    {!t.isDebt && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={(e) => { e.stopPropagation(); setEditingTransaction(t); }}
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={(e) => { e.stopPropagation(); setSplitTransaction(t); }}
                                                                title="Split Bill"
                                                            >
                                                                <UserPlus className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                                onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }}
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
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
                isOpen={!!viewingTransaction}
                onClose={() => setViewingTransaction(null)}
                title="Transaction Details"
            >
                {viewingTransaction && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-4">
                            <div>
                                <h3 className="text-lg font-bold">{viewingTransaction.description || 'No Title'}</h3>
                                <p className="text-sm text-muted-foreground">{formatDate(viewingTransaction.date)}</p>
                            </div>
                            <div className={`text-xl font-bold ${viewingTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {viewingTransaction.type === 'income' ? '+' : '-'}{formatCurrency(viewingTransaction.amount)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block">Merchant</span>
                                <span className="font-medium">{viewingTransaction.merchant || viewingTransaction.personName || '-'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block">Category</span>
                                <span className="font-medium">{viewingTransaction.category}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block">Type</span>
                                <span className="capitalize">{viewingTransaction.type}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block">Necessity</span>
                                <span className="capitalize">{viewingTransaction.necessity || '-'}</span>
                            </div>
                        </div>

                        <div className="bg-muted/30 p-3 rounded-md">
                            <span className="text-muted-foreground block text-xs mb-1">Remarks</span>
                            <p className="text-sm">{viewingTransaction.remarks || 'No remarks provided.'}</p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button variant="outline" onClick={() => setViewingTransaction(null)}>Close</Button>
                        </div>
                    </div>
                )}
            </Dialog>

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
