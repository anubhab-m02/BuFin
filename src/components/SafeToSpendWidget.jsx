import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calculator, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';

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
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Safe-to-Spend (Daily)
                </CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-700 hover:bg-blue-100"
                    onClick={togglePrivacyMode}
                >
                    {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold text-blue-700">
                    {formatCurrency(dailySafeSpend)}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                    {daysRemaining} days left • Adjusted for bills & debt
                </p>

                <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <p className="text-blue-500">True Balance</p>
                        <p className="font-semibold text-blue-900">{formatCurrency(balance)}</p>
                    </div>
                    <div>
                        <p className="text-blue-500">Committed</p>
                        <p className="font-semibold text-blue-900">{formatCurrency(upcomingFixed + debtPayable)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SafeToSpendWidget;
