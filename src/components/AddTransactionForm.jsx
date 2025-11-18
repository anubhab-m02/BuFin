import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PlusCircle, MinusCircle } from 'lucide-react';

const AddTransactionForm = ({ initialData, mode = 'add', onSuccess }) => {
    const { addTransaction, updateTransaction } = useFinancial();
    const [formData, setFormData] = useState(initialData || {
        amount: '',
        category: '',
        description: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0], // Default to today for date picker
        remarks: '',
        necessity: 'variable'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.category) return;

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
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant={formData.type === 'expense' ? 'destructive' : 'outline'}
                            className="flex-1"
                            onClick={() => setFormData({ ...formData, type: 'expense' })}
                        >
                            <MinusCircle className="mr-2 h-4 w-4" />
                            Expense
                        </Button>
                        <Button
                            type="button"
                            variant={formData.type === 'income' ? 'default' : 'outline'}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setFormData({ ...formData, type: 'income' })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Income
                        </Button>
                    </div>

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
                        <Input
                            id="category"
                            placeholder="e.g., Food, Rent, Salary"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            placeholder="e.g., Lunch at Taco Bell"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant={formData.necessity === 'variable' ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={() => setFormData({ ...formData, necessity: 'variable' })}
                                    className="flex-1"
                                >
                                    Variable (Wants/Needs)
                                </Button>
                                <Button
                                    type="button"
                                    variant={formData.necessity === 'fixed' ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={() => setFormData({ ...formData, necessity: 'fixed' })}
                                    className="flex-1"
                                >
                                    Fixed (Bills/Rent)
                                </Button>
                            </div>
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
