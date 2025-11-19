import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PlusCircle, MinusCircle } from 'lucide-react';
import SegmentedControl from './ui/segmented-control';

const AddTransactionForm = ({ onSuccess, initialData, mode = 'add' }) => {
    const { addTransaction, updateTransaction, categories } = useFinancial();

    const [formData, setFormData] = useState({
        date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        amount: initialData?.amount || '',
        type: initialData?.type || 'expense',
        category: initialData?.category || '',
        description: initialData?.description || '', // Kept from original, not explicitly in instruction's snippet but implied
        merchant: initialData?.merchant || '',
        remarks: initialData?.remarks || '',
        necessity: initialData?.necessity || 'variable'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.category || !formData.description) return;

        const transactionData = {
            ...formData,
            amount: parseFloat(formData.amount),
            date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString()
        };

        if (mode === 'edit' && initialData?.id) {
            updateTransaction(initialData.id, transactionData);
        } else {
            addTransaction(transactionData);
        }

        if (onSuccess) {
            onSuccess();
        } else {
            // Reset form only if not in edit mode (or if we want to add another)
            if (mode === 'add') {
                setFormData({
                    amount: '',
                    category: '',
                    description: '',
                    type: 'expense',
                    date: new Date().toISOString().split('T')[0],
                    remarks: '',
                    necessity: 'variable'
                });
            }
        }
    };

    return (
        <Card className="w-full border-0 shadow-none">
            <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <SegmentedControl
                        options={[
                            { label: 'Expense', value: 'expense', icon: MinusCircle },
                            { label: 'Income', value: 'income', icon: PlusCircle }
                        ]}
                        value={formData.type}
                        onChange={(val) => setFormData({ ...formData, type: val })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date ? formData.date.split('T')[0] : ''}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <select
                            id="category"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            required
                        >
                            <option value="" disabled>Select a category</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="merchant">Merchant</Label>
                        <Input
                            id="merchant"
                            placeholder="e.g., Starbucks, Uber, Landlord"
                            value={formData.merchant}
                            onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Title / Description</Label>
                        <Input
                            id="description"
                            placeholder="e.g., Morning Coffee, Ride to Work"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks (Optional)</Label>
                        <Input
                            id="remarks"
                            placeholder="Add context..."
                            value={formData.remarks || ''}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        />
                    </div>

                    {formData.type === 'expense' && (
                        <div className="space-y-2">
                            <Label>Necessity</Label>
                            <SegmentedControl
                                options={[
                                    { label: 'Variable (Wants/Needs)', value: 'variable' },
                                    { label: 'Fixed (Bills/Rent)', value: 'fixed' }
                                ]}
                                value={formData.necessity}
                                onChange={(val) => setFormData({ ...formData, necessity: val })}
                            />
                        </div>
                    )}

                    <Button type="submit" className="w-full">
                        {mode === 'edit' ? 'Update Transaction' : 'Add Transaction'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default AddTransactionForm;
