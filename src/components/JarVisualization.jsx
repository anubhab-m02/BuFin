import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PiggyBank, Plane, Laptop, Home, Car, GraduationCap, Heart, Star, Plus, Minus, Trophy, TrendingUp, Trash2, Pencil } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { cn, parseLocalDate } from '../lib/utils';

const ICONS = {
    PiggyBank, Travel: Plane, Tech: Laptop, Home, Car, Education: GraduationCap, Health: Heart, Other: Star, Investment: TrendingUp
};

const JarVisualization = ({ goal, onEdit }) => {
    const { updateSavingsGoal, deleteSavingsGoal, isPrivacyMode } = useFinancial();
    const mask = '••••••';
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [memberNames, setMemberNames] = useState({});
    const Icon = ICONS[goal.icon] || Star;

    // Additive-only: personal goals (household_id null) never hit this path at all.
    // Contributions come back from the API as {user_id, amount}; names are resolved
    // separately here since GoalContributionResponse doesn't carry them.
    useEffect(() => {
        if (!goal.household_id) return;
        api.getHouseholdMembers(goal.household_id)
            .then((members) => {
                const map = {};
                members.forEach((m) => { map[m.user_id] = m.full_name; });
                setMemberNames(map);
            })
            .catch(() => {});
    }, [goal.household_id]);

    const contributionsByMember = (goal.contributions || []).reduce((acc, c) => {
        acc[c.user_id] = (acc[c.user_id] || 0) + c.amount;
        return acc;
    }, {});
    const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
    const isCompleted = progress >= 100;

    // Calculate Daily Savings Needed
    const getDailySavings = () => {
        if (!goal.targetDate || isCompleted) return null;
        const daysLeft = differenceInDays(parseLocalDate(goal.targetDate), new Date());
        if (daysLeft <= 0) return null;
        const remaining = goal.targetAmount - goal.currentAmount;
        return Math.ceil(remaining / daysLeft);
    };

    const dailySavings = getDailySavings();
    const timeLeft = goal.targetDate ? formatDistanceToNow(parseLocalDate(goal.targetDate), { addSuffix: true }) : '';

    // Investment Projection (Simple Compound Interest for visual flair)
    const getProjectedValue = () => {
        if (goal.type !== 'investment' || !goal.projectedReturnRate) return null;
        // Simplified: Current Amount * (1 + rate)^1 year (just for show)
        const rate = goal.projectedReturnRate / 100;
        return goal.currentAmount * (1 + rate);
    };
    const projectedValue = getProjectedValue();

    const handleDeposit = () => {
        if (!amount || parseFloat(amount) <= 0) return;
        updateSavingsGoal(goal.id, parseFloat(amount));
        setAmount('');
    };

    const handleWithdraw = () => {
        if (!amount || parseFloat(amount) <= 0) return;
        updateSavingsGoal(goal.id, -parseFloat(amount));
        setAmount('');
    };

    return (
        <Card className={cn(
            "relative overflow-hidden transition-colors duration-normal",
            isCompleted ? "border-success" : "hover:border-foreground/30"
        )}>


            <CardContent className="p-0 h-full flex flex-col">
                <div className="flex flex-1 p-5 gap-4">
                    {/* Vertical Liquid Progress */}
                    <div className="relative w-16 bg-secondary/50 rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
                        <div
                            className={cn(
                                "absolute bottom-0 left-0 right-0 transition-all duration-slow ease-out",
                                isCompleted ? "bg-success" : "bg-data"
                            )}
                            style={{ height: `${progress}%` }}
                        />

                        {/* Percentage Label */}
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                            {progress.toFixed(0)}%
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg leading-tight mb-1 flex items-center gap-2">
                                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        {goal.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground ml-6">
                                        {goal.type === 'investment' ? 'Investment' : 'Savings Goal'}
                                    </p>
                                </div>
                                <div className="flex items-start gap-2 relative z-10">
                                    {isCompleted && (
                                        <div className="text-success">
                                            <Trophy className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                            onClick={onEdit}
                                            title="Edit Goal"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => deleteSavingsGoal(goal.id)}
                                            title="Delete Goal"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <div className="flex items-baseline gap-1 tabular-nums">
                                    <span className="text-2xl font-bold">{isPrivacyMode ? mask : `₹${goal.currentAmount.toLocaleString()}`}</span>
                                    <span className="text-xs text-muted-foreground">/ {isPrivacyMode ? mask : `₹${goal.targetAmount.toLocaleString()}`}</span>
                                </div>

                                {isCompleted ? (
                                    <p className="text-sm font-medium text-success flex items-center gap-1">
                                        Goal reached
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {goal.targetDate && (
                                            <p className="text-xs text-muted-foreground">
                                                Target: {timeLeft}
                                            </p>
                                        )}
                                        {dailySavings > 0 && (
                                            <p className="text-xs font-medium text-foreground">
                                                Save {isPrivacyMode ? mask : `₹${dailySavings}`}/day to stay on track
                                            </p>
                                        )}
                                    </div>
                                )}

                                {goal.type === 'investment' && projectedValue && (
                                    <p className="text-xs text-success mt-1 font-medium tabular-nums">
                                        Est. value: {isPrivacyMode ? mask : `₹${projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                    </p>
                                )}
                            </div>

                            {goal.household_id && Object.keys(contributionsByMember).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border/40">
                                    <p className="text-xs text-muted-foreground mb-1.5">
                                        Contributions
                                    </p>
                                    <div className="space-y-1">
                                        {Object.entries(contributionsByMember).map(([userId, total]) => (
                                            <div key={userId} className="flex items-center justify-between text-xs">
                                                <span className="text-foreground/80 truncate">
                                                    {memberNames[userId] || 'Member'}{userId === user?.id ? ' (You)' : ''}
                                                </span>
                                                <span className={cn('tabular-nums font-medium', total < 0 ? 'text-destructive' : 'text-foreground')}>
                                                    {isPrivacyMode ? mask : `${total >= 0 ? '+' : ''}₹${total.toLocaleString()}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="bg-secondary/60 p-3 flex gap-2 border-t border-border">
                    <Input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-8 text-sm w-24 bg-background"
                    />
                    <div className="flex-1 flex gap-2">
                        <Button
                            size="sm"
                            className="flex-1 h-8"
                            onClick={handleDeposit}
                            disabled={!amount}
                        >
                            <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={handleWithdraw}
                            disabled={!amount}
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default JarVisualization;
