import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowUpRight, ArrowDownLeft, Trash2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import EmptyState from './EmptyState';

const DebtTracker = ({ compact }) => {
    const { debts, isPrivacyMode, deleteDebt, repayDebt } = useFinancial();

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    const activeDebts = debts.filter(d => d.status === 'active');

    const content = (
        <div className="space-y-4">
            {activeDebts.length === 0 ? (
                <EmptyState
                    title="No active debts"
                    description="Track who owes you and who you owe."
                    icon={ArrowUpRight}
                />
            ) : (
                activeDebts.map(debt => (
                    <div key={debt.id} className="flex items-center justify-between border-b pb-2 last:border-0 group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${debt.direction === 'receivable' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {debt.direction === 'receivable' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div>
                                <p className="font-medium text-sm">{debt.personName}</p>
                                <p className="text-xs text-muted-foreground">Due: {debt.dueDate || 'No date'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`font-bold whitespace-nowrap ${debt.direction === 'receivable' ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(debt.amount)}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {debt.status !== 'repaid' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-7 w-7 ${debt.direction === 'receivable' ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                                        title={debt.direction === 'receivable' ? "Mark as Received" : "Mark as Repaid"}
                                        onClick={() => repayDebt(debt.id)}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                    onClick={() => deleteDebt(debt.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    if (compact) return content;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Debt & IOUs</CardTitle>
            </CardHeader>
            <CardContent>
                {content}
            </CardContent>
        </Card>
    );
};

export default DebtTracker;
