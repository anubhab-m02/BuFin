import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calculator } from 'lucide-react';

const SafeToSpendWidget = () => {
    const { balance, recurringPlans, debts, isPrivacyMode, togglePrivacyMode } = useFinancial();

    // Calculate days remaining in month
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysRemaining = Math.max(1, lastDay.getDate() - today.getDate());

    // Calculate upcoming fixed costs (simple MVP logic: sum of all fixed plans)
    // In a real app, we'd check if they are already paid this month.
    const upcomingFixed = recurringPlans
        .filter(p => p.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate debt obligations (payable)
    const debtPayable = debts
        .filter(d => d.direction === 'payable' && d.status === 'active')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const safeBalance = balance - upcomingFixed - debtPayable;
    const dailySafeSpend = safeBalance / daysRemaining;

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    return (
        <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Safe-to-Spend (Daily)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold text-primary">
                    {formatCurrency(dailySafeSpend)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {daysRemaining} days left • Adjusted for bills & debt
                </p>

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <p className="text-muted-foreground">True Balance</p>
                        <p className="font-semibold text-foreground">{formatCurrency(balance)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Committed</p>
                        <p className="font-semibold text-foreground">{formatCurrency(upcomingFixed + debtPayable)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SafeToSpendWidget;
