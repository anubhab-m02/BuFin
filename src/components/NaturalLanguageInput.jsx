import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { classifyTransaction } from '../lib/gemini';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Sparkles, Loader2 } from 'lucide-react';

const NaturalLanguageInput = () => {
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
            const result = await classifyTransaction(input);

            if (result.intent === 'transaction') {
                addTransaction({
                    amount: result.data.amount,
                    category: result.data.category,
                    description: result.data.merchant || input,
                    type: result.data.type || 'expense',
                    date: new Date().toISOString(),
                    necessity: result.data.necessity || 'variable'
                });
            } else if (result.intent === 'recurring') {
                addRecurringPlan({
                    name: result.data.name,
                    amount: result.data.amount,
                    type: result.data.type,
                    frequency: result.data.frequency || 'monthly',
                    expectedDate: result.data.expectedDate || '1'
                });
            } else if (result.intent === 'debt') {
                addDebt({
                    personName: result.data.personName,
                    amount: result.data.amount,
                    direction: result.data.direction,
                    dueDate: result.data.dueDate || '',
                    status: 'active'
                });
            } else {
                // Fallback for legacy or malformed response
                const data = result.data || result;
                addTransaction({
                    amount: data.amount,
                    category: data.category || 'Uncategorized',
                    description: data.merchant || input,
                    type: data.type || 'expense',
                    date: new Date().toISOString()
                });
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
        <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Quick Add
                </CardTitle>
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
