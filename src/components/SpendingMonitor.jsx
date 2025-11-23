import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { generateSpendingAlert } from '../lib/gemini';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Activity, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SpendingMonitor = () => {
    const { transactions, balance, recurringPlans } = useFinancial();
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(true);

    // Create a hash of today's transactions to detect changes (edits/deletes)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTxHash = transactions
        .filter(t => t.date.startsWith(todayStr))
        .map(t => `${t.id}-${t.amount}-${t.type}`)
        .join('|');

    useEffect(() => {
        let mounted = true;
        const fetchAlert = async () => {
            const cacheKey = `bufin_spending_alert_${todayStr}`;
            const cachedData = localStorage.getItem(cacheKey);

            // Check if we have a valid cache
            if (cachedData) {
                const { alert: cachedAlert, txHash } = JSON.parse(cachedData);
                // If transaction hash matches, use cached alert
                if (txHash === todayTxHash) {
                    if (mounted) {
                        setAlert(cachedAlert);
                        setLoading(false);
                    }
                    return;
                }
            }

            // If no cache or data changed, fetch new alert
            try {
                const result = await generateSpendingAlert(transactions, balance, recurringPlans);
                if (mounted) {
                    setAlert(result);
                    // Update cache
                    localStorage.setItem(cacheKey, JSON.stringify({
                        alert: result,
                        txHash: todayTxHash
                    }));
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchAlert();
        return () => mounted = false;
    }, [todayTxHash, balance, recurringPlans.length]); // Depend on hash to trigger updates

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
        <Card className="h-full border-none shadow-lg rounded-2xl hover:shadow-xl transition-shadow bg-card flex flex-col">
            <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
                    Live Insight
                </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-1 flex-1 flex items-center">
                <div className="text-sm font-medium leading-relaxed text-foreground/90 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{alert}</ReactMarkdown>
                </div>
            </CardContent>
        </Card>
    );
};

export default SpendingMonitor;
