import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Edit2, UserPlus, Search } from 'lucide-react';
import Dialog from './ui/dialog';
import AddTransactionForm from './AddTransactionForm';
import { AddDebtForm } from './PlannerForms';
import EmptyState from './EmptyState';
import { Skeleton } from './ui/skeleton';
import { getCategoryMeta } from '../lib/categoryMeta';
import { formatSignedMoney } from '../lib/money';

const dayLabel = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a, b) => a.toDateString() === b.toDateString();
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
};

const TransactionTable = () => {
    const { transactions, deleteTransaction, isPrivacyMode, debts, isDataLoading } = useFinancial();
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [splitTransaction, setSplitTransaction] = useState(null);
    const [viewingTransaction, setViewingTransaction] = useState(null);
    const [filterType, setFilterType] = useState('all'); // all, income, expense, debt
    const [search, setSearch] = useState('');

    const formatSigned = (amount, type) => (isPrivacyMode ? '••••••' : formatSignedMoney(amount, type));

    const formatDate = (isoString) => {
        if (!isoString) return 'Unknown Date';
        return new Date(isoString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getDataSource = () => {
        if (filterType === 'debt') {
            return debts.map(d => ({
                ...d,
                date: d.dueDate || new Date().toISOString(),
                merchant: d.personName,
                category: 'Debt',
                description: d.direction === 'receivable' ? 'Owes me' : 'I owe',
                type: d.direction === 'receivable' ? 'income' : 'expense',
                isDebt: true
            }));
        }
        return transactions;
    };

    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const searchLower = search.trim().toLowerCase();

    const filteredData = getDataSource()
        .filter(item => {
            const itemDate = (item.date || '').split('T')[0];
            if (itemDate > todayStr) return false;
            if (filterType !== 'all' && filterType !== 'debt' && item.type !== filterType) return false;
            if (searchLower) {
                const haystack = `${item.merchant || ''} ${item.description || ''} ${item.category || ''}`.toLowerCase();
                if (!haystack.includes(searchLower)) return false;
            }
            return true;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const groups = filteredData.reduce((acc, item) => {
        const key = dayLabel(item.date);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search merchant, category, or note..."
                            className="pl-9"
                        />
                    </div>
                    <select
                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm transition-colors duration-fast"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Transactions</option>
                        <option value="income">Income Only</option>
                        <option value="expense">Expense Only</option>
                        <option value="debt">Debts (Owed)</option>
                    </select>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                    {isDataLoading ? (
                        [0, 1, 2, 3].map(i => (
                            <div key={i} className="py-3 flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))
                    ) : filteredData.length === 0 ? (
                        <EmptyState
                            title="No records found"
                            description="Try adjusting your search or filters."
                        />
                    ) : (
                        Object.entries(groups).map(([label, items]) => (
                            <div key={label} className="py-2 first:pt-0 last:pb-0">
                                <p className="sticky top-0 z-10 bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">
                                    {label}
                                </p>
                                <div className="divide-y divide-border/60">
                                    {items.map((t) => {
                                        const meta = getCategoryMeta(t.category);
                                        return (
                                            <div
                                                key={t.id}
                                                className="flex items-center gap-3 py-3 cursor-pointer group"
                                                onClick={() => setViewingTransaction(t)}
                                            >
                                                <div
                                                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
                                                >
                                                    <meta.icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {t.merchant || t.personName || t.description || t.category}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {t.category}{t.description ? ` • ${t.description}` : ''}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-sm font-semibold tabular-nums ${t.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                                                        {formatSigned(t.amount, t.type)}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">{formatDate(t.date)}</p>
                                                </div>
                                                {!t.isDebt && (
                                                    <div
                                                        className="flex items-center gap-0.5 shrink-0 pl-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 text-muted-foreground hover:text-primary"
                                                            onClick={() => setEditingTransaction(t)}
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 text-muted-foreground hover:text-primary hidden sm:inline-flex"
                                                            onClick={() => setSplitTransaction(t)}
                                                            title="Split Bill"
                                                        >
                                                            <UserPlus className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                                            onClick={() => deleteTransaction(t.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
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
                            <div className={`text-xl font-bold tabular-nums ${viewingTransaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                                {formatSigned(viewingTransaction.amount, viewingTransaction.type)}
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
                            direction: 'receivable',
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
