import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Trophy, Medal, Star, Target, TrendingUp, ShieldCheck, PiggyBank, Award } from 'lucide-react';
import { cn } from '../lib/utils';

const Achievements = () => {
    const { transactions, savingsGoals, debts, recurringPlans, balance } = useFinancial();

    const achievementsList = [
        {
            id: 'first_step',
            title: 'First Steps',
            description: 'Added your first transaction',
            icon: Star,
            condition: () => transactions.length > 0,
            color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20'
        },
        {
            id: 'saver',
            title: 'Future Focused',
            description: 'Created a savings goal',
            icon: PiggyBank,
            condition: () => savingsGoals.length > 0,
            color: 'text-green-500 bg-green-100 dark:bg-green-900/20'
        },
        {
            id: 'planner',
            title: 'Master Planner',
            description: 'Set up a recurring plan',
            icon: Target,
            condition: () => recurringPlans.length > 0,
            color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/20'
        },
        {
            id: 'debt_free',
            title: 'Debt Destroyer',
            description: 'No active debts',
            icon: ShieldCheck,
            condition: () => debts.length > 0 && debts.every(d => d.status === 'repaid'),
            color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/20'
        },
        {
            id: 'big_saver',
            title: 'Big Saver',
            description: 'Saved over 10,000',
            icon: TrendingUp,
            condition: () => savingsGoals.reduce((acc, g) => acc + g.currentAmount, 0) > 10000,
            color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/20'
        },
        {
            id: 'consistent',
            title: 'Consistent Tracker',
            description: 'Logged 50+ transactions',
            icon: Award,
            condition: () => transactions.length >= 50,
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
                    {locked.map(achievement => (
                        <div key={achievement.id} className="flex items-start gap-3 p-3 rounded-lg border border-dashed bg-muted/30 opacity-60 grayscale">
                            <div className="p-2 rounded-full bg-muted shrink-0">
                                <achievement.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">{achievement.title}</h4>
                                <p className="text-xs text-muted-foreground">{achievement.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default Achievements;
