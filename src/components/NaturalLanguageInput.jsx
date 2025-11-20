import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { classifyTransaction } from '../lib/gemini';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Sparkles, Loader2 } from 'lucide-react';

const NaturalLanguageInput = ({ onManualEntry }) => {
    const { addTransaction, addRecurringPlan, addDebt } = useFinancial();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            const results = await classifyTransaction(input);

            // Handle array of actions
            const actions = Array.isArray(results) ? results : [results];

            for (const action of actions) {
                if (action.action === 'transaction') {
                    addTransaction({
                        amount: action.amount,
                        category: action.category,
                        description: action.title || action.merchant || 'Transaction', // Title is the main display
                        merchant: action.merchant,
                        type: action.type || 'expense',
                        date: action.date || new Date().toISOString(),
                        necessity: 'variable', // Default for quick add
                        remarks: action.remarks || ''
                    });
                } else if (action.action === 'recurring') {
                    addRecurringPlan({
                        name: action.name,
                        amount: parseFloat(action.amount) || 0,
                        type: action.type,
                        frequency: action.frequency || 'monthly',
                        expectedDate: String(action.expectedDate || '1'),
                        endDate: action.endDate || null
                    });
                } else if (action.action === 'debt') {
                    addDebt({
                        personName: action.personName,
                        amount: action.amount,
                        direction: action.direction,
                        dueDate: action.dueDate || '',
                        status: 'active'
                    });
                }
            }

            setInput('');
        } catch (err) {
            console.error(err);
            setError('Failed to understand. Please try again or use the manual form.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-border bg-card shadow-sm h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Quick Add
                </CardTitle>
                {onManualEntry && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onManualEntry}
                        className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                    >
                        + Manual Entry
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g., 'Spent ₹150 on lunch' or 'Received ₹5000 bonus'"
                        className="bg-background"
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                </form>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </CardContent>
        </Card>
    );
};

export default NaturalLanguageInput;
