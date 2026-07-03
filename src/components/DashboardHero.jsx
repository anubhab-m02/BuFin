import React from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import SafeToSpendGauge from './SafeToSpendGauge';
import { useSafeToSpend } from '../hooks/useSafeToSpend';
import { useSpendingAlert } from '../hooks/useSpendingAlert';
import { useFinancial } from '../context/FinancialContext';
import { formatMoney } from '../lib/money';
import { cn } from '../lib/utils';

// The Dashboard's hero zone: "am I okay?" answered in one glance. The gauge shows how much
// of today's safe-spend budget is used; the status pill carries the coach's read on it
// (replacing the old separate "Live Insight" card, which read like a stray quoted string).
const DashboardHero = () => {
    const { isPrivacyMode, isDataLoading } = useFinancial();
    const { dailySafeSpend, daysRemaining, usagePct, spentToday, remainingToday, overAmountToday, isOverToday } = useSafeToSpend();
    const { alert, loading: alertLoading } = useSpendingAlert();

    const formatCurrency = (amount) => (isPrivacyMode ? '••••••' : formatMoney(amount));

    const statusTone = usagePct >= 100
        ? 'bg-destructive/10 text-destructive'
        : usagePct >= 80
            ? 'bg-warning/10 text-warning'
            : 'bg-success/10 text-success';

    if (isDataLoading) {
        return (
            <Card className="bg-surface-hero border-0 p-8">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-40 w-56 rounded-full" />
                    <Skeleton className="h-10 w-40" />
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-surface-hero border-0 p-6 md:p-8">
            <div className="flex flex-col items-center text-center gap-3">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {isOverToday ? "Over today's limit" : 'Safe to spend today'}
                </span>

                <SafeToSpendGauge pct={usagePct} />

                <div className={cn('text-5xl font-bold tabular-nums -mt-4', isOverToday && 'text-destructive')}>
                    {isOverToday ? `-${formatCurrency(overAmountToday)}` : formatCurrency(remainingToday)}
                </div>
                <p className="text-xs text-muted-foreground">
                    {daysRemaining} days left this month {spentToday > 0 && `• ${formatCurrency(spentToday)} spent today of ${formatCurrency(dailySafeSpend)} limit`}
                </p>

                <div className={cn('flex items-start gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium mt-2 max-w-md text-left', statusTone)}>
                    {alertLoading ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin mt-0.5" />
                            <span>Checking today's spending...</span>
                        </>
                    ) : alert ? (
                        <>
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{alert}</span>
                        </>
                    ) : isOverToday ? (
                        <>
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>You're {formatCurrency(overAmountToday)} over today's safe limit.</span>
                        </>
                    ) : spentToday > 0 ? (
                        <>
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{formatCurrency(spentToday)} spent today, within your {formatCurrency(dailySafeSpend)} limit.</span>
                        </>
                    ) : (
                        <>
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>No spending logged yet today - you're on track.</span>
                        </>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default DashboardHero;
