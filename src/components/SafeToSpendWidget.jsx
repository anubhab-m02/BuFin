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

    // Calculate upcoming fixed costs (Predictive)
    // We want to know what is *left* to pay this month.
    // If today is 15th, and Rent (1st) is paid, don't count it.
    // If Netflix (20th) is coming, count it.
    const upcomingFixed = recurringPlans
        .filter(p => {
            if (p.type !== 'expense') return false;

            let expectedDay = parseInt(p.expectedDate);
            if (p.expectedDate === 'last') expectedDay = lastDay.getDate();
            else if (p.expectedDate === 'last-working') {
                let d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
                expectedDay = d.getDate();
            }

            // Check End Date
            if (p.endDate) {
                const end = new Date(p.endDate);
                const current = new Date(today.getFullYear(), today.getMonth(), expectedDay);
                if (current > end) return false;
            }

            // Only count if the expected day is AFTER today
            return expectedDay > today.getDate();
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Also consider expected INCOME for the rest of the month?
    // "The balance should reflect the Current Day balance + Expected Income - Expected Expenses"
    const upcomingIncome = recurringPlans
        .filter(p => {
            if (p.type !== 'income') return false;

            let expectedDay = parseInt(p.expectedDate);
            if (p.expectedDate === 'last') expectedDay = lastDay.getDate();
            else if (p.expectedDate === 'last-working') {
                let d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
                expectedDay = d.getDate();
            }

            // Check End Date
            if (p.endDate) {
                const end = new Date(p.endDate);
                const current = new Date(today.getFullYear(), today.getMonth(), expectedDay);
                if (current > end) return false;
            }

            return expectedDay > today.getDate();
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate debt obligations (payable) - Assuming immediate/overdue or this month?
    // Let's keep it simple: Active debts are "liabilities" that *could* be called in.
    const debtPayable = debts
        .filter(d => d.direction === 'payable' && d.status === 'active')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Predictive Safe Balance
    // Current Balance + Future Income - Future Bills - Debts
    const projectedBalance = balance + upcomingIncome - upcomingFixed - debtPayable;

    // Safe Daily = Projected / Days Remaining
    // If projected is negative, safe is 0.
    const dailySafeSpend = Math.max(0, projectedBalance / daysRemaining);

    const formatCurrency = (amount) => {
        if (isPrivacyMode) return '••••••';
        return `₹${amount.toFixed(2)}`;
    };

    return (
        <Card className="bg-card border-border shadow-sm h-full">
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
                        <p className="text-muted-foreground">Projected End-Month</p>
                        <p className="font-semibold text-foreground">{formatCurrency(projectedBalance + debtPayable)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Upcoming Bills</p>
                        <p className="font-semibold text-red-500">-{formatCurrency(upcomingFixed)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SafeToSpendWidget;
