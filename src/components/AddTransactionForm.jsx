import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PlusCircle, MinusCircle } from 'lucide-react';

const AddTransactionForm = () => {
    const { addTransaction } = useFinancial();
    const [formData, setFormData] = useState({
        amount: '',
        category: '',
        description: '',
        type: 'expense'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.category) return;

        addTransaction({
            ...formData,
            amount: parseFloat(formData.amount),
            date: new Date().toISOString()
        });

        setFormData({
            amount: '',
            category: '',
            description: '',
            type: 'expense'
        });
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Add Transaction</CardTitle>
            </CardHeader>
            <CardContent>
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
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                            id="description"
                            placeholder="e.g., Lunch at Taco Bell"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <Button type="submit" className="w-full">
                        Add Transaction
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default AddTransactionForm;
