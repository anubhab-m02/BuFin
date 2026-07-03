import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { TransactionFeedItem } from './FeedItem';
import EmptyState from './EmptyState';
import { useFinancial } from '../context/FinancialContext';
import { Wallet } from 'lucide-react';

const dayLabel = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a, b) => a.toDateString() === b.toDateString();
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

// Day-grouped recent activity for the Dashboard - the base layout future notification and
// agentic-action items (Phase 7/9) will slot into, using the same day-grouping shell.
const ActivityFeed = () => {
    const { transactions, deleteTransaction, isDataLoading } = useFinancial();
    const navigate = useNavigate();

    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const recent = transactions
        .filter(t => (t.date || '').split('T')[0] <= todayStr)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8);

    const groups = recent.reduce((acc, t) => {
        const key = dayLabel(t.date);
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
    }, {});

    return (
        <Card className="h-[420px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate('/ledger')}>
                    View All
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
                {isDataLoading ? (
                    [0, 1, 2].map(i => (
                        <div key={i} className="py-2.5 flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3.5 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))
                ) : recent.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        title="No activity yet"
                        description="Log your first transaction above to see it here."
                    />
                ) : (
                    Object.entries(groups).map(([label, items]) => (
                        <div key={label} className="py-1 first:pt-0 last:pb-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">{label}</p>
                            <div className="divide-y divide-border/60">
                                {items.map(t => (
                                    <TransactionFeedItem key={t.id} transaction={t} onDelete={() => deleteTransaction(t.id)} />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
};

export default ActivityFeed;
