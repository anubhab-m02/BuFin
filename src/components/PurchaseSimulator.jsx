import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { analyzePurchase } from '../lib/gemini';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calculator, Sparkles, Loader2 } from 'lucide-react';

const PurchaseSimulator = () => {
    const financialContext = useFinancial();
    const [query, setQuery] = useState('');
    const [advice, setAdvice] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSimulate = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setAdvice(null);

        try {
            // Pass relevant context to AI
            const context = {
                balance: financialContext.balance,
                recentTransactions: financialContext.transactions.slice(0, 5),
                recurringPlans: financialContext.recurringPlans,
                debts: financialContext.debts
            };

            const response = await analyzePurchase(query, context);
            setAdvice(response);
        } catch (error) {
            console.error("AI Simulation failed:", error);
            setAdvice("I couldn't analyze this right now. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Purchase Simulator
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                        <Input
                            placeholder="e.g. Can I buy AirPods for ₹12000?"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setAdvice(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                        />
                    </div>
                    <Button onClick={handleSimulate} disabled={isLoading || !query.trim()}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                    </Button>
                </div>

                {advice && (
                    <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/20 text-sm text-foreground animate-in fade-in slide-in-from-top-1">
                        <div className="flex gap-2 items-start">
                            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <p className="leading-relaxed">{advice}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PurchaseSimulator;
