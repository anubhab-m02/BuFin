import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Trophy, Medal, Star, Target, TrendingUp, ShieldCheck, PiggyBank, Award } from 'lucide-react';
import { cn } from '../lib/utils';

const Achievements = () => {
    const { transactions, savingsGoals, debts, recurringPlans, balance } = useFinancial();

    // Shared derived values so condition/progress pairs below don't each recompute them.
    const savingsDeposits = transactions.filter(t => t.category === 'Savings' && t.type === 'expense');
    const savingsTotal = savingsDeposits.reduce((acc, t) => acc + t.amount, 0);
    const savingsDistinctDays = new Set(savingsDeposits.map(t => (t.date || '').slice(0, 10))).size;
    const trackedDistinctDays = new Set(transactions.map(t => (t.date || '').slice(0, 10))).size;
    const repaidDebtsCount = debts.filter(d => d.status === 'repaid').length;

    const achievementsList = [
        {
            id: 'first_step',
            title: 'First Steps',
            description: 'Added your first transaction',
            icon: Star,
            condition: () => transactions.length > 0,
            progress: () => transactions.length > 0 ? 100 : 0,
            color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20'
        },
        {
            id: 'saver',
            title: 'Future Focused',
            description: 'Created a savings goal',
            icon: PiggyBank,
            condition: () => savingsGoals.length > 0,
            progress: () => savingsGoals.length > 0 ? 100 : 0,
            color: 'text-green-500 bg-green-100 dark:bg-green-900/20'
        },
        {
            id: 'planner',
            title: 'Master Planner',
            description: 'Set up a recurring plan',
            icon: Target,
            condition: () => recurringPlans.length > 0,
            progress: () => recurringPlans.length > 0 ? 100 : 0,
            color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/20'
        },
        {
            id: 'debt_free',
            title: 'Debt Destroyer',
            description: 'No active debts',
            icon: ShieldCheck,
            condition: () => debts.length > 0 && debts.every(d => d.status === 'repaid'),
            progress: () => debts.length === 0 ? 0 : Math.min(100, (repaidDebtsCount / debts.length) * 100),
            progressLabel: () => debts.length === 0 ? null : `${repaidDebtsCount}/${debts.length} debts repaid`,
            color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/20'
        },
        {
            id: 'big_saver',
            title: 'Big Saver',
            description: 'Saved over 10,000 across multiple deposits',
            icon: TrendingUp,
            // Require the total to be built up from several separate deposits, not a single
            // instant lump-sum transfer that would unlock this the moment a goal is created.
            condition: () => savingsTotal > 10000 && savingsDistinctDays >= 3,
            progress: () => Math.min(100, (savingsTotal / 10000) * 100),
            progressLabel: () => `${Math.round(savingsTotal).toLocaleString()}/10,000 saved`,
            color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/20'
        },
        {
            id: 'consistent',
            title: 'Consistent Tracker',
            description: 'Logged transactions on 30+ different days',
            icon: Award,
            // Count distinct days, not raw transaction count, so this can't be unlocked by
            // bulk-creating many transactions in a single sitting.
            condition: () => trackedDistinctDays >= 30,
            progress: () => Math.min(100, (trackedDistinctDays / 30) * 100),
            progressLabel: () => `${trackedDistinctDays}/30 days`,
            color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/20'
        }
    ];

    const unlocked = achievementsList.filter(a => a.condition());
    const locked = achievementsList.filter(a => !a.condition());

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Achievements
                </CardTitle>
                <CardDescription>
                    You've unlocked {unlocked.length} out of {achievementsList.length} milestones!
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unlocked.map(achievement => (
                        <div key={achievement.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                            <div className={cn("p-2 rounded-full shrink-0", achievement.color)}>
                                <achievement.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">{achievement.title}</h4>
                                <p className="text-xs text-muted-foreground">{achievement.description}</p>
                            </div>
                        </div>
                    ))}
                    {locked.map(achievement => {
                        const pct = Math.round(achievement.progress());
                        const label = achievement.progressLabel ? achievement.progressLabel() : null;
                        return (
                            <div key={achievement.id} className="flex items-start gap-3 p-3 rounded-lg border border-dashed bg-muted/30 opacity-60 grayscale">
                                <div className="p-2 rounded-full bg-muted shrink-0">
                                    <achievement.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm">{achievement.title}</h4>
                                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                                    <Progress value={pct} className="h-1.5 mt-2" />
                                    <div className="flex items-center justify-between mt-1">
                                        {label && <span className="text-[11px] text-muted-foreground">{label}</span>}
                                        <span className="text-[11px] text-muted-foreground ml-auto">{pct}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default Achievements;
