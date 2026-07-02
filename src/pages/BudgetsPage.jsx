import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ThresholdProgress } from '../components/ui/progress';
import { Trash2, Plus, Wallet2 } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { cn } from '../lib/utils';
import PageHeader from '../components/PageHeader';

const BudgetsPage = () => {
    const { budgets, addBudget, updateBudget, deleteBudget, transactions, categories, isPrivacyMode } = useFinancial();
    const [newCategory, setNewCategory] = useState('');
    const [newLimit, setNewLimit] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    const budgetedCategories = new Set(budgets.map(b => b.category));
    const availableCategories = categories.filter(c => !budgetedCategories.has(c));

    const now = new Date();
    const spentByCategory = transactions.reduce((acc, t) => {
        if (t.type !== 'expense') return acc;
        const d = new Date(t.date);
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return acc;
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(0)}`;
    };

    const handleAdd = (e) => {
        e.preventDefault();
        const limit = parseFloat(newLimit);
        if (!newCategory || !limit || limit <= 0) return;
        addBudget({ category: newCategory, monthlyLimit: limit });
        setNewCategory('');
        setNewLimit('');
    };

    const startEditing = (budget) => {
        setEditingId(budget.id);
        setEditingValue(String(budget.monthlyLimit));
    };

    const saveEditing = (budget) => {
        const limit = parseFloat(editingValue);
        if (limit > 0) {
            updateBudget(budget.id, { category: budget.category, monthlyLimit: limit });
        }
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Budgets" subtitle="Set a monthly limit per category and track actual spend against it." />

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Add a Budget</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
                        <Select value={newCategory} onValueChange={setNewCategory} className="sm:w-56">
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCategories.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Monthly limit (₹)"
                            value={newLimit}
                            onChange={(e) => setNewLimit(e.target.value)}
                            className="sm:w-48"
                        />
                        <Button type="submit" disabled={!newCategory || !newLimit}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Budget
                        </Button>
                    </form>
                    {availableCategories.length === 0 && budgets.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">Every category already has a budget.</p>
                    )}
                </CardContent>
            </Card>

            {budgets.length === 0 ? (
                <EmptyState
                    icon={Wallet2}
                    title="No budgets set yet"
                    description="Pick a category above and set a monthly limit to start tracking budget-vs-actual."
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {budgets.map((budget) => {
                        const spent = spentByCategory[budget.category] || 0;
                        const pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
                        const isEditing = editingId === budget.id;

                        return (
                            <Card key={budget.id} className="shadow-sm">
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground">{budget.category}</span>
                                        <div className="flex items-center gap-2">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    autoFocus
                                                    value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    onBlur={() => saveEditing(budget)}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveEditing(budget)}
                                                    className="h-8 w-24 text-right"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(budget)}
                                                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                                    title="Click to edit limit"
                                                >
                                                    of {formatCurrency(budget.monthlyLimit)}
                                                </button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => deleteBudget(budget.id)}
                                                title="Delete budget"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <ThresholdProgress value={pct} />

                                    <div className="flex items-center justify-between text-xs">
                                        <span className={cn('tabular-nums', pct >= 100 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                                            {formatCurrency(spent)} spent this month
                                        </span>
                                        <span className="text-muted-foreground">{Math.round(pct)}%</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BudgetsPage;
