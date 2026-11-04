import React from 'react';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { useSafeToSpend } from '../hooks/useSafeToSpend';
import { useSpendingAlert } from '../hooks/useSpendingAlert';
import { useFinancial } from '../context/FinancialContext';
import { formatMoney } from '../lib/money';
import { cn } from '../lib/utils';

// The Dashboard's hero zone: "am I okay?" answered in one glance. The headline figure is what
// is left to spend today; the bar beside it shows how much of today's limit is used, and one
// line of text carries the coach's read on it.
const DashboardHero = () => {
    const { isPrivacyMode, isDataLoading } = useFinancial();
    const { dailySafeSpend, daysRemaining, usagePct, spentToday, remainingToday, overAmountToday, isOverToday } = useSafeToSpend();
    const { alert, loading: alertLoading } = useSpendingAlert();

    const formatCurrency = (amount) => (isPrivacyMode ? '••••••' : formatMoney(amount));
    // The coach's sentence is free text that may quote amounts; mask them in Privacy Mode too.
    const safeAlert = alert && isPrivacyMode ? alert.replace(/₹\s?[\d,]+(\.\d+)?/g, '••••••') : alert;

    const barPct = Math.min(100, Math.max(0, usagePct));

    const statusLine = alertLoading
        ? "Checking today's spending..."
        : safeAlert
            ? safeAlert
            : isOverToday
                ? `You're ${formatCurrency(overAmountToday)} over today's safe limit.`
                : spentToday > 0
                    ? `${formatCurrency(spentToday)} spent today, within your ${formatCurrency(dailySafeSpend)} limit.`
                    : "No spending logged yet today - you're on track.";

    if (isDataLoading) {
        return (
            <Card className="p-6 md:p-8">
                <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,28rem)] md:items-end">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-12 w-48" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,28rem)] md:items-end">
                <div>
                    <p className="text-sm text-muted-foreground">
                        {isOverToday ? "Over today's limit" : 'Safe to spend today'}
                    </p>
                    <div className={cn('mt-2 text-5xl font-bold tabular-nums tracking-tight', isOverToday && 'text-destructive')}>
                        {isOverToday ? `-${formatCurrency(overAmountToday)}` : formatCurrency(remainingToday)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{daysRemaining} days left this month</p>
                </div>

                <div>
                    <div className="flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">Spent today</span>
                        <span className="tabular-nums">
                            <span className="font-medium">{formatCurrency(spentToday)}</span>
                            <span className="text-muted-foreground"> of {formatCurrency(dailySafeSpend)}</span>
                        </span>
                    </div>
                    <div
                        className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(barPct)}
                        aria-label="Share of today's safe limit spent"
                    >
                        <div className={cn('h-full rounded-full', isOverToday ? 'bg-destructive' : 'bg-data')} style={{ width: `${barPct}%` }} />
                    </div>
                    <p className={cn('mt-3 text-sm', isOverToday ? 'text-destructive' : 'text-muted-foreground')}>{statusLine}</p>
                </div>
            </div>
        </Card>
    );
};

export default DashboardHero;
