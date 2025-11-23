import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PiggyBank, Plane, Laptop, Home, Car, GraduationCap, Heart, Star, Plus, Minus, Trophy, TrendingUp, Trash2 } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { cn } from '../lib/utils';

const ICONS = {
    PiggyBank, Travel: Plane, Tech: Laptop, Home, Car, Education: GraduationCap, Health: Heart, Other: Star, Investment: TrendingUp
};

const JarVisualization = ({ goal }) => {
    const { updateSavingsGoal, deleteSavingsGoal } = useFinancial();
    const [amount, setAmount] = useState('');
    const [showMilestone, setShowMilestone] = useState(false);
    const Icon = ICONS[goal.icon] || Star;
    const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
    const isCompleted = progress >= 100;

    // Calculate Daily Savings Needed
    const getDailySavings = () => {
        if (!goal.targetDate || isCompleted) return null;
        const daysLeft = differenceInDays(new Date(goal.targetDate), new Date());
        if (daysLeft <= 0) return null;
        const remaining = goal.targetAmount - goal.currentAmount;
        return Math.ceil(remaining / daysLeft);
    };

    const dailySavings = getDailySavings();
    const timeLeft = goal.targetDate ? formatDistanceToNow(new Date(goal.targetDate), { addSuffix: true }) : '';

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
            "relative overflow-hidden transition-all duration-500 hover:shadow-xl border-2",
            isCompleted ? "border-green-400 bg-green-50/30 dark:bg-green-900/10" :
                "border-border/60 hover:border-primary/50 bg-card"
        )}>
            {/* Celebration Overlay */}
            {isCompleted && (
                <div className="absolute top-0 right-0 p-2 animate-in zoom-in duration-500">
                    <div className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 p-2 rounded-full shadow-sm">
                        <Trophy className="h-5 w-5" />
                    </div>
                </div>
            )}

            <CardContent className="p-0 h-full flex flex-col">
                <div className="flex flex-1 p-5 gap-4">
                    {/* Vertical Liquid Progress */}
                    <div className="relative w-16 bg-secondary/50 rounded-2xl overflow-hidden flex-shrink-0 border border-border/50">
                        <div
                            className={cn(
                                "absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out",
                                isCompleted ? "bg-green-500" : "bg-primary"
                            )}
                            style={{ height: `${progress}%` }}
                        />
                        {/* Glass effect overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

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
                                    <h3 className="font-bold text-lg leading-tight mb-1">{goal.name}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Icon className="h-3 w-3" />
                                        {goal.type === 'investment' ? 'Investment' : 'Savings Goal'}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 -mt-1 -mr-2 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteSavingsGoal(goal.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>

                            <div className="mt-3 space-y-1">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold">₹{goal.currentAmount.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground">/ ₹{goal.targetAmount.toLocaleString()}</span>
                                </div>

                                {isCompleted ? (
                                    <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                                        Goal Reached! 🎉
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {goal.targetDate && (
                                            <p className="text-xs text-muted-foreground">
                                                Target: {timeLeft}
                                            </p>
                                        )}
                                        {dailySavings > 0 && (
                                            <p className="text-xs font-medium text-primary">
                                                Save ₹{dailySavings}/day to stay on track
                                            </p>
                                        )}
                                    </div>
                                )}

                                {goal.type === 'investment' && projectedValue && (
                                    <p className="text-xs text-emerald-600 mt-1 font-medium">
                                        Est. Value: ₹{projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="bg-secondary/30 p-3 flex gap-2 border-t border-border/50">
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
                            className="flex-1 h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
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
