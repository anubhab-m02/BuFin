import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress'; // We'll need to create this or use a simple div

// Simple Progress Component since we don't have one yet
const SimpleProgress = ({ value, className, indicatorClassName }) => (
    <div className={`h-4 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
        <div
            className={`h-full flex-1 bg-primary transition-all ${indicatorClassName}`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
);

const BudgetHealthBar = () => {
    const { income, expense, transactions } = useFinancial();

    // In a real app, we'd use AI or user tags to classify Needs/Wants.
    // For MVP, let's assume:
    // Needs: Rent, Groceries, Bills, EMI, Transport
    // Wants: Food, Entertainment, Shopping, Travel
    // Savings: (Income - Expense)

    const needsKeywords = ['rent', 'grocery', 'groceries', 'bill', 'emi', 'transport', 'fuel', 'medical', 'utility'];

    const needs = transactions
        .filter(t => t.type === 'expense' && needsKeywords.some(k => t.category.toLowerCase().includes(k)))
        .reduce((acc, t) => acc + t.amount, 0);

    const wants = expense - needs;
    const savings = Math.max(0, income - expense);

    // Avoid division by zero
    const total = income || 1;

    const needsPct = (needs / total) * 100;
    const wantsPct = (wants / total) * 100;
    const savingsPct = (savings / total) * 100;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Budget Health (50/30/20 Rule)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                            className="h-full bg-blue-500"
                            style={{ width: `${needsPct}%` }}
                            title={`Needs: ${needsPct.toFixed(1)}%`}
                        />
                        <div
                            className={`h-full ${wantsPct > 30 ? 'bg-red-500' : 'bg-yellow-500'}`}
                            style={{ width: `${wantsPct}%` }}
                            title={`Wants: ${wantsPct.toFixed(1)}%`}
                        />
                        <div
                            className="h-full bg-green-500"
                            style={{ width: `${savingsPct}%` }}
                            title={`Savings: ${savingsPct.toFixed(1)}%`}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>Needs ({needsPct.toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${wantsPct > 30 ? 'bg-red-500' : 'bg-yellow-500'}`} />
                            <span>Wants ({wantsPct.toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span>Savings ({savingsPct.toFixed(0)}%)</span>
                        </div>
                    </div>

                    {wantsPct > 30 && (
                        <p className="text-xs text-red-500 font-medium">
                            Warning: Your "Wants" exceed 30% of your income!
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default BudgetHealthBar;
