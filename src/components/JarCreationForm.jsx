import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PiggyBank, Plane, Laptop, Home, Car, GraduationCap, Heart, Star, TrendingUp } from 'lucide-react';

const ICONS = [
    { name: 'PiggyBank', icon: PiggyBank },
    { name: 'Travel', icon: Plane },
    { name: 'Tech', icon: Laptop },
    { name: 'Home', icon: Home },
    { name: 'Car', icon: Car },
    { name: 'Education', icon: GraduationCap },
    { name: 'Health', icon: Heart },
    { name: 'Investment', icon: TrendingUp },
    { name: 'Other', icon: Star },
];

const JarCreationForm = ({ onSuccess }) => {
    const { addSavingsGoal } = useFinancial();
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: '',
        targetDate: '',
        icon: 'PiggyBank',
        fundingSource: 'manual',
        type: 'savings',
        projectedReturnRate: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        addSavingsGoal({
            ...formData,
            targetAmount: parseFloat(formData.targetAmount),
            projectedReturnRate: formData.type === 'investment' ? parseFloat(formData.projectedReturnRate) : 0
        });
        if (onSuccess) onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="type">Goal Type</Label>
                <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value, icon: value === 'investment' ? 'Investment' : 'PiggyBank' })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="savings">Savings Goal</SelectItem>
                        <SelectItem value="investment">Investment Goal</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Goal Name</Label>
                <Input
                    id="name"
                    placeholder="e.g. Summer Vacation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Target Amount</Label>
                    <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={formData.targetAmount}
                        onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">Target Date</Label>
                    <Input
                        id="date"
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                        required
                    />
                </div>
            </div>

            {formData.type === 'investment' && (
                <div className="space-y-2 animate-in slide-in-from-top">
                    <Label htmlFor="returnRate">Est. Annual Return (%)</Label>
                    <Input
                        id="returnRate"
                        type="number"
                        placeholder="e.g. 8"
                        value={formData.projectedReturnRate}
                        onChange={(e) => setFormData({ ...formData, projectedReturnRate: e.target.value })}
                        required
                    />
                    <p className="text-xs text-muted-foreground">Used to project potential growth.</p>
                </div>
            )}

            <div className="space-y-2">
                <Label>Choose an Icon</Label>
                <div className="flex flex-wrap gap-2">
                    {ICONS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => setFormData({ ...formData, icon: item.name })}
                                className={`p-2 rounded-lg border transition-all ${formData.icon === item.name
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background hover:bg-secondary'
                                    }`}
                                title={item.name}
                            >
                                <Icon className="h-5 w-5" />
                            </button>
                        );
                    })}
                </div>
            </div>

            <Button type="submit" className="w-full">Create Jar</Button>
        </form>
    );
};

export default JarCreationForm;
