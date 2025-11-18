import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CalendarClock } from 'lucide-react';

const RecurringManager = () => {
    const { recurringPlans, isPrivacyMode } = useFinancial();

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Recurring Commitments</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recurringPlans.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No recurring plans set.</p>
                    ) : (
                        recurringPlans.map(plan => (
                            <div key={plan.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-secondary text-secondary-foreground">
                                        <CalendarClock className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{plan.name}</p>
                                        <p className="text-xs text-muted-foreground">Day {plan.expectedDate} of month</p>
                                    </div>
                                </div>
                                <div className={`font-bold ${plan.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {plan.type === 'income' ? '+' : '-'}{formatCurrency(plan.amount)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default RecurringManager;
