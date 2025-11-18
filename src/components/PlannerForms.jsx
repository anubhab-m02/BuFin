import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Repeat, UserMinus, UserPlus } from 'lucide-react';

export const AddRecurringForm = () => {
    const { addRecurringPlan } = useFinancial();
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        type: 'expense',
        frequency: 'monthly',
        expectedDate: '1'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.amount) return;
        addRecurringPlan({ ...formData, amount: parseFloat(formData.amount) });
        setFormData({ name: '', amount: '', type: 'expense', frequency: 'monthly', expectedDate: '1' });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <Repeat className="h-4 w-4" /> Add Recurring Item
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={formData.type === 'expense' ? 'destructive' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => setFormData({ ...formData, type: 'expense' })}
                        >
                            Expense
                        </Button>
                        <Button
                            type="button"
                            variant={formData.type === 'income' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setFormData({ ...formData, type: 'income' })}
                        >
                            Income
                        </Button>
                    </div>
                    <Input
                        placeholder="Name (e.g. Rent, Salary)"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                        <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Day (1-31)"
                            value={formData.expectedDate}
                            onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                            required
                            className="w-24"
                        />
                    </div>
                    <Button type="submit" className="w-full" size="sm">Add Plan</Button>
                </form>
            </CardContent>
        </Card>
    );
};

export const AddDebtForm = () => {
    const { addDebt } = useFinancial();
    const [formData, setFormData] = useState({
        personName: '',
        amount: '',
        direction: 'payable', // payable (I owe), receivable (They owe)
        dueDate: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.personName || !formData.amount) return;
        addDebt({ ...formData, amount: parseFloat(formData.amount), status: 'active' });
        setFormData({ personName: '', amount: '', direction: 'payable', dueDate: '' });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Add Debt / IOU
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={formData.direction === 'payable' ? 'destructive' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => setFormData({ ...formData, direction: 'payable' })}
                        >
                            I Owe
                        </Button>
                        <Button
                            type="button"
                            variant={formData.direction === 'receivable' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setFormData({ ...formData, direction: 'receivable' })}
                        >
                            Owes Me
                        </Button>
                    </div>
                    <Input
                        placeholder="Person Name"
                        value={formData.personName}
                        onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                        required
                    />
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                        <Input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                    </div>
                    <Button type="submit" className="w-full" size="sm">Add Debt</Button>
                </form>
            </CardContent>
        </Card>
    );
};
