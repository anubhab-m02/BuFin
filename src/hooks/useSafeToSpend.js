import { useFinancial } from '../context/FinancialContext';
import { resolveExpectedDay } from '../lib/utils';

// Single source of truth for the safe-to-spend calculation, extracted from the old
// SafeToSpendWidget so the Dashboard hero gauge and anything else that needs this number
// don't each reimplement it and risk diverging (see bug #3 in the plan history).
export function useSafeToSpend() {
    const { balance, recurringPlans, debts, transactions } = useFinancial();

    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysRemaining = Math.max(1, lastDay.getDate() - today.getDate() + 1);

    const isFutureThisMonth = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        return d.getDate() > now.getDate();
    };

    const upcomingRecurringFixed = recurringPlans
        .filter(p => {
            if (p.type !== 'expense') return false;
            const expectedDay = resolveExpectedDay(p.expectedDate, today.getFullYear(), today.getMonth());
            if (p.endDate) {
                const end = new Date(p.endDate);
                const current = new Date(today.getFullYear(), today.getMonth(), expectedDay);
                if (current > end) return false;
            }
            return expectedDay >= today.getDate();
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    const upcomingOneOffExpense = transactions
        .filter(t => t.type === 'expense' && isFutureThisMonth(t.date))
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalUpcomingExpenses = upcomingRecurringFixed + upcomingOneOffExpense;

    const upcomingRecurringIncome = recurringPlans
        .filter(p => {
            if (p.type !== 'income') return false;
            const expectedDay = resolveExpectedDay(p.expectedDate, today.getFullYear(), today.getMonth());
            if (p.endDate) {
                const end = new Date(p.endDate);
                const current = new Date(today.getFullYear(), today.getMonth(), expectedDay);
                if (current > end) return false;
            }
            return expectedDay >= today.getDate();
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    const upcomingOneOffIncome = transactions
        .filter(t => t.type === 'income' && isFutureThisMonth(t.date))
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalUpcomingIncome = upcomingRecurringIncome + upcomingOneOffIncome;

    const debtPayable = debts
        .filter(d => {
            if (d.direction !== 'payable' || d.status !== 'active') return false;
            if (!d.dueDate) return true;
            const due = new Date(d.dueDate);
            return due <= lastDay;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    const projectedEndMonth = balance + totalUpcomingIncome - totalUpcomingExpenses - debtPayable;
    const conservativeSafeBalance = balance - totalUpcomingExpenses - debtPayable;
    const dailySafeSpend = Math.max(0, conservativeSafeBalance / daysRemaining);

    // Today's spend, for the gauge - how much of today's safe daily budget is already used.
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const spentToday = transactions
        .filter(t => t.type === 'expense' && (t.date || '').startsWith(todayStr))
        .reduce((acc, t) => acc + t.amount, 0);

    const usagePct = dailySafeSpend > 0 ? (spentToday / dailySafeSpend) * 100 : (spentToday > 0 ? 100 : 0);

    return {
        daysRemaining,
        totalUpcomingExpenses,
        totalUpcomingIncome,
        debtPayable,
        projectedEndMonth,
        conservativeSafeBalance,
        dailySafeSpend,
        spentToday,
        usagePct,
    };
}
