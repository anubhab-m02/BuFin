import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { classifyTransaction } from '../lib/gemini';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Sparkles, Loader2 } from 'lucide-react';

const NaturalLanguageInput = () => {
    const { addTransaction } = useFinancial();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            const transactionData = await classifyTransaction(input);

            addTransaction({
                amount: transactionData.amount,
                category: transactionData.category,
                description: transactionData.merchant || input,
                type: transactionData.type || 'expense',
                date: new Date().toISOString()
            });

            setInput('');
        } catch (err) {
            console.error(err);
            setError('Failed to understand. Please try again or use the manual form.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Sparkles className="h-5 w-5" />
                    AI Quick Add
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g., 'Spent ₹150 on lunch' or 'Received ₹5000 bonus'"
                        className="bg-white"
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                </form>
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            </CardContent>
        </Card>
    );
};

export default NaturalLanguageInput;
