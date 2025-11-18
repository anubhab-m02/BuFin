import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import EmptyState from './EmptyState';

const DebtTracker = () => {
    const { debts, isPrivacyMode } = useFinancial();

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    const activeDebts = debts.filter(d => d.status === 'active');

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Debt & IOUs</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activeDebts.length === 0 ? (
                        <EmptyState
                            title="No active debts"
                            description="Track who owes you and who you owe."
                            icon={ArrowUpRight}
                        />
                    ) : (
                        activeDebts.map(debt => (
                            <div key={debt.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${debt.direction === 'receivable' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {debt.direction === 'receivable' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{debt.personName}</p>
                                        <p className="text-xs text-muted-foreground">Due: {debt.dueDate || 'No date'}</p>
                                    </div>
                                </div>
                                <div className={`font-bold ${debt.direction === 'receivable' ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(debt.amount)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default DebtTracker;
