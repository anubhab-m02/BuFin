import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { analyzePurchase } from '../lib/gemini';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calculator, Sparkles, Loader2 } from 'lucide-react';

const PurchaseSimulator = () => {
    const financialContext = useFinancial();
    const [input, setInput] = useState('');
    const [advice, setAdvice] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleCheck = async () => {
        if (!input.trim()) return;

        setIsLoading(true);
        setAdvice(null);

        try {
            const transactions = financialContext.transactions;
            const data = await analyzePurchase(input, transactions);
            setAdvice(data);
        } catch (error) {
            console.error("Error analyzing purchase:", error);
            if (error.message.includes('429')) {
                setAdvice("QUOTA EXCEEDED: Please try again later.");
            } else {
                setAdvice("ERROR: Something went wrong. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Purchase Simulator
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="e.g. Can I buy AirPods for ₹12000?"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleCheck}
                        disabled={!input.trim() || isLoading}
                        className="bg-primary hover:bg-primary/90 shrink-0"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Check'
                        )}
                    </Button>
                </div>

                {advice && (
                    <div className="flex-1 rounded-lg p-3 text-sm bg-muted/50 border border-border">
                        <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                            <div className="whitespace-pre-wrap font-medium leading-relaxed">
                                {advice}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PurchaseSimulator;
