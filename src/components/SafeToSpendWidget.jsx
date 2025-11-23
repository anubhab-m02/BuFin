import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calculator } from 'lucide-react';

const SafeToSpendWidget = () => {
    const { balance, recurringPlans, debts, isPrivacyMode, togglePrivacyMode, transactions } = useFinancial();

    // Calculate days remaining in month
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysRemaining = Math.max(1, lastDay.getDate() - today.getDate());

    // Helper to check if a date is in the current month and in the future
    const isFutureThisMonth = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        // Check if same month and year
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        // Check if future
        return d.getDate() > now.getDate();
    };

    // 1. Recurring Fixed Costs (Predictive)
    const upcomingRecurringFixed = recurringPlans
        .filter(p => {
            if (p.type !== 'expense') return false;

            let expectedDay = parseInt(p.expectedDate);
            if (p.expectedDate === 'last') expectedDay = lastDay.getDate();
            else if (p.expectedDate === 'last-working') {
                let d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
                expectedDay = d.getDate();
            }

            if (p.endDate) {
                const end = new Date(p.endDate);
                const current = new Date(today.getFullYear(), today.getMonth(), expectedDay);
                if (current > end) return false;
            }

            return expectedDay > today.getDate();
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    // 2. One-off Future Expenses (from Ledger/Planner)
    const upcomingOneOffExpense = transactions
        .filter(t => t.type === 'expense' && isFutureThisMonth(t.date))
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalUpcomingExpenses = upcomingRecurringFixed + upcomingOneOffExpense;

    // 3. Recurring Income (Predictive)
    const upcomingRecurringIncome = recurringPlans
        .filter(p => {
            if (p.type !== 'income') return false;

            let expectedDay = parseInt(p.expectedDate);
            if (p.expectedDate === 'last') expectedDay = lastDay.getDate();
            else if (p.expectedDate === 'last-working') {
                let d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
                expectedDay = d.getDate();
            }

            if (p.endDate) {
                const end = new Date(p.endDate);
                const current = new Date(today.getFullYear(), today.getMonth(), expectedDay);
                if (current > end) return false;
            }

            return expectedDay > today.getDate();
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    // 4. One-off Future Income (from Ledger/Planner)
    const upcomingOneOffIncome = transactions
        .filter(t => t.type === 'income' && isFutureThisMonth(t.date))
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalUpcomingIncome = upcomingRecurringIncome + upcomingOneOffIncome;

    // Calculate debt obligations (payable)
    const debtPayable = debts
        .filter(d => d.direction === 'payable' && d.status === 'active')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Predictive Safe Balance (Optimistic - includes future income)
    const projectedEndMonth = balance + totalUpcomingIncome - totalUpcomingExpenses - debtPayable;

    // Conservative Safe Balance (Cash Basis - only what you have NOW minus bills)
    // We do NOT include future income for the daily limit to prevent overspending before money arrives.
    const conservativeSafeBalance = balance - totalUpcomingExpenses - debtPayable;

    // Safe Daily = Conservative Balance / Days Remaining
    const dailySafeSpend = Math.max(0, conservativeSafeBalance / daysRemaining);

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
                        <p className="font-semibold text-foreground">{formatCurrency(projectedEndMonth)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Upcoming Bills</p>
                        <p className="font-semibold text-red-500">-{formatCurrency(totalUpcomingExpenses)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SafeToSpendWidget;
