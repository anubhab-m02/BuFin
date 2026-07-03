import React from 'react';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { useSafeToSpend } from '../hooks/useSafeToSpend';
import { useFinancial } from '../context/FinancialContext';
import { formatMoney } from '../lib/money';

const MonthProjectionCard = () => {
    const { isPrivacyMode, isDataLoading } = useFinancial();
    const { projectedEndMonth, totalUpcomingExpenses } = useSafeToSpend();

    const formatCurrency = (amount) => (isPrivacyMode ? '••••••' : formatMoney(amount));

    if (isDataLoading) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <Skeleton className="h-3 w-24" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-28" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    Month Projection
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold tabular-nums ${projectedEndMonth < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {formatCurrency(projectedEndMonth)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Projected balance by month end, after {formatCurrency(totalUpcomingExpenses)} in upcoming bills
                </p>
            </CardContent>
        </Card>
    );
};

export default MonthProjectionCard;
