import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { PiggyBank, Plane, Laptop, Home, Car, GraduationCap, Heart, Star, Plus, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ICONS = {
    PiggyBank, Travel: Plane, Tech: Laptop, Home, Car, Education: GraduationCap, Health: Heart, Other: Star
};

const JarVisualization = ({ goal }) => {
    const { updateSavingsGoal } = useFinancial();
    const Icon = ICONS[goal.icon] || Star;
    const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
    const timeLeft = goal.targetDate ? formatDistanceToNow(new Date(goal.targetDate), { addSuffix: true }) : '';

    const handleDeposit = () => {
        // Mock deposit for now - ideally opens a modal
        updateSavingsGoal(goal.id, 1000);
    };

    const handleWithdraw = () => {
        // Mock withdraw
        updateSavingsGoal(goal.id, -1000);
    };

    return (
        <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">{goal.name}</CardTitle>
                        {goal.targetDate && (
                            <p className="text-xs text-muted-foreground">Target: {timeLeft}</p>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold">₹{goal.currentAmount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">of ₹{goal.targetAmount.toLocaleString()}</p>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                        <span>{progress.toFixed(0)}% Saved</span>
                        <span>₹{(goal.targetAmount - goal.currentAmount).toLocaleString()} to go</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={handleDeposit}>
                        <Plus className="h-3 w-3 mr-1" /> Deposit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={handleWithdraw}>
                        <Minus className="h-3 w-3 mr-1" /> Withdraw
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default JarVisualization;
