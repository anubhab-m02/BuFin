import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { generateSpendingAlert } from '../lib/gemini';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Activity, Loader2 } from 'lucide-react';

const SpendingMonitor = () => {
    const { transactions, balance, recurringPlans } = useFinancial();
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const fetchAlert = async () => {
            try {
                const result = await generateSpendingAlert(transactions, balance, recurringPlans);
                if (mounted) setAlert(result);
            } catch (error) {
                console.error(error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchAlert();
        return () => mounted = false;
    }, [transactions, balance, recurringPlans]);

    if (loading) {
        return (
            <Card className="border-border bg-card h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Spending Monitor
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing today's flow...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!alert) {
        return (
            <Card className="border-border bg-card h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        Spending Monitor
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No significant activity detected today.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-l-4 border-l-primary bg-card shadow-sm h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                    Live Insight
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm font-medium leading-relaxed">
                    {alert}
                </p>
            </CardContent>
        </Card>
    );
};

export default SpendingMonitor;
