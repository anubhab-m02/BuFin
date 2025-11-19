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
                <form onSubmit={handleSubmit} className="space-y-4">
                    <SegmentedControl
                        options={[
                            { label: 'Expense', value: 'expense' },
                            { label: 'Income', value: 'income' }
                        ]}
                        value={formData.type}
                        onChange={(val) => setFormData({ ...formData, type: val })}
                    />

                    <div className="space-y-2">
                        <Label htmlFor="rec-name">Name</Label>
                        <Input
                            id="rec-name"
                            placeholder="e.g. Rent, Netflix, Salary"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rec-amount">Amount</Label>
                            <Input
                                id="rec-amount"
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rec-freq">Frequency</Label>
                            <select
                                id="rec-freq"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.frequency}
                                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                            >
                                <option value="monthly">Monthly</option>
                                <option value="weekly">Weekly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rec-date">Expected Day / Date</Label>
                        <div className="flex gap-2">
                            <Input
                                id="rec-date"
                                type="text"
                                placeholder="Day (1-31) or 'last'"
                                value={formData.expectedDate}
                                onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                                required
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Enter the day of the month (1-31) or "last" for the last day.
                        </p>
                    </div>

                    <Button type="submit" className="w-full">Add Recurring Plan</Button>
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
