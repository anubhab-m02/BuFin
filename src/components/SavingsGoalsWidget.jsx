import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, PiggyBank } from 'lucide-react';
import Dialog from './ui/dialog';

const SavingsGoalsWidget = () => {
    const { savingsGoals, addSavingsGoal, updateSavingsGoal } = useFinancial();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '' });

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newGoal.name || !newGoal.targetAmount) return;
        addSavingsGoal({ ...newGoal, targetAmount: parseFloat(newGoal.targetAmount) });
        setNewGoal({ name: '', targetAmount: '' });
        setIsAddOpen(false);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" /> Savings Jars
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {savingsGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Create a jar to start saving!</p>
                ) : (
                    savingsGoals.map(goal => {
                        const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                        return (
                            <div key={goal.id} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{goal.name}</span>
                                    <span className="text-muted-foreground">
                                        ₹{goal.currentAmount} / ₹{goal.targetAmount}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-xs"
                                        onClick={() => updateSavingsGoal(goal.id, 500)} // Mock add 500
                                    >
                                        + ₹500
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>

            <Dialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New Savings Goal">
                <form onSubmit={handleAdd} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Goal Name</label>
                        <Input
                            value={newGoal.name}
                            onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                            placeholder="e.g. Vacation, New Laptop"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Target Amount</label>
                        <Input
                            type="number"
                            value={newGoal.targetAmount}
                            onChange={e => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                            placeholder="0.00"
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full">Create Jar</Button>
                </form>
            </Dialog>
        </Card>
    );
};

export default SavingsGoalsWidget;
