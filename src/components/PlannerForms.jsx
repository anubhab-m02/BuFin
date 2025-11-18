import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Repeat, UserMinus, UserPlus } from 'lucide-react';
import SegmentedControl from './ui/segmented-control';

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
                    <SegmentedControl
                        options={[
                            { label: 'Expense', value: 'expense' },
                            { label: 'Income', value: 'income' }
                        ]}
                        value={formData.type}
                        onChange={(val) => setFormData({ ...formData, type: val })}
                    />
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

export const AddDebtForm = ({ initialData, onSuccess }) => {
    const { addDebt } = useFinancial();
    const [formData, setFormData] = useState({
        personName: initialData?.personName || '',
        amount: initialData?.amount || '',
        direction: initialData?.direction || 'payable', // payable (I owe), receivable (They owe)
        dueDate: initialData?.dueDate || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.personName || !formData.amount) return;
        addDebt({ ...formData, amount: parseFloat(formData.amount), status: 'active' });
        if (onSuccess) {
            onSuccess();
        } else {
            setFormData({ personName: '', amount: '', direction: 'payable', dueDate: '' });
        }
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
                    <SegmentedControl
                        options={[
                            { label: 'I Owe', value: 'payable' },
                            { label: 'Owes Me', value: 'receivable' }
                        ]}
                        value={formData.direction}
                        onChange={(val) => setFormData({ ...formData, direction: val })}
                    />
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
